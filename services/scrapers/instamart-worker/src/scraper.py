import logging
import os
import random
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

# Add project root to sys.path and load environment
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

logger = logging.getLogger("instamart-scraper")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class InstamartScraper:
    def __init__(self, headless: bool = True):
        self.base_url = os.getenv("INSTAMART_BASE_URL", "https://instamart.in").rstrip("/")
        self.suggestions_url = os.getenv(
            "INSTAMART_SUGGESTIONS_URL", f"{self.base_url}/api/instamart/maps/suggestions"
        )
        self.address_url = os.getenv(
            "INSTAMART_ADDRESS_URL", f"{self.base_url}/api/instamart/maps/address-widgets/v2"
        )
        self.location_select_url = os.getenv(
            "INSTAMART_LOCATION_SELECT_URL", f"{self.base_url}/api/instamart/home/select-location/v2"
        )
        self.search_url = os.getenv(
            "INSTAMART_SEARCH_URL", f"{self.base_url}/api/instamart/search/v2"
        )
        self.init_max_retries = int(os.getenv("SCRAPER_INIT_MAX_RETRIES", "3"))

        self.playwright = sync_playwright().start()

        launch_args = ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
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
                self.browser = self.playwright.chromium.launch(
                    channel=channel,
                    headless=headless,
                    args=launch_args,
                )
            except Exception:
                self.browser = self.playwright.chromium.launch(
                    headless=headless,
                    args=launch_args,
                )

        self.context = self.browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 720},
        )
        self.page = self.context.new_page()
        self._init_session(max_retries=self.init_max_retries)

    def _init_session(self, max_retries: int = 3):
        """Initializes Instamart session with up to max_retries attempts on homepage only."""
        logger.info(f"Initializing session on {self.base_url}...")
        for attempt in range(1, max_retries + 1):
            try:
                self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(3)
                logger.info("Session established and initial page loaded.")
                return
            except Exception as e:
                logger.warning(f"[Attempt {attempt}/{max_retries}] Error loading {self.base_url}: {e}")
                time.sleep(5)

        logger.error(f"Failed to obtain healthy Instamart session after {max_retries} attempts.")

    def fetch_search_results(self, pincode: str, query: str) -> dict | None:
        """Executes Instamart flow with ZERO retries on failure."""
        try:
            # Step 1: Resolve Place ID from Pincode
            place_res = self.page.evaluate(
                """
                async ({ pin, suggestionsUrl }) => {
                    const url = `${suggestionsUrl}?input=${encodeURIComponent(pin)}`;
                    const res = await fetch(url, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (res.status !== 200) return null;
                    return await res.json();
                }
                """,
                {"pin": pincode, "suggestionsUrl": self.suggestions_url},
            )

            suggestions = place_res.get("data", []) if place_res else []
            if not suggestions:
                logger.warning(f"No suggestions found for pincode: {pincode}")
                return None

            place_id = suggestions[0]["place_id"]
            time.sleep(random.uniform(1.0, 2.0))

            # Step 2: Resolve Coordinates from Place ID
            coord_res = self.page.evaluate(
                """
                async ({ pid, addressUrl }) => {
                    const url = `${addressUrl}?place_id=${encodeURIComponent(pid)}`;
                    const res = await fetch(url, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (res.status !== 200) return null;
                    return await res.json();
                }
                """,
                {"pid": place_id, "addressUrl": self.address_url},
            )

            address_info = coord_res.get("data", {}).get("address", {}) if coord_res else {}
            location = address_info.get("location", {})
            lat = location.get("latitude")
            lng = location.get("longitude")
            subtitle = address_info.get("subtitle", "")

            if not lat or not lng:
                logger.warning(f"Failed to extract coordinates for place ID: {place_id}")
                return None

            time.sleep(random.uniform(1.0, 2.0))

            # Step 3: Fetch Servicing Dark Stores (Pods)
            store_payload = {
                "data": {
                    "lat": lat,
                    "lng": lng,
                    "address": subtitle,
                    "addressId": "",
                    "annotation": subtitle,
                    "clientId": "INSTAMART-APP",
                }
            }

            store_res = self.page.evaluate(
                """
                async ({ payload, locationSelectUrl }) => {
                    const res = await fetch(locationSelectUrl, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.status !== 200) return null;
                    return await res.json();
                }
                """,
                {"payload": store_payload, "locationSelectUrl": self.location_select_url},
            )

            pod_list = (
                store_res.get("data", {})
                .get("configs", {})
                .get("IM_PAGE_CONFIGS", {})
                .get("configInfo", [{}])[0]
                .get("card", {})
                .get("podDetailsList", [])
                if store_res else []
            )

            if not pod_list:
                logger.warning(f"No dark store servicing pincode: {pincode}")
                return None

            p_store = pod_list[0].get("podId")
            s_store = pod_list[1].get("podId") if len(pod_list) > 1 else p_store
            time.sleep(random.uniform(1.0, 2.0))

            # Step 4: Search Products
            search_payload = {
                "facets": [],
                "sortAttribute": "",
                "query": query,
                "search_results_offset": "0",
                "is_pre_search_tag": False,
                "page_type": "INSTAMART_SEARCH_PAGE",
            }

            search_res = self.page.evaluate(
                """
                async ({ p_store, s_store, payload, searchUrl }) => {
                    const url = `${searchUrl}?offset=0&storeId=${p_store}&primaryStoreId=${p_store}&secondaryStoreId=${s_store}&ageConsent=false&layoutId=4987&voiceSearchTrackingId=`;
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.status !== 200) return null;
                    return await res.json();
                }
                """,
                {"p_store": p_store, "s_store": s_store, "payload": search_payload, "searchUrl": self.search_url},
            )

            return search_res

        except Exception as e:
            logger.error(f"Error fetching Instamart data for pincode {pincode}: {e}", exc_info=True)
            return None

    def close(self):
        try:
            self.browser.close()
            self.playwright.stop()
        except Exception:
            pass