import logging
import os
import random
import re
import sys
import time
from pathlib import Path
from typing import Any
from playwright.sync_api import sync_playwright

# Add project root to sys.path and load environment
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

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
        self.base_url = os.getenv("ZEPTO_BASE_URL", "https://www.zepto.com").rstrip("/")
        self.search_api_pattern = os.getenv(
            "ZEPTO_SEARCH_API_PATTERN", "user-search-service/api/v3/search"
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

        temp_context = self.browser.new_context()
        raw_ua = temp_context.new_page().evaluate("navigator.userAgent")
        temp_context.close()

        clean_ua = re.sub(r"HeadlessChrome/([0-9\.]+)", r"Chrome/\1", raw_ua)
        logger.info(f"Using dynamic synchronized User-Agent: {clean_ua}")

        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1280, "height": 720},
            user_agent=clean_ua,
        )
        self.page = self.context.new_page()
        self._current_pincode = None
        self._current_store_id = None
        self._init_session(max_retries=self.init_max_retries)

    def _init_session(self, max_retries: int = 3):
        """Initializes Zepto session with up to max_retries attempts on homepage only."""
        logger.info(f"Initializing Playwright Chromium session on {self.base_url}...")
        for attempt in range(1, max_retries + 1):
            try:
                self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=45000)
                self.page.wait_for_timeout(3000)
                logger.info(f"Zepto session initialized: '{self.page.title()}'.")
                return
            except Exception as e:
                logger.warning(f"[Attempt {attempt}/{max_retries}] Error loading {self.base_url}: {e}")
                time.sleep(5)

        logger.error(f"Failed to obtain healthy Zepto session after {max_retries} attempts.")

    def set_location(self, pincode: str) -> bool:
        """Sets delivery pincode on Zepto via clean browser input handshake."""
        if self._current_pincode == pincode:
            return True

        logger.info(f"Setting delivery location to pincode {pincode}...")
        try:
            # 1. Reset user-position in localStorage to guarantee clean 'Select Location' state
            self.page.evaluate("() => { try { localStorage.removeItem('user-position'); } catch(e){} }")
            self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=30000)
            self.page.wait_for_timeout(2000)

            # 2. Click location button in header
            loc_btn = self.page.locator(
                'button:has-text("Select Location"), [data-testid="user-address"], header div:has-text("Delivery"), header button'
            ).first

            try:
                loc_btn.click(force=True, timeout=5000)
            except Exception:
                loc_btn.dispatch_event("click")

            # 3. Locate address search input inside modal
            self.page.wait_for_timeout(1000)
            inp = self.page.locator(
                'input[placeholder*="address"], input[placeholder*="Search"], input[type="text"]'
            ).last
            inp.wait_for(state="visible", timeout=10000)
            inp.click(force=True)
            inp.fill(str(pincode))
            self.page.wait_for_timeout(2000)

            # 4. Click address suggestion matching pincode
            sug = self.page.locator(
                f'div[data-testid="address-search-item"], li:has-text("{pincode}"), div[role="dialog"] ul li, div[role="dialog"] div[role="button"]'
            ).first

            if sug.count() > 0:
                try:
                    sug.click(force=True, timeout=5000)
                except Exception:
                    sug.dispatch_event("click")
                self.page.wait_for_timeout(2500)
                self._current_pincode = pincode
                logger.info(f"Successfully set location for pincode {pincode}.")
                return True
            else:
                logger.warning(f"No address suggestions found for pincode {pincode}.")
                return False

        except Exception as e:
            logger.error(f"Failed to set location for pincode {pincode}: {e}", exc_info=True)
            return False

    def fetch_search_results(
        self, pincode: str, query: str, target_brand: str | None = None
    ) -> dict | None:
        """
        Executes Zepto search flow in real Playwright Chromium context with ZERO retries:
        1. Sets pincode location via UI autocomplete handshake.
        2. Dispatches search and captures signed raw JSON matching ZEPTO_SEARCH_API_PATTERN.
        """
        try:
            # 1. Ensure location is bound to requested pincode
            location_ok = self.set_location(pincode)
            if not location_ok:
                logger.warning(f"Pincode {pincode} could not be set on Zepto.")
                return None

            # 2. Intercept search responses
            captured_payloads: list[dict] = []
            pattern = self.search_api_pattern

            def on_response(res):
                if pattern in res.url and res.status == 200:
                    try:
                        captured_payloads.append(res.json())
                    except Exception:
                        pass

            self.page.on("response", on_response)

            # 3. Trigger search input
            search_btn = self.page.locator(
                'a[data-testid="search-bar-icon"], header button:has-text("Search"), button:has-text("Search for"), a[href*="/search"]'
            ).first
            if search_btn.count() > 0 and search_btn.is_visible():
                try:
                    search_btn.click(force=True, timeout=5000)
                except Exception:
                    search_btn.dispatch_event("click")
                self.page.wait_for_timeout(1000)

            # Locate search input field
            try:
                self.page.wait_for_selector('input[type="text"], input[placeholder*="Search"]', timeout=6000)
            except Exception:
                pass

            search_inp = self.page.locator('input[type="text"], input[placeholder*="Search"]').last
            search_inp.click(force=True)
            search_inp.fill(query)
            self.page.keyboard.press("Enter")
            self.page.wait_for_timeout(4000)

            self.page.remove_listener("response", on_response)

            if not captured_payloads:
                logger.warning(f"No search payload intercepted for query '{query}' in pincode {pincode}.")
                return None

            return {
                "status": "SUCCESS",
                "pincode": pincode,
                "query": query,
                "target_brand": target_brand,
                "payloads": captured_payloads,
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
