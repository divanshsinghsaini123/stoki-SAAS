import logging
import re
from typing import Any

logger = logging.getLogger("blinkit-parser")


def clean_alphanumeric(value: str | None) -> str:
    """Strips all spaces and punctuation: 'Red Bull' -> 'redbull'."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def parse_price(val: Any) -> float | None:
    """Safely extracts numeric float from currency string like '₹125' or '₹1,250.50'."""
    if val is None:
        return None
    cleaned = re.sub(r"[^\d.]", "", str(val).replace(",", ""))
    try:
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


def parse_blinkit_response(
    raw_response: dict,
    pincode: str,
    brand_id: str,
    target_brand: str | None = None,
    query: str | None = None,
) -> list[dict[str, Any]]:
    """
    Parses Blinkit search snippets payload into InventorySnapshot schema.
    Extracts core relational columns and stores auxiliary platform attributes in platform_metadata (JSONB).
    """
    if not raw_response or raw_response.get("status") != "SUCCESS":
        return []

    snippets = raw_response.get("snippets", [])
    merchant_id = str(raw_response.get("merchant_id") or "")
    city_id = raw_response.get("city_id")
    city_name = raw_response.get("city_name")
    coordinates = raw_response.get("coordinates", {})

    extracted_records: list[dict[str, Any]] = []
    seen_skus: set[str] = set()

    for s in snippets:
        if s.get("widget_type") != "product_card_snippet_type_2":
            continue

        p_data = s.get("data", {})
        tracking = s.get("tracking", {}).get("common_attributes", {})

        p_id = str(p_data.get("product_id") or "")
        if not p_id or p_id in seen_skus:
            continue

        actual_brand = p_data.get("brand_name", {}).get("text", "")
        product_name = p_data.get("name", {}).get("text", "")
        display_title = (
            p_data.get("display_name", {}).get("text")
            or product_name
        )

        # Brand / Query Filter matching (case and space insensitive)
        if target_brand or query:
            actual_b = clean_alphanumeric(actual_brand)
            target_b = clean_alphanumeric(target_brand)
            query_b = clean_alphanumeric(query)

            matches_target = target_b and (
                target_b == actual_b or target_b in actual_b or actual_b in target_b
            )
            matches_query = query_b and (
                query_b == actual_b or query_b in actual_b or actual_b in query_b
            )

            if not (matches_target or matches_query):
                continue

        seen_skus.add(p_id)

        # Stock calculations
        is_sold_out = bool(p_data.get("is_sold_out", False))
        inventory_count = p_data.get("inventory")
        try:
            inv_int = int(inventory_count) if inventory_count is not None else None
        except (ValueError, TypeError):
            inv_int = None

        in_stock_bool = (not is_sold_out) and (inv_int is None or inv_int > 0)
        stock_status = "in_stock" if in_stock_bool else "out_of_stock"

        # Price parsing
        normal_price_str = p_data.get("normal_price", {}).get("text")
        mrp_str = p_data.get("mrp", {}).get("text")

        selling_price = parse_price(normal_price_str)
        mrp = parse_price(mrp_str) or selling_price

        # Image extraction: Blinkit provides direct full CDN image URL
        primary_image = p_data.get("image", {}).get("url")

        # Media gallery images
        media_items = p_data.get("media_container", {}).get("items", [])
        media_gallery = [
            item["image"]["url"]
            for item in media_items
            if isinstance(item, dict) and "image" in item and "url" in item.get("image", {})
        ]

        # Extra unstructured platform attributes -> JSONB
        platform_metadata = {
            "image": primary_image,
            "media_gallery": media_gallery,
            "group_id": p_data.get("group_id"),
            "inventory_count": inv_int,
            "discount": p_data.get("offer_tag", {}).get("title", {}).get("text", "").replace("\n", " "),
            "is_sold_out": is_sold_out,
            "is_sponsored": tracking.get("badge") == "AD",
            "rating": p_data.get("rating", {}).get("bar", {}).get("value"),
            "rating_count": p_data.get("rating", {}).get("bar", {}).get("title", {}).get("text"),
            "eta_tag": p_data.get("eta_tag", {}).get("title", {}).get("text"),
            "deeplink": p_data.get("click_action", {}).get("blinkit_deeplink", {}).get("url"),
            "ptype": tracking.get("ptype"),
            "merchant_id": merchant_id,
            "city_id": city_id,
            "city_name": city_name,
            "coordinates": coordinates,
        }

        snapshot_dict = {
            "brand_id": brand_id,
            "platform": "blinkit",
            "pincode": str(pincode),
            "dark_store_id": merchant_id,
            "sku_id": p_id,
            "parent_product_name": product_name,
            "title": display_title,
            "brand": actual_brand or target_brand,
            "size": p_data.get("variant", {}).get("text"),
            "mrp": mrp,
            "selling_price": selling_price,
            "stock_status": stock_status,
            "in_stock": in_stock_bool,
            "max_allowed_cart_qty": inv_int,
            "platform_metadata": platform_metadata,
        }

        extracted_records.append(snapshot_dict)

    logger.info(
        f"Successfully extracted {len(extracted_records)} Blinkit product snapshot(s) for query '{query}'."
    )
    return extracted_records
