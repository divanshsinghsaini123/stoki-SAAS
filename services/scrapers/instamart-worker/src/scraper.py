import logging
import random
import time
from playwright.sync_api import sync_playwright

logger = logging.getLogger("instamart-scraper")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class InstamartScraper:
    def __init__(self, headless: bool = True):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=headless)
        self.context = self.browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 720},
        )
        self.page = self.context.new_page()
        self._init_session()

    def _init_session(self):
        logger.info("Initializing session on instamart.in...")
        self.page.goto("https://instamart.in/", wait_until="networkidle")
        time.sleep(5)
        logger.info("Session established and WAF challenges cleared.")

    def fetch_search_results(self, pincode: str, query: str) -> dict | None:
        try:
            # Step 1: Resolve Place ID from Pincode
            place_res = self.page.evaluate("""
                async (pin) => {
                    const res = await fetch(`https://instamart.in/api/instamart/maps/suggestions?input=${pin}`, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    return await res.json();
                }
            """, pincode)

            suggestions = place_res.get("data", [])
            if not suggestions:
                logger.warning(f"No suggestions found for pincode: {pincode}")
                return None

            place_id = suggestions[0]["place_id"]
            time.sleep(random.uniform(1.5, 3.0))

            # Step 2: Resolve Coordinates from Place ID
            coord_res = self.page.evaluate("""
                async (pid) => {
                    const res = await fetch(`https://instamart.in/api/instamart/maps/address-widgets/v2?place_id=${pid}`, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    return await res.json();
                }
            """, place_id)

            address_info = coord_res.get("data", {}).get("address", {})
            location = address_info.get("location", {})
            lat = location.get("latitude")
            lng = location.get("longitude")
            subtitle = address_info.get("subtitle", "")

            if not lat or not lng:
                logger.warning(f"Failed to extract coordinates for place ID: {place_id}")
                return None

            time.sleep(random.uniform(1.5, 3.0))

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

            store_res = self.page.evaluate("""
                async (payload) => {
                    const res = await fetch("https://instamart.in/api/instamart/home/select-location/v2", {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    return await res.json();
                }
            """, store_payload)

            pod_list = (
                store_res.get("data", {})
                .get("configs", {})
                .get("IM_PAGE_CONFIGS", {})
                .get("configInfo", [{}])[0]
                .get("card", {})
                .get("podDetailsList", [])
            )

            if not pod_list:
                logger.warning(f"No dark store servicing pincode: {pincode}")
                return None

            p_store = pod_list[0].get("podId")
            s_store = pod_list[1].get("podId") if len(pod_list) > 1 else p_store
            time.sleep(random.uniform(1.5, 3.0))

            # Step 4: Search Products
            search_payload = {
                "facets": [],
                "sortAttribute": "",
                "query": query,
                "search_results_offset": "0",
                "is_pre_search_tag": False,
                "page_type": "INSTAMART_SEARCH_PAGE",
            }

            search_res = self.page.evaluate("""
                async ({ p_store, s_store, payload }) => {
                    const url = `https://instamart.in/api/instamart/search/v2?offset=0&storeId=${p_store}&primaryStoreId=${p_store}&secondaryStoreId=${s_store}&ageConsent=false&layoutId=4987&voiceSearchTrackingId=`;
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    return await res.json();
                }
            """, {"p_store": p_store, "s_store": s_store, "payload": search_payload})

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