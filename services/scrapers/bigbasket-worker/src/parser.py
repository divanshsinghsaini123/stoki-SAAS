import logging
import re
from typing import Any

logger = logging.getLogger("bigbasket-parser")


def clean_alphanumeric(value: str | None) -> str:
    """Strips all non-alphanumeric characters for robust case/space insensitive matching."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def parse_price(val: Any) -> float | None:
    """Safely extracts numeric float from price value or currency string."""
    if val is None:
        return None
    cleaned = re.sub(r"[^\d.]", "", str(val).replace(",", ""))
    try:
        return float(cleaned) if cleaned else None
    except (ValueError, TypeError):
        return None


def parse_bigbasket_response(
    raw_response: dict,
    pincode: str,
    brand_id: str,
    target_brand: str | None = None,
    query: str | None = None,
) -> list[dict[str, Any]]:
    """
    Parses BigBasket product listings into the standard InventorySnapshot schema.
    Extracts core relational attributes and persists platform-specific fields in platform_metadata (JSONB).
    """
    if not raw_response or raw_response.get("status") != "SUCCESS":
        return []

    # Support products extracted directly or from tabs
    products = raw_response.get("products", [])
    if not products:
        tabs = raw_response.get("tabs", [])
        if tabs and isinstance(tabs, list):
            products = tabs[0].get("product_info", {}).get("products", [])

    dark_store_id = str(raw_response.get("dark_store_id") or raw_response.get("sa_id") or "default")
    coordinates = raw_response.get("coordinates", {})

    extracted_records: list[dict[str, Any]] = []
    seen_skus: set[str] = set()

    for p in products:
        p_id = str(p.get("id") or "")
        if not p_id or p_id in seen_skus:
            continue

        brand_info = p.get("brand") or {}
        actual_brand = brand_info.get("name", "") if isinstance(brand_info, dict) else ""
        product_name = p.get("desc", "") or ""
        pack_desc = p.get("pack_desc", "") or ""
        size_w = p.get("w", "") or ""

        # Title formatting: e.g. "Energy Drink - 250 ml (Pack of 4)"
        title_parts = [product_name]
        if size_w and size_w not in product_name:
            title_parts.append(size_w)
        if pack_desc and pack_desc not in product_name and pack_desc not in size_w:
            title_parts.append(pack_desc)
        title = " - ".join(part for part in title_parts if part).strip() or product_name

        # Brand / Query Filter matching (case and space insensitive)
        if target_brand or query:
            actual_b = clean_alphanumeric(actual_brand)
            target_b = clean_alphanumeric(target_brand)
            query_b = clean_alphanumeric(query)
            desc_b = clean_alphanumeric(product_name)

            matches_target = target_b and (
                target_b == actual_b or target_b in actual_b or actual_b in target_b or target_b in desc_b
            )
            matches_query = query_b and (
                query_b == actual_b or query_b in actual_b or actual_b in query_b or query_b in desc_b
            )

            if not (matches_target or matches_query):
                continue

        seen_skus.add(p_id)

        # Availability & Stock logic
        availability = p.get("availability") or {}
        avail_status = availability.get("avail_status", "")
        # In BigBasket, "001" represents available/in-stock, "000" represents out of stock
        in_stock_bool = avail_status == "001"
        stock_status = "in_stock" if in_stock_bool else "out_of_stock"

        # Pricing extraction
        pricing = p.get("pricing") or {}
        discount = pricing.get("discount") or {}
        prim_price = discount.get("prim_price") or {}

        sp_val = prim_price.get("sp")
        mrp_val = discount.get("mrp")

        selling_price = parse_price(sp_val)
        mrp = parse_price(mrp_val) or selling_price

        # Image extraction: primary image URL + image gallery
        images_list = p.get("images") or []
        primary_image = None
        media_gallery = []

        if isinstance(images_list, list) and images_list:
            for img in images_list:
                if isinstance(img, dict):
                    # BigBasket provides "s", "m", "l", "xl", "xxl" resolutions
                    img_url = img.get("m") or img.get("s") or img.get("l")
                    if img_url:
                        media_gallery.append(img_url)
            if media_gallery:
                primary_image = media_gallery[0]

        # Badge and USPs
        badge = p.get("sku_badge") or {}
        badge_label = badge.get("label") if isinstance(badge, dict) else None

        usps_list = []
        for u in p.get("usps") or []:
            if isinstance(u, dict) and u.get("label"):
                usps_list.append(u.get("label"))

        # Extra unstructured platform attributes -> JSONB
        platform_metadata = {
            "image": primary_image,
            "media_gallery": media_gallery,
            "pack_desc": pack_desc,
            "unit": p.get("unit"),
            "discount_text": discount.get("d_text"),
            "deal_score": discount.get("deal_score"),
            "stock_badge": badge_label,
            "button": availability.get("button"),
            "show_express": availability.get("show_express"),
            "url": f"https://www.bigbasket.com{p.get('absolute_url', '')}",
            "sku_deck_type": p.get("sku_deck_type"),
            "usps": usps_list,
            "coordinates": coordinates,
        }

        # Safe cart limit extraction
        raw_max_qty = p.get("sku_max_quantity")
        try:
            max_qty = int(raw_max_qty) if raw_max_qty is not None and int(raw_max_qty) > 0 else None
        except (ValueError, TypeError):
            max_qty = None

        snapshot_dict = {
            "brand_id": brand_id,
            "platform": "bigbasket",
            "pincode": str(pincode),
            "dark_store_id": dark_store_id,
            "sku_id": p_id,
            "parent_product_name": product_name,
            "title": title,
            "brand": actual_brand or target_brand,
            "size": size_w or pack_desc,
            "mrp": mrp,
            "selling_price": selling_price,
            "stock_status": stock_status,
            "in_stock": in_stock_bool,
            "max_allowed_cart_qty": max_qty,
            "platform_metadata": platform_metadata,
        }

        extracted_records.append(snapshot_dict)

    logger.info(
        f"Successfully extracted {len(extracted_records)} BigBasket product snapshot(s) for query '{query}'."
    )
    return extracted_records
