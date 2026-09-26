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

logger = logging.getLogger("blinkit-scraper")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def clean_alphanumeric(value: str | None) -> str:
    """Strips spaces and non-alphanumeric characters for robust matching."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


class BlinkitScraper:
    def __init__(self, headless: bool = True):
        self.base_url = os.getenv("BLINKIT_BASE_URL", "https://blinkit.com").rstrip("/")
        self.autosuggest_url = os.getenv(
            "BLINKIT_AUTOSUGGEST_URL", f"{self.base_url}/location/autoSuggest"
        )
        self.location_info_url = os.getenv(
            "BLINKIT_LOCATION_INFO_URL", f"{self.base_url}/location/info"
        )
        self.secondary_data_url = os.getenv(
            "BLINKIT_SECONDARY_DATA_URL", f"{self.base_url}/v2/services/secondary-data/"
        )
        self.search_url = os.getenv(
            "BLINKIT_SEARCH_URL", f"{self.base_url}/v1/layout/search"
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
            locale="en-GB",
            timezone_id="Asia/Kolkata",
            viewport={"width": 1280, "height": 720},
            user_agent=USER_AGENT,
        )
        self.page = self.context.new_page()
        self._init_session(max_retries=self.init_max_retries)

    def _init_session(self, max_retries: int = 3):
        """Initializes Blinkit session with up to max_retries attempts on homepage only."""
        logger.info(f"Initializing Playwright Chromium session on {self.base_url}...")
        for attempt in range(1, max_retries + 1):
            try:
                self.page.goto(self.base_url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(3)
                logger.info(f"Blinkit session initialized: '{self.page.title()}'.")
                return
            except Exception as e:
                logger.warning(f"[Attempt {attempt}/{max_retries}] Error loading {self.base_url}: {e}")
                time.sleep(5)

        logger.error(f"Failed to obtain healthy Blinkit session after {max_retries} attempts.")

    def fetch_search_results(
        self, pincode: str, query: str, target_brand: str | None = None
    ) -> dict | None:
        """
        Executes Blinkit API chain inside real Playwright Chromium context with ZERO retries:
        1. autoSuggest (pincode -> Google Place ID)
        2. location/info (Place ID -> Lat/Lon + Serviceability)
        3. secondary-data (Lat/Lon -> Dark Store / Merchant ID)
        4. layout/search (Paginated product snippets)
        """
        try:
            brand_filter = clean_alphanumeric(target_brand or query)

            flow_result = self.page.evaluate(
                """
                async ({ pincode, query, brand_filter, autosuggestUrl, locationInfoUrl, secondaryDataUrl, searchUrl }) => {
                    const cleanAlpha = (val) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                    const baseHeaders = {
                        'app_client': 'consumer_web',
                        'app_version': '52434332',
                        'web_app_version': '1008010016',
                        'rn_bundle_version': '1009003012',
                        'Content-Type': 'application/json',
                        'Accept': '*/*'
                    };

                    // STEP 1: Address Autocomplete & Place ID
                    const sUrl = `${autosuggestUrl}?query=${encodeURIComponent(pincode)}&lat=28.413333&lng=77.072833&session_token=`;
                    const r1 = await fetch(sUrl, { headers: baseHeaders });
                    if (r1.status !== 200) {
                        return { error: `Step 1 autoSuggest failed with status ${r1.status}` };
                    }
                    const d1 = await r1.json();
                    const suggestions = d1.ui_data?.suggestions || [];
                    if (!suggestions.length) {
                        return { error: `No address suggestions found for pincode ${pincode}` };
                    }

                    const firstSug = suggestions[0];
                    const placeId = firstSug.meta?.place_id;
                    const sessionToken = firstSug.meta?.session_token || '';
                    const title = firstSug.title?.text || '';
                    const description = firstSug.subtitle?.text || '';

                    // STEP 2: Coordinate Resolution & Location Verification
                    const iUrl = `${locationInfoUrl}?place_id=${encodeURIComponent(placeId)}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&is_pin_moved=false&session_token=${encodeURIComponent(sessionToken)}`;
                    const r2 = await fetch(iUrl, { headers: baseHeaders });
                    if (r2.status !== 200) {
                        return { error: `Step 2 location info failed with status ${r2.status}` };
                    }
                    const d2 = await r2.json();
                    if (!d2.is_serviceable) {
                        return { unserviceable: true, pincode };
                    }

                    const lat = String(d2.coordinate.lat);
                    const lon = String(d2.coordinate.lon);
                    const activeHeaders = { ...baseHeaders, lat, lon };

                    // STEP 3: Dark-Store / Merchant Allocation
                    const secUrl = `${secondaryDataUrl.replace(/\\/?$/, '/')}?filter=city_id,cart_banner_image&offers_last_visit_ts=0`;
                    const r3 = await fetch(secUrl, { headers: activeHeaders });
                    let merchantId = '';
                    let cityId = null;
                    let cityName = null;

                    if (r3.status === 200) {
                        const d3 = await r3.json();
                        const props = d3.analytics_properties || {};
                        let rawMid = props.merchant_id;
                        if (!rawMid) {
                            const merchants = props.services?.merchants || [];
                            if (merchants.length > 0) rawMid = merchants[0].id;
                        }
                        merchantId = String(rawMid || '');
                        cityId = props.city_id;
                        cityName = props.city_name;
                    }

                    // STEP 4: Product Search with Infinite Scroll Pagination
                    let offset = 0;
                    const limit = 12;
                    const maxPages = 10;
                    const seenProductIds = new Set();
                    const collectedSnippets = [];

                    for (let page = 0; page < maxPages; page++) {
                        const sUrlFull = `${searchUrl}?offset=${offset}&limit=${limit}&actual_query=${encodeURIComponent(query)}&q=${encodeURIComponent(query)}&search_method=basic&search_type=type_to_search`;
                        const r4 = await fetch(sUrlFull, {
                            method: 'POST',
                            headers: activeHeaders,
                            body: JSON.stringify({})
                        });

                        if (r4.status !== 200) break;
                        const d4 = await r4.json();
                        const batchSnippets = d4.response?.snippets || [];
                        if (!batchSnippets.length) break;

                        let foundNewProduct = false;
                        for (const snip of batchSnippets) {
                            if (snip.widget_type === 'product_card_snippet_type_2') {
                                const pData = snip.data || {};
                                const pId = String(pData.product_id || '');
                                if (!pId || seenProductIds.has(pId)) continue;

                                const actualBrand = cleanAlpha(pData.brand_name?.text || '');
                                if (brand_filter && actualBrand) {
                                    if (!actualBrand.includes(brand_filter) && !brand_filter.includes(actualBrand)) {
                                        continue;
                                    }
                                }

                                seenProductIds.add(pId);
                                foundNewProduct = true;
                                collectedSnippets.push(snip);
                            }
                        }

                        if (!foundNewProduct) break;
                        offset += limit;
                        await new Promise(r => setTimeout(r, 600));
                    }

                    return {
                        success: true,
                        merchant_id: merchantId,
                        city_id: cityId,
                        city_name: cityName,
                        coordinates: { lat, lon },
                        snippets: collectedSnippets
                    };
                }
                """,
                {
                    "pincode": str(pincode),
                    "query": query,
                    "brand_filter": brand_filter,
                    "autosuggestUrl": self.autosuggest_url,
                    "locationInfoUrl": self.location_info_url,
                    "secondaryDataUrl": self.secondary_data_url,
                    "searchUrl": self.search_url,
                },
            )

            if not flow_result:
                logger.warning(f"Blinkit flow returned empty result for pincode {pincode}")
                return None

            if flow_result.get("unserviceable"):
                logger.warning(f"Pincode {pincode} is not serviceable by Blinkit.")
                return {"status": "UNSERVICEABLE", "pincode": pincode}

            if flow_result.get("error"):
                logger.warning(f"Blinkit flow error: {flow_result['error']}")
                return None

            return {
                "status": "SUCCESS",
                "pincode": pincode,
                "merchant_id": flow_result.get("merchant_id", ""),
                "city_id": flow_result.get("city_id"),
                "city_name": flow_result.get("city_name"),
                "coordinates": flow_result.get("coordinates", {}),
                "snippets": flow_result.get("snippets", []),
            }

        except Exception as e:
            logger.error(f"Error in Blinkit scraper for pincode {pincode}: {e}", exc_info=True)
            return None

    def close(self):
        try:
            self.browser.close()
            self.playwright.stop()
        except Exception:
            pass
