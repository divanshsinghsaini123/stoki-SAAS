import logging
import os
import re
import time
import uuid
from typing import Any
from playwright.sync_api import sync_playwright

logger = logging.getLogger("bigbasket-scraper")

def clean_alphanumeric(value: str | None) -> str:
    """Strips spaces and non-alphanumeric characters for robust comparison."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


class BigBasketScraper:
    def __init__(self, headless: bool = False):
        self.playwright = sync_playwright().start()

        launch_args = ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        custom_exec = os.getenv("CHROME_PATH") or os.getenv("BROWSER_PATH")
        channel = os.getenv("PLAYWRIGHT_CHANNEL", "chrome")

        if custom_exec and os.path.exists(custom_exec):
            self.browser = self.playwright.chromium.launch(
                executable_path=custom_exec,
                headless=headless,
                args=launch_args,
            )
        else:
            try:
                # Use standard Chrome channel if available on the system
                self.browser = self.playwright.chromium.launch(
                    channel=channel,
                    headless=headless,
                    args=launch_args,
                )
            except Exception:
                # Fall back to standard Playwright Chromium (e.g. Docker / Linux servers)
                self.browser = self.playwright.chromium.launch(
                    headless=headless,
                    args=launch_args,
                )
        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1366, "height": 768},
        )
        self.page = self.context.new_page()
        self._init_session()

    def _init_session(self):
        logger.info("Initializing Playwright Chromium session on bigbasket.com...")
        self.page.goto("https://www.bigbasket.com/", wait_until="domcontentloaded", timeout=45000)
        time.sleep(4)
        logger.info(f"BigBasket session initialized: '{self.page.title()}'. Akamai & CSURF cookies loaded.")

    def fetch_search_results(
        self, pincode: str, query: str, target_brand: str | None = None
    ) -> dict | None:
        """
        Executes verified BigBasket flow inside the browser context:
        1. places/autocomplete: resolves target pincode to place ID
        2. places/details: extracts GPS coordinates (lat, lng)
        3. ui-svc/serviceable: validates delivery feasibility
        4. member-svc/current-delivery-address: binds dark store / address with valid x-csurftoken
        5. listing-svc/products: fetches paginated product cards
        """
        try:
            search_brand = target_brand or query
            token = str(uuid.uuid4())

            flow_result = self.page.evaluate(
                """
                async ({ pincode, search_brand, token }) => {
                    const getCookie = (name) => {
                        const value = '; ' + document.cookie;
                        const parts = value.split('; ' + name + '=');
                        if (parts.length === 2) return parts.pop().split(';').shift();
                        return null;
                    };

                    // STEP 1: Autocomplete Pincode
                    const r1 = await fetch(`https://www.bigbasket.com/places/v1/places/autocomplete/?inputText=${encodeURIComponent(pincode)}&token=${token}`, {
                        headers: {
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10'
                        }
                    });
                    if (r1.status !== 200) return { error: `Autocomplete failed with status ${r1.status}` };
                    const d1 = await r1.json();
                    const predictions = d1.predictions || [];
                    if (predictions.length === 0) return { error: `No address suggestions for pincode ${pincode}` };
                    const placeId = predictions[0].placeId;
                    const description = predictions[0].description || "";

                    // STEP 2: Coordinate Resolution
                    const r2 = await fetch(`https://www.bigbasket.com/places/v1/places/details/?placeId=${placeId}&token=${token}&xArm=898&yArm=230`, {
                        headers: {
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10'
                        }
                    });
                    if (r2.status !== 200) return { error: `Place details failed with status ${r2.status}` };
                    const d2 = await r2.json();
                    const loc = d2.geometry ? d2.geometry.location : null;
                    if (!loc) return { error: `No coordinates found for place ${placeId}` };
                    const lat = loc.lat;
                    const lng = loc.lng;

                    // STEP 3: Multi-Door Serviceability Check
                    const r3 = await fetch(`https://www.bigbasket.com/ui-svc/v1/serviceable/?lat=${lat}&lng=${lng}&send_all_serviceability=true`, {
                        headers: {
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10'
                        }
                    });
                    if (r3.status !== 200) return { error: `Serviceability check failed with status ${r3.status}` };
                    const d3 = await r3.json();
                    const ecs = d3.serviceable_ecs_info || {};
                    if (Object.keys(ecs).length === 0) return { unserviceable: true, pincode };

                    const csrf = getCookie('csurftoken') || '';
                    if (!csrf) return { error: "No csurftoken cookie found in session" };

                    const r4 = await fetch('https://www.bigbasket.com/member-svc/v2/member/current-delivery-address/', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10',
                            'x-caller': 'UI-KIRK',
                            'x-requested-with': 'XMLHttpRequest',
                            'x-csurftoken': csrf
                        },
                        body: JSON.stringify({
                            lat: lat,
                            long: lng,
                            return_hub_cookies: false,
                            area: null,
                            contact_zipcode: String(pincode)
                        })
                    });
                    if (r4.status !== 200) {
                        return { error: `Address binding r4 failed with status ${r4.status}: ${(await r4.text()).substring(0, 100)}` };
                    }

                    // Small pause to allow session cookies to update
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // STEP 5: Paginated Product Search
                    let page = 1;
                    const maxPages = 4;
                    const allProducts = [];
                    const seenIds = new Set();
                    const searchSlug = encodeURIComponent(search_brand.toLowerCase());

                    // Try bb-b2c first (full catalog), then fallback to bbnow if needed
                    const entryContexts = [
                        { context: 'bb-b2c', id: '100' },
                        { context: 'bbnow', id: '10' }
                    ];

                    for (const ctx of entryContexts) {
                        page = 1;
                        while (page <= maxPages) {
                            const searchUrl = `https://www.bigbasket.com/listing-svc/v2/products?type=ps&slug=${searchSlug}&page=${page}&bucket_id=81`;
                            const r7 = await fetch(searchUrl, {
                                headers: {
                                    'x-channel': 'BB-WEB',
                                    'x-entry-context': ctx.context,
                                    'x-entry-context-id': ctx.id,
                                    'x-caller': 'UI-KIRK',
                                    'Accept': 'application/json, text/plain, */*'
                                }
                            });

                            if (r7.status === 204) break;
                            if (r7.status !== 200) {
                                // If status is not 200/204 on first context, try next context
                                break;
                            }

                            const d7 = await r7.json();
                            let prods = [];
                            if (d7.tabs && d7.tabs.length > 0 && d7.tabs[0].product_info) {
                                prods = d7.tabs[0].product_info.products || [];
                            } else if (d7.products && Array.isArray(d7.products)) {
                                prods = d7.products;
                            }

                            if (prods.length === 0) break;

                            let foundNew = false;
                            for (const p of prods) {
                                const pid = String(p.id || "");
                                if (pid && !seenIds.has(pid)) {
                                    seenIds.add(pid);
                                    allProducts.push(p);
                                    foundNew = true;
                                }
                            }

                            if (!foundNew) break;
                            page += 1;
                            await new Promise(r => setTimeout(r, 800));
                        }

                        // If products found in primary catalog, no need for second door
                        if (allProducts.length > 0) break;
                    }

                    const darkStoreId = getCookie('_bb_sa_ids') || getCookie('_bb_nhid') || getCookie('_bb_dsid') || String(pincode);

                    return {
                        success: true,
                        pincode: pincode,
                        dark_store_id: darkStoreId,
                        coordinates: { lat, lng },
                        formatted_address: description,
                        products: allProducts
                    };
                }
            """,
                {"pincode": str(pincode), "search_brand": search_brand, "token": token},
            )

            if not flow_result:
                logger.warning(f"Flow returned empty result for pincode {pincode}")
                return None

            if flow_result.get("unserviceable"):
                logger.warning(f"Pincode {pincode} is not serviceable by BigBasket")
                return {"status": "UNSERVICEABLE", "pincode": pincode}

            if flow_result.get("error"):
                logger.warning(f"BigBasket flow error: {flow_result['error']}")
                return None

            return {
                "status": "SUCCESS",
                "pincode": pincode,
                "dark_store_id": str(flow_result.get("dark_store_id") or pincode),
                "coordinates": flow_result.get("coordinates", {}),
                "formatted_address": flow_result.get("formatted_address", ""),
                "total_unique_skus": len(flow_result.get("products", [])),
                "products": flow_result.get("products", []),
            }

        except Exception as e:
            logger.error(f"Error scraping BigBasket for pincode {pincode}: {e}", exc_info=True)
            return None

    def close(self):
        try:
            self.browser.close()
            self.playwright.stop()
        except Exception:
            pass
