import logging
import random
import re
import secrets
import time
import uuid
import requests

logger = logging.getLogger("blinkit-scraper")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

AUTH_KEY = "c761ec3633c22afad934fb17a66385c1c06c5472b4898b866b7306186d0bb477"


def clean_alphanumeric(value: str | None) -> str:
    """Strips spaces and non-alphanumeric characters for robust matching."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


class BlinkitScraper:
    def __init__(self):
        self.session = requests.Session()
        self.device_id = secrets.token_hex(8)
        self.session_uuid = str(uuid.uuid4())
        self.base_headers = {
            "app_client": "consumer_web",
            "app_version": "52434332",
            "web_app_version": "1008010016",
            "rn_bundle_version": "1009003012",
            "auth_key": AUTH_KEY,
            "device_id": self.device_id,
            "session_uuid": self.session_uuid,
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "*/*",
        }

    def fetch_search_results(
        self, pincode: str, query: str, target_brand: str | None = None
    ) -> dict | None:
        """
        Executes the multi-step Blinkit API chain:
        1. autoSuggest (pincode -> Google Place ID)
        2. location/info (Place ID -> Lat/Lon + Serviceability)
        3. secondary-data (Lat/Lon -> Dark Store / Merchant ID)
        4. layout/search (Paginated product snippets)
        """
        try:
            headers = dict(self.base_headers)

            # -------------------------------------------------------------
            # STEP 1: Address Autocomplete & Place ID
            # -------------------------------------------------------------
            autosuggest_url = "https://blinkit.com/location/autoSuggest"
            params_step1 = {
                "query": pincode,
                "lat": "28.413333",
                "lng": "77.072833",
                "session_token": "",
            }
            res1 = self.session.get(
                autosuggest_url, params=params_step1, headers=headers, timeout=12
            )
            if res1.status_code != 200:
                logger.warning(f"Step 1 autoSuggest failed with status {res1.status_code}")
                return None

            suggestions = res1.json().get("ui_data", {}).get("suggestions", [])
            if not suggestions:
                logger.warning(f"No address suggestions found for pincode: {pincode}")
                return None

            first_suggestion = suggestions[0]
            place_id = first_suggestion["meta"]["place_id"]
            session_token = first_suggestion["meta"].get("session_token", "")
            title = first_suggestion.get("title", {}).get("text", "")
            description = first_suggestion.get("subtitle", {}).get("text", "")

            time.sleep(random.uniform(1.0, 1.8))

            # -------------------------------------------------------------
            # STEP 2: Coordinate Resolution & Location Verification
            # -------------------------------------------------------------
            info_url = "https://blinkit.com/location/info"
            params_step2 = {
                "place_id": place_id,
                "title": title,
                "description": description,
                "is_pin_moved": "false",
                "session_token": session_token,
            }
            res2 = self.session.get(
                info_url, params=params_step2, headers=headers, timeout=12
            )
            if res2.status_code != 200:
                logger.warning(f"Step 2 location info failed with status {res2.status_code}")
                return None

            data_info = res2.json()
            if not data_info.get("is_serviceable", False):
                logger.warning(f"Pincode {pincode} is not serviceable by Blinkit.")
                return {"status": "UNSERVICEABLE", "pincode": pincode}

            lat = str(data_info["coordinate"]["lat"])
            lon = str(data_info["coordinate"]["lon"])
            headers["lat"] = lat
            headers["lon"] = lon

            time.sleep(random.uniform(1.0, 1.8))

            # -------------------------------------------------------------
            # STEP 3: Dark-Store / Merchant Allocation
            # -------------------------------------------------------------
            secondary_url = "https://blinkit.com/v2/services/secondary-data/"
            params_step3 = {
                "filter": "new_offer,show_product_group_sharing,is_new_user,cart_ab_test_variant,city_id,sku_auto_add,cart_banner_image,show_referral_login,product_sku_limit",
                "offers_last_visit_ts": "0",
            }
            res3 = self.session.get(
                secondary_url, params=params_step3, headers=headers, timeout=12
            )
            merchant_id = ""
            city_id = None
            city_name = None

            if res3.status_code == 200:
                props = res3.json().get("analytics_properties", {})
                raw_mid = props.get("merchant_id")
                if not raw_mid:
                    # Fallback to express merchant list
                    merchants = props.get("services", {}).get("merchants", [])
                    if merchants:
                        raw_mid = merchants[0].get("id")
                merchant_id = str(raw_mid or "")
                city_id = props.get("city_id")
                city_name = props.get("city_name")

            time.sleep(random.uniform(1.0, 1.8))

            # -------------------------------------------------------------
            # STEP 4: Product Search with Infinite Scroll Pagination
            # -------------------------------------------------------------
            offset = 0
            limit = 12
            max_pages = 10
            seen_product_ids: set[str] = set()
            collected_snippets: list[dict] = []

            search_url = "https://blinkit.com/v1/layout/search"
            brand_filter = clean_alphanumeric(target_brand or query)

            for page in range(max_pages):
                params_step4 = {
                    "offset": offset,
                    "limit": limit,
                    "actual_query": query,
                    "q": query,
                    "search_method": "basic",
                    "search_type": "type_to_search",
                }

                res4 = self.session.post(
                    search_url,
                    params=params_step4,
                    headers=headers,
                    json={},
                    timeout=15,
                )
                if res4.status_code != 200:
                    logger.warning(
                        f"Search failed at offset {offset} with status {res4.status_code}"
                    )
                    break

                batch_snippets = (
                    res4.json().get("response", {}).get("snippets", [])
                )
                if not batch_snippets:
                    break

                found_new_product = False
                for snip in batch_snippets:
                    if snip.get("widget_type") == "product_card_snippet_type_2":
                        p_data = snip.get("data", {})
                        p_id = str(p_data.get("product_id") or "")
                        if not p_id or p_id in seen_product_ids:
                            continue

                        # Check if product belongs to brand/query
                        brand_name = clean_alphanumeric(
                            p_data.get("brand_name", {}).get("text", "")
                        )
                        if brand_filter and brand_name:
                            # Match if brand contains or is contained in target
                            if not (
                                brand_filter in brand_name
                                or brand_name in brand_filter
                            ):
                                continue

                        seen_product_ids.add(p_id)
                        found_new_product = True
                        collected_snippets.append(snip)

                # Stop pagination if no new matching products were found in this batch
                if not found_new_product:
                    break

                offset += limit
                time.sleep(random.uniform(1.2, 2.5))

            return {
                "status": "SUCCESS",
                "pincode": pincode,
                "merchant_id": merchant_id,
                "city_id": city_id,
                "city_name": city_name,
                "coordinates": {"lat": lat, "lon": lon},
                "snippets": collected_snippets,
            }

        except Exception as e:
            logger.error(
                f"Error in Blinkit scraper for pincode {pincode}: {e}",
                exc_info=True,
            )
            return None

    def close(self):
        try:
            self.session.close()
        except Exception:
            pass
