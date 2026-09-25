import logging
import os
import re
import time
import uuid
from typing import Any
from playwright.sync_api import sync_playwright

logger = logging.getLogger("zepto-scraper")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def clean_alphanumeric(value: str | None) -> str:
    """Strips spaces and non-alphanumeric characters for robust matching."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


class ZeptoScraper:
    def __init__(self, headless: bool = True):
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
                # Use standard Chrome channel if available on system
                self.browser = self.playwright.chromium.launch(
                    channel=channel,
                    headless=headless,
                    args=launch_args,
                )
            except Exception:
                # Fallback to bundled Playwright Chromium (Docker / Linux servers)
                self.browser = self.playwright.chromium.launch(
                    headless=headless,
                    args=launch_args,
                )

        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1280, "height": 720},
            user_agent=USER_AGENT,
        )
        self.page = self.context.new_page()
        self._current_pincode = None
        self._current_store_id = None
        self._init_session()

    def _init_session(self):
        logger.info("Initializing Playwright Chromium session on zepto.com...")
        self.page.goto("https://www.zepto.com/", wait_until="domcontentloaded", timeout=45000)
        self.page.wait_for_timeout(3000)
        logger.info(f"Zepto session initialized: '{self.page.title()}'.")

    def _get_session_tokens(self) -> tuple[str, str]:
        """Extracts active device_id and session_id from browser context cookies."""
        cookies = {c["name"]: c["value"] for c in self.context.cookies()}
        device_id = cookies.get("device_id") or str(uuid.uuid4())
        session_id = cookies.get("session_id") or str(uuid.uuid4())
        return device_id, session_id

    def resolve_location(self, pincode: str) -> str | None:
        """
        Executes Steps 1 to 3 from Zepto API specification:
        Step 1: Autocomplete -> place_id
        Step 2: Place details -> lat, lng
        Step 3: Serviceability & Store Mapping -> store_id
        """
        if self._current_pincode == pincode and self._current_store_id:
            return self._current_store_id

        logger.info(f"Resolving Zepto store for pincode {pincode} via direct API...")
        device_id, session_id = self._get_session_tokens()

        base_headers = {
            "accept": "*/*",
            "app_version": "16.31.2",
            "appsubplatform": "WEB",
            "tenant": "ZEPTO",
            "device_id": device_id,
            "session_id": session_id,
        }

        try:
            # STEP 1: Autocomplete (Pincode -> Place ID)
            step1_url = f"https://bff-gateway.zepto.com/api/v1/maps/place/autocomplete/?place_name={pincode}"
            r1 = self.context.request.get(step1_url, headers=base_headers, timeout=15000)
            if r1.status != 200:
                logger.warning(f"Step 1 Autocomplete returned status {r1.status}")
                return None

            d1 = r1.json()
            predictions = d1.get("predictions", [])
            if not predictions:
                logger.warning(f"No place predictions found for pincode {pincode}")
                return None
            place_id = predictions[0].get("place_id")
            if not place_id:
                return None

            # STEP 2: Place Details (Place ID -> Coordinates)
            step2_url = f"https://bff-gateway.zepto.com/api/v1/maps/place/details/?place_id={place_id}"
            r2 = self.context.request.get(step2_url, headers=base_headers, timeout=15000)
            if r2.status != 200:
                logger.warning(f"Step 2 Place Details returned status {r2.status}")
                return None

            d2 = r2.json()
            location = d2.get("result", {}).get("geometry", {}).get("location", {})
            lat, lng = location.get("lat"), location.get("lng")
            if lat is None or lng is None:
                logger.warning(f"Coordinates not found in place details for {place_id}")
                return None

            # STEP 3: Serviceability & Store Mapping (Coordinates -> Store ID)
            step3_url = f"https://bff-gateway.zepto.com/api/v1/user/customer/address/location?latitude={lat}&longitude={lng}"
            r3 = self.context.request.get(step3_url, headers=base_headers, timeout=15000)
            if r3.status != 200:
                logger.warning(f"Step 3 Location Resolution returned status {r3.status}")
                return None

            d3 = r3.json()
            store_id = d3.get("storeDetailedInfo", {}).get("storeId")
            if not store_id:
                logger.warning(f"Store ID not serviceable for coordinates {lat}, {lng}")
                return None

            self._current_pincode = pincode
            self._current_store_id = store_id
            logger.info(f"Resolved pincode {pincode} -> Store ID: {store_id}")
            return store_id

        except Exception as e:
            logger.error(f"Error resolving location for pincode {pincode}: {e}", exc_info=True)
            return None

    def fetch_search_results(
        self, pincode: str, query: str, target_brand: str | None = None
    ) -> dict | None:
        """
        Executes Zepto direct API scraping flow:
        1. Resolves store_id via Steps 1-3 direct API handshake.
        2. Dispatches Step 4 Product Search POST API directly:
           POST https://bff-gateway.zepto.com/user-search-service/api/v3/search
        """
        try:
            # 1. Resolve store mapping for requested pincode
            store_id = self.resolve_location(pincode)
            if not store_id:
                logger.warning(f"Could not resolve store_id for pincode {pincode}")
                return None

            device_id, session_id = self._get_session_tokens()

            # STEP 4: Product Search (Store ID -> Inventory Data)
            search_headers = {
                "store_id": store_id,
                "tenant": "ZEPTO",
                "device_id": device_id,
                "session_id": session_id,
                "app_version": "16.31.2",
                "appsubplatform": "WEB",
                "content-type": "application/json",
                "accept": "*/*",
            }

            payload = {
                "intentId": str(uuid.uuid4()),
                "mode": "AUTOSUGGEST",
                "pageNumber": 0,
                "query": query,
                "userSessionId": session_id,
            }

            logger.info(f"Dispatching direct search API for query '{query}' (store: {store_id})...")
            search_url = "https://bff-gateway.zepto.com/user-search-service/api/v3/search"
            response = self.context.request.post(
                search_url,
                headers=search_headers,
                data=payload,
                timeout=20000,
            )

            if response.status != 200:
                logger.warning(f"Step 4 Search API returned status {response.status}: {response.text()[:200]}")
                return None

            data = response.json()
            return {
                "status": "SUCCESS",
                "pincode": pincode,
                "query": query,
                "target_brand": target_brand,
                "payloads": [data],
            }

        except Exception as e:
            logger.error(f"Error during Zepto search for query '{query}' (pincode {pincode}): {e}", exc_info=True)
            return None

    def close(self):
        try:
            self.browser.close()
            self.playwright.stop()
        except Exception:
            pass
