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

        # Dynamically match UA to browser's actual engine version
        browser_version = getattr(self.browser, "version", "133.0.0.0")
        actual_ua = (
            f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            f"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{browser_version} Safari/537.36"
        )

        self.context = self.browser.new_context(
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1280, "height": 720},
            user_agent=actual_ua,
        )
        self.context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.page = self.context.new_page()
        self._current_pincode = None
        self._current_store_id = None
        self._init_session()

    def _init_session(self):
        logger.info("Initializing Playwright Chromium session on zepto.com...")
        self.page.goto("https://www.zepto.com/", wait_until="domcontentloaded", timeout=45000)
        self.page.wait_for_timeout(3000)
        logger.info(f"Zepto session initialized: '{self.page.title()}'.")

    def set_location(self, pincode: str) -> bool:
        """Sets delivery pincode on Zepto via clean browser input handshake."""
        if self._current_pincode == pincode:
            return True

        logger.info(f"Setting delivery location to pincode {pincode}...")
        try:
            if "zepto.com" not in self.page.url:
                self.page.goto("https://www.zepto.com/", wait_until="domcontentloaded", timeout=30000)
                self.page.wait_for_timeout(2500)

            # Location button in header
            loc_btn = self.page.locator(
                'button:has-text("Select Location"), button:has-text("Mins"), button:has-text("Delivery"), header button'
            ).first

            self.page.wait_for_timeout(500)
            try:
                loc_btn.click(force=True, timeout=5000)
            except Exception:
                self.page.goto("https://www.zepto.com/", wait_until="domcontentloaded", timeout=20000)
                self.page.wait_for_timeout(2000)
                loc_btn = self.page.locator(
                    'button:has-text("Select Location"), button:has-text("Mins"), header button'
                ).first
                loc_btn.click(force=True, timeout=5000)

            # Wait for address modal and locate visible search input
            self.page.wait_for_timeout(1500)
            inp = self.page.locator(
                'input[placeholder*="address"], input[placeholder*="Search"], input[type="text"]'
            ).last
            inp.click(force=True)
            inp.fill(str(pincode))
            self.page.wait_for_timeout(2000)

            # Click address suggestion (generic to any city/pincode)
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
        Executes Zepto search flow in real Playwright Chromium context:
        1. Sets pincode location via UI autocomplete handshake.
        2. Dispatches search on Zepto and captures signed raw JSON from:
           POST https://bff-gateway.zepto.com/user-search-service/api/v3/search
        """
        try:
            # 1. Ensure location is bound to requested pincode
            location_ok = self.set_location(pincode)
            if not location_ok:
                logger.warning(f"Pincode {pincode} could not be set on Zepto.")

            # 2. Intercept search responses
            captured_payloads: list[dict] = []

            def on_response(res):
                if "user-search-service/api/v3/search" in res.url and res.status == 200:
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
