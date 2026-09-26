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


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class BigBasketScraper:
    def __init__(self, headless: bool = True):
        self.playwright = sync_playwright().start()

        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ]
        if headless:
            launch_args.append("--headless=new")

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

        # Modern production Chrome 133 User-Agent (compatible with Akamai WAF rules)
        prod_ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        )

        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1366, "height": 768},
            user_agent=prod_ua,
        )

        # Comprehensive stealth evasion scripts (masks headless indicators from Akamai)
        self.context.add_init_script("""
            // 1. Mask webdriver
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

            // 2. Mock Chrome runtime object
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };

            // 3. Mock desktop browser plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
                    {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''},
                    {name: 'Native Client', filename: 'internal-nacl-plugin', description: ''}
                ]
            });

            // 4. Languages
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en', 'hi']});
        """)

        self.page = self.context.new_page()
        self._init_session()

    def _init_session(self, max_retries: int = 8):
        logger.info("Initializing Playwright Chromium session on bigbasket.com...")
        for attempt in range(1, max_retries + 1):
            try:
                self.page.goto("https://www.bigbasket.com/", wait_until="domcontentloaded", timeout=45000)
                time.sleep(3)
                title = (self.page.title() or "").strip()

                if "access denied" in title.lower() or not title:
                    logger.warning(
                        f"[Attempt {attempt}/{max_retries}] BigBasket returned '{title}'. "
                        f"Clearing cache/cookies and waiting 5s before reloading..."
                    )
                    try:
                        self.context.clear_cookies()
                        self.page.evaluate("() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} }")
                    except Exception:
                        pass

                    time.sleep(5)
                    continue

                logger.info(f"BigBasket session initialized: '{title}'. Akamai & CSURF cookies loaded.")
                return

            except Exception as e:
                logger.warning(f"[Attempt {attempt}/{max_retries}] Error loading bigbasket.com: {e}")
                try:
                    self.context.clear_cookies()
                except Exception:
                    pass
                time.sleep(5)

        logger.error(f"Failed to obtain healthy BigBasket session after {max_retries} attempts.")

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

                    // Pause to allow session cookies and dark store IDs to propagate
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // STEP 5: Paginated Product Search
                    let page = 1;
                    const maxPages = 4;
                    const allProducts = [];
                    const seenIds = new Set();
                    const searchSlug = encodeURIComponent(search_brand.trim().toLowerCase().replace(/\\s+/g, '-'));

                    // Try bb-b2c first (full catalog), then fallback to bbnow if needed
                    const entryContexts = [
                        { context: 'bb-b2c', id: '100' },
                        { context: 'bbnow', id: '10' }
                    ];

                    let lastErrorStatus = null;

                    for (const ctx of entryContexts) {
                        page = 1;
                        while (page <= maxPages) {
                            const searchUrl = `https://www.bigbasket.com/listing-svc/v2/products?type=ps&slug=${searchSlug}&page=${page}&bucket_id=81`;
                            let r7 = await fetch(searchUrl, {
                                headers: {
                                    'x-channel': 'BB-WEB',
                                    'x-entry-context': ctx.context,
                                    'x-entry-context-id': ctx.id,
                                    'x-caller': 'UI-KIRK',
                                    'Accept': 'application/json, text/plain, */*'
                                }
                            });

                            // If burst throttled (429) or transient error, retry once after backoff
                            if (r7.status === 429 || r7.status >= 500) {
                                await new Promise(r => setTimeout(r, 12000));
                                r7 = await fetch(searchUrl, {
                                    headers: {
                                        'x-channel': 'BB-WEB',
                                        'x-entry-context': ctx.context,
                                        'x-entry-context-id': ctx.id,
                                        'x-caller': 'UI-KIRK',
                                        'Accept': 'application/json, text/plain, */*'
                                    }
                                });
                            }

                            if (r7.status === 204) break;
                            if (r7.status !== 200) {
                                lastErrorStatus = r7.status;
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

                    if (allProducts.length === 0 && lastErrorStatus && lastErrorStatus !== 200 && lastErrorStatus !== 204) {
                        return { error: `Listing API throttled or failed with status ${lastErrorStatus}` };
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
                err_msg = str(flow_result["error"])
                logger.warning(f"BigBasket flow error: {err_msg}")
                if "403" in err_msg or "denied" in err_msg.lower():
                    logger.info("403 encountered. Refreshing BigBasket session...")
                    self._init_session()
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
