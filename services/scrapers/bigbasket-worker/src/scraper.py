import logging
import random
import re
import time
import uuid
from typing import Any
from playwright.sync_api import sync_playwright

logger = logging.getLogger("bigbasket-scraper")

BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def clean_alphanumeric(value: str | None) -> str:
    """Strips spaces and non-alphanumeric characters for robust comparison."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


class BigBasketScraper:
    def __init__(self, headless: bool = False):
        self.playwright = sync_playwright().start()

        # Choose installed browser binary that clears Akamai Bot Manager
        import os
        executable_path = None
        if os.path.exists(BRAVE_PATH):
            executable_path = BRAVE_PATH
        elif os.path.exists(CHROME_PATH):
            executable_path = CHROME_PATH

        launch_kwargs: dict[str, Any] = {
            "headless": headless,
            "args": ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        }
        if executable_path:
            launch_kwargs["executable_path"] = executable_path

        self.browser = self.playwright.chromium.launch(**launch_kwargs)
        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
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
        Executes sequential BigBasket flow inside the authenticated browser:
        1. places/autocomplete: resolves pincode to place ID
        2. places/details: resolves coordinates (lat, lng)
        3. ui-svc/serviceable: validates delivery feasibility
        4. member-svc/current-delivery-address: binds address & updates _bb_sa_ids
        5. ui-svc/app-data: retrieves catalog bucket ID
        6. listing-svc/term-completion: retrieves brand & category slugs
        7. listing-svc/products: fetches paginated products
        """
        try:
            search_brand = target_brand or query
            token = str(uuid.uuid4())

            # Evaluate full sequential workflow natively within the browser context
            flow_result = self.page.evaluate(
                """
                async ({ pincode, search_brand, token }) => {
                    const getCookie = (name) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop().split(';').shift();
                        return null;
                    };

                    // STEP 1: Autocomplete
                    const r1 = await fetch(`https://www.bigbasket.com/places/v1/places/autocomplete/?inputText=${pincode}&token=${token}`, {
                        headers: {
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10'
                        }
                    });
                    if (r1.status !== 200) return { error: `Autocomplete failed with status ${r1.status}` };
                    const d1 = await r1.json();
                    const predictions = d1.predictions || [];
                    if (predictions.length === 0) return { error: `No predictions for pincode ${pincode}` };
                    const placeId = predictions[0].placeId;
                    const description = predictions[0].description || "";

                    // STEP 2: Details
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
                    if (!loc) return { error: `No coordinates for place ${placeId}` };
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
                    if (r3.status !== 200) return { error: `Serviceable check failed with status ${r3.status}` };
                    const d3 = await r3.json();
                    const ecs = d3.serviceable_ecs_info || {};
                    if (Object.keys(ecs).length === 0) return { unserviceable: true, pincode };

                    // STEP 4: Bind Delivery Address in Session
                    const csrf = getCookie('csurftoken') || '';
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

                    // Wait small tick for session cookies to sync
                    await new Promise(res => setTimeout(res, 600));

                    // STEP 5: App Configuration Bucket ID
                    const r5 = await fetch(`https://www.bigbasket.com/ui-svc/v1/app-data/?i=${Date.now()}`, {
                        headers: {
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10',
                            'x-caller': 'UI-KIRK'
                        }
                    });
                    let bucketId = 81;
                    if (r5.status === 200) {
                        const d5 = await r5.json();
                        bucketId = d5.bucket_id || 81;
                    }

                    // STEP 6: Term Completion (Slugs Resolution)
                    const r6 = await fetch(`https://www.bigbasket.com/listing-svc/v1/product/term-completion?term=${encodeURIComponent(search_brand)}`, {
                        headers: {
                            'x-channel': 'BB-WEB',
                            'x-entry-context': 'bbnow',
                            'x-entry-context-id': '10'
                        }
                    });
                    let brandSlug = search_brand.replace(/ /g, '-').toLowerCase();
                    let categorySlug = '';
                    if (r6.status === 200) {
                        const d6 = await r6.json();
                        const bList = (d6.brands && d6.brands.values) || [];
                        const cList = (d6.categories && d6.categories.values) || [];
                        if (bList.length > 0) brandSlug = bList[0].slug;
                        if (cList.length > 0) categorySlug = cList[0].slug;
                    }

                    // STEP 7: Product Listing Search (type=ps)
                    let page = 1;
                    const maxPages = 4;
                    const allProducts = [];
                    const seenIds = new Set();

                    while (page <= maxPages) {
                        const r7 = await fetch(`https://www.bigbasket.com/listing-svc/v2/products?type=ps&slug=${encodeURIComponent(brandSlug)}&page=${page}&bucket_id=${bucketId}`, {
                            headers: {
                                'x-channel': 'BB-WEB',
                                'x-entry-context': 'bbnow',
                                'x-entry-context-id': '10',
                                'x-caller': 'UI-KIRK',
                                'osmos-enabled': 'true',
                                'Accept': 'application/json, text/plain, */*'
                            }
                        });

                        if (r7.status !== 200) break;
                        const d7 = await r7.json();

                        let prods = d7.products || [];
                        if (prods.length === 0 && d7.tabs && d7.tabs.length > 0) {
                            prods = (d7.tabs[0].product_info && d7.tabs[0].product_info.products) || [];
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
