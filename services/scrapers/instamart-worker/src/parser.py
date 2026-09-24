import re
from typing import Any

WIDGET_GRID = "type.googleapis.com/swiggy.gandalf.widgets.v2.GridWidget"
WIDGET_OOS = "type.googleapis.com/swiggy.im.v1.OOSItemCollectionCard"


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def parse_instamart_response(
    raw_response: dict,
    pincode: str,
    brand_id: str,
    target_brand: str | None = None,
    query: str | None = None
) -> list[dict[str, Any]]:
    """
    Parses Instamart search response payload.
    Maps core columns to InventorySnapshot schema and stores auxiliary platform
    attributes inside platform_metadata (JSONB).
    """
    if not raw_response or "data" not in raw_response:
        return []

    cards = raw_response.get("data", {}).get("cards", [])
    extracted_records: list[dict[str, Any]] = []
    seen_skus: set[str] = set()

    for card_wrapper in cards:
        widget = card_wrapper.get("card", {}).get("card", {})
        if not widget:
            continue

        widget_type = widget.get("@type", "")
        items_list: list[dict] = []

        if widget_type == WIDGET_GRID:
            items_list = (
                widget.get("gridElements", {})
                .get("infoWithStyle", {})
                .get("items", [])
            )
        elif widget_type == WIDGET_OOS:
            items_list = widget.get("items", {}).get("items", [])
        else:
            continue

        for prod in items_list:
            actual_brand = prod.get("brand") or ""
            parent_name = prod.get("displayName") or ""

            # Brand filter matching (if target_brand is provided)
            if target_brand or query:
                expected_norm = normalize_text(target_brand)
                actual_norm = normalize_text(actual_brand)
                query_norm = normalize_text(query)
                if query_norm != target_brand and actual_norm != expected_norm and actual_norm.replace(" ", "") != expected_norm.replace(" ", ""):
                    continue

            variations = prod.get("variations", [])
            for v in variations:
                sku_id = v.get("skuId")
                if not sku_id or sku_id in seen_skus:
                    continue
                seen_skus.add(sku_id)

                # Stock calculations
                inv_info = v.get("inventory", {})
                in_stock_bool = bool(inv_info.get("inStock", False))
                stock_status = "in_stock" if in_stock_bool else "out_of_stock"

                # Price parsing
                price_data = v.get("price", {})
                mrp_raw = price_data.get("mrp", {}).get("units")
                offer_price_raw = price_data.get("offerPrice", {}).get("units")

                try:
                    mrp = float(mrp_raw) if mrp_raw not in (None, "N/A") else None
                except (ValueError, TypeError):
                    mrp = None

                try:
                    selling_price = float(offer_price_raw) if offer_price_raw not in (None, "N/A") else None
                except (ValueError, TypeError):
                    selling_price = None

                # Quantities and IDs
                cart_allowed = v.get("cartAllowedQuantity", {})
                max_allowed_qty = cart_allowed.get("allowedQuantity")
                dark_store_id = str(v.get("podId") or "")

                # Extra unstructured platform-specific data -> JSONB
                platform_metadata = {
                    "spin_id": v.get("spinId"),
                    "category": v.get("category"),
                    "sub_category_type": v.get("subCategoryType"),
                    "super_category": v.get("superCategory"),
                    "weight_in_grams": v.get("weightInGrams"),
                    "volumetric_weight": v.get("volumetricWeight"),
                    "dimensions": v.get("dimensions"),
                    "quantity_limit_breached_message": cart_allowed.get("quantityLimitBreachedMessage"),
                    "low_stock_text": inv_info.get("lowStockText"),
                    "image_ids": v.get("imageIds", []),
                    "variation_tags": v.get("variationTags", []),
                    "discount_value": price_data.get("discountValue"),
                    "offer_applied": price_data.get("offerApplied"),
                    "product_id": prod.get("productId"),
                    "parent_product_id": prod.get("parentProductId"),
                }

                snapshot_dict = {
                    "brand_id": brand_id,  # From ticket
                    "platform": "instamart",
                    "pincode": str(pincode),
                    "dark_store_id": dark_store_id,
                    "sku_id": str(sku_id),
                    "parent_product_name": parent_name,
                    "title": v.get("displayName") or parent_name,
                    "brand": actual_brand,
                    "size": v.get("quantityDescription"),
                    "mrp": mrp,
                    "selling_price": selling_price,
                    "stock_status": stock_status,
                    "in_stock": in_stock_bool,
                    "max_allowed_cart_qty": max_allowed_qty,
                    "platform_metadata": platform_metadata,
                }

                extracted_records.append(snapshot_dict)

    return extracted_records