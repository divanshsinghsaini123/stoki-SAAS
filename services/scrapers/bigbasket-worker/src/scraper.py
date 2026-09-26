import logging
import os
import random
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Any
from playwright.sync_api import sync_playwright

# Add project root to sys.path and load environment
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

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
        self.base_url = os.getenv("BIGBASKET_BASE_URL", "https://www.bigbasket.com").rstrip("/")
        self.autocomplete_url = os.getenv(
            "BIGBASKET_AUTOCOMPLETE_URL",
            f"{self.base_url}/places/v1/places/autocomplete/",
        )
        self.place_details_url = os.getenv(
            "BIGBASKET_PLACE_DETAILS_URL",
            f"{self.base_url}/places/v1/places/details/",
        )
        self.serviceability_url = os.getenv(
            "BIGBASKET_SERVICEABILITY_URL",
            f"{self.base_url}/ui-svc/v1/serviceable/",
        )
        self.member_address_url = os.getenv(
            "BIGBASKET_MEMBER_ADDRESS_URL",
            f"{self.base_url}/member-svc/v2/member/current-delivery-address/",
        )
        self.search_url = os.getenv("BIGBASKET_SEARCH_URL", f"{self.base_url}/ps/")
        self.listing_intercept_key = os.getenv(
            "BIGBASKET_LISTING_INTERCEPT_KEY",
            "listing-svc/v2/products",
        )
        self.init_max_retries = int(os.getenv("SCRAPER_INIT_MAX_RETRIES", "3"))

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

        # Determine natural user-agent from the launched browser, stripping any 'Headless' indicator
        temp_context = self.browser.new_context()
        raw_ua = temp_context.new_page().evaluate("navigator.userAgent")
        temp_context.close()

        clean_ua = re.sub(r"HeadlessChrome/([0-9\.]+)", r"Chrome/\1", raw_ua)
        logger.info(f"Using dynamic synchronized User-Agent: {clean_ua}")

        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1366, "height": 768},
            user_agent=clean_ua,
        )

        # Stealth evasion scripts (masks headless indicators from Akamai)
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
        self._init_session(max_retries=self.init_max_retries)

    def _init_session(self, max_retries: int = 3):
        """Initializes BigBasket session with up to max_retries attempts on homepage only."""
        logger.info(f"Initializing Playwright Chromium session on {self.base_url}...")
        for attempt in range(1, max_retries + 1):
            try:
                self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=45000)
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

                # Simulate human interaction to validate Akamai cookies
                try:
                    self.page.mouse.move(random.randint(100, 500), random.randint(100, 500))
                    time.sleep(1)
                    self.page.evaluate("window.scrollBy(0, document.body.scrollHeight / 4)")
                    time.sleep(2)
                    self.page.mouse.move(random.randint(500, 800), random.randint(300, 700))
                except Exception:
                    pass

                logger.info(f"BigBasket session initialized: '{title}'. Akamai & CSURF cookies loaded.")
                return

            except Exception as e:
                logger.warning(f"[Attempt {attempt}/{max_retries}] Error loading {self.base_url}: {e}")
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
        Executes BigBasket flow with ZERO retries inside the request:
        Steps 1-4 (autocomplete → geocode → serviceability → address bind) run via page.evaluate().
        Step 5 navigates to the search page and intercepts listing XHR or extracts __NEXT_DATA__.
        """
        try:
            search_brand = target_brand or query
            token = str(uuid.uuid4())

            # ── Steps 1-4: geocode + address binding via evaluate() ─────────────
            setup_result = self.page.evaluate(
                """
                async ({ pincode, token, autocompleteUrl, placeDetailsUrl, serviceabilityUrl, memberAddressUrl }) => {
                    const getCookie = (name) => {
                        const value = '; ' + document.cookie;
                        const parts = value.split('; ' + name + '=');
                        if (parts.length === 2) return parts.pop().split(';').shift();
                        return null;
                    };

                    // STEP 1: Autocomplete
                    const s1Url = `${autocompleteUrl}?inputText=${encodeURIComponent(pincode)}&token=${token}`;
                    const r1 = await fetch(s1Url, {
                        headers: { 'x-channel': 'BB-WEB', 'x-entry-context': 'bbnow', 'x-entry-context-id': '10' }
                    });
                    if (r1.status !== 200) return { error: `Autocomplete failed with status ${r1.status}` };
                    const d1 = await r1.json();
                    const predictions = d1.predictions || [];
                    if (predictions.length === 0) return { error: `No address suggestions for pincode ${pincode}` };
                    const placeId = predictions[0].placeId;
                    const description = predictions[0].description || '';

                    // STEP 2: Coordinates
                    const s2Url = `${placeDetailsUrl}?placeId=${placeId}&token=${token}&xArm=898&yArm=230`;
                    const r2 = await fetch(s2Url, {
                        headers: { 'x-channel': 'BB-WEB', 'x-entry-context': 'bbnow', 'x-entry-context-id': '10' }
                    });
                    if (r2.status !== 200) return { error: `Place details failed with status ${r2.status}` };
                    const d2 = await r2.json();
                    const loc = d2.geometry ? d2.geometry.location : null;
                    if (!loc) return { error: `No coordinates found for place ${placeId}` };

                    // STEP 3: Serviceability
                    const s3Url = `${serviceabilityUrl}?lat=${loc.lat}&lng=${loc.lng}&send_all_serviceability=true`;
                    const r3 = await fetch(s3Url, {
                        headers: { 'x-channel': 'BB-WEB', 'x-entry-context': 'bbnow', 'x-entry-context-id': '10' }
                    });
                    if (r3.status !== 200) return { error: `Serviceability check failed with status ${r3.status}` };
                    const d3 = await r3.json();
                    const ecs = d3.serviceable_ecs_info || {};
                    if (Object.keys(ecs).length === 0) return { unserviceable: true, pincode };

                    const doorPriority = [
                        { context: 'bbnow', id: '10' },
                        { context: 'bb-b2c', id: '100' }
                    ];
                    const primaryDoor = doorPriority.find(d => ecs.hasOwnProperty(d.context)) || doorPriority[1];

                    const csrf = getCookie('csurftoken') || '';
                    if (!csrf) return { error: 'No csurftoken cookie found in session' };

                    // STEP 4: Bind address to detected door
                    const r4 = await fetch(memberAddressUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-channel': 'BB-WEB',
                            'x-entry-context': primaryDoor.context,
                            'x-entry-context-id': primaryDoor.id,
                            'x-caller': 'UI-KIRK',
                            'x-requested-with': 'XMLHttpRequest',
                            'x-csurftoken': csrf
                        },
                        body: JSON.stringify({
                            lat: loc.lat,
                            long: loc.lng,
                            return_hub_cookies: true,
                            area: null,
                            contact_zipcode: String(pincode)
                        })
                    });
                    if (r4.status !== 200) {
                        return { error: `Address binding failed with status ${r4.status}: ${(await r4.text()).substring(0, 100)}` };
                    }

                    // Allow hub cookies to propagate before navigation
                    await new Promise(r => setTimeout(r, 1000));

                    return {
                        success: true,
                        lat: loc.lat,
                        lng: loc.lng,
                        description,
                        primary_door: primaryDoor
                    };
                }
                """,
                {
                    "pincode": str(pincode),
                    "token": token,
                    "autocompleteUrl": self.autocomplete_url.rstrip("?"),
                    "placeDetailsUrl": self.place_details_url.rstrip("?"),
                    "serviceabilityUrl": self.serviceability_url.rstrip("?"),
                    "memberAddressUrl": self.member_address_url,
                },
            )

            if not setup_result:
                logger.warning(f"Setup returned empty result for pincode {pincode}")
                return None

            if setup_result.get("unserviceable"):
                logger.warning(f"Pincode {pincode} is not serviceable by BigBasket")
                return {"status": "UNSERVICEABLE", "pincode": pincode}

            if setup_result.get("error"):
                err_msg = str(setup_result["error"])
                logger.warning(f"BigBasket setup error: {err_msg}")
                return None

            lat = setup_result["lat"]
            lng = setup_result["lng"]
            description = setup_result.get("description", "")

            # ── Step 5: Navigate search page + intercept listing XHR ──────────
            search_slug = re.sub(r"\s+", "+", search_brand.strip())
            search_target = f"{self.search_url.rstrip('/')}/?q={search_slug}"

            collected_products: list[dict] = []
            seen_ids: set[str] = set()
            listing_status_code: int | None = None
            listing_triggered = False

            def on_response(response):
                nonlocal listing_status_code, listing_triggered
                if self.listing_intercept_key not in response.url:
                    return
                listing_triggered = True
                listing_status_code = response.status
                if response.status != 200:
                    return
                try:
                    body = response.json()
                    prods = []
                    if body.get("tabs") and body["tabs"][0].get("product_info"):
                        prods = body["tabs"][0]["product_info"].get("products", [])
                    elif isinstance(body.get("products"), list):
                        prods = body["products"]
                    for p in prods:
                        pid = str(p.get("id") or "")
                        if pid and pid not in seen_ids:
                            seen_ids.add(pid)
                            collected_products.append(p)
                except Exception as ex:
                    logger.debug(f"Error parsing listing response: {ex}")

            self.page.on("response", on_response)
            try:
                logger.debug(f"Navigating to search page: {search_target}")
                self.page.goto(search_target, wait_until="domcontentloaded", timeout=45000)
                # Wait up to 8s for listing-svc XHR to fire after page load
                deadline = time.time() + 8
                while not listing_triggered and time.time() < deadline:
                    time.sleep(0.4)
                time.sleep(1)
            except Exception as nav_err:
                logger.warning(f"Navigation error for pincode {pincode}: {nav_err}")
            finally:
                self.page.remove_listener("response", on_response)

            page_title = ""
            try:
                page_title = self.page.title() or ""
            except Exception:
                pass

            # Fallback: BigBasket Next.js SSR — products are embedded in window.__NEXT_DATA__
            if not listing_triggered or (listing_triggered and listing_status_code != 200 and not collected_products):
                logger.debug(f"XHR not captured (title='{page_title}'). Trying __NEXT_DATA__ SSR fallback...")
                try:
                    next_data = self.page.evaluate("""
                    () => {
                        try {
                            const el = document.getElementById('__NEXT_DATA__');
                            if (!el) return null;
                            const data = JSON.parse(el.textContent);
                            const props = data?.props?.pageProps;
                            if (!props) return null;
                            const tabs = props?.tabs || props?.listingData?.tabs || [];
                            if (tabs.length > 0 && tabs[0]?.product_info?.products) {
                                return tabs[0].product_info.products;
                            }
                            const prods = props?.products || props?.listingData?.products || [];
                            return prods.length > 0 ? prods : null;
                        } catch(e) { return null; }
                    }
                    """)
                    if next_data and isinstance(next_data, list) and len(next_data) > 0:
                        logger.debug(f"SSR fallback found {len(next_data)} products in __NEXT_DATA__")
                        for p in next_data:
                            pid = str(p.get("id") or "")
                            if pid and pid not in seen_ids:
                                seen_ids.add(pid)
                                collected_products.append(p)
                        listing_triggered = True
                        listing_status_code = 200
                except Exception as nd_err:
                    logger.debug(f"__NEXT_DATA__ fallback failed: {nd_err}")

            # Navigate back to base URL to restore session state for next ticket
            try:
                self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=20000)
                time.sleep(1)
            except Exception:
                pass

            if listing_triggered and listing_status_code == 403:
                logger.warning(f"Listing API returned 403 for pincode {pincode}. No retries performed.")
                return None

            if not listing_triggered:
                logger.warning(
                    f"Listing XHR never fired and __NEXT_DATA__ empty for pincode {pincode} "
                    f"(page title: '{page_title}'). Likely blocked or unserviceable area."
                )
                return None

            dark_store_id = str(pincode)
            try:
                cookies = {c["name"]: c["value"] for c in self.context.cookies()}
                dark_store_id = (
                    cookies.get("_bb_sa_ids")
                    or cookies.get("_bb_nhid")
                    or cookies.get("_bb_dsid")
                    or str(pincode)
                )
            except Exception:
                pass

            return {
                "status": "SUCCESS",
                "pincode": pincode,
                "dark_store_id": dark_store_id,
                "coordinates": {"lat": lat, "lng": lng},
                "formatted_address": description,
                "total_unique_skus": len(collected_products),
                "products": collected_products,
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
