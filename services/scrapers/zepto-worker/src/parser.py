import logging
import re
from typing import Any

logger = logging.getLogger("zepto-parser")


def clean_alphanumeric(value: str | None) -> str:
    """Strips spaces and non-alphanumeric characters for robust matching."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def parse_zepto_response(
    raw_response: dict,
    pincode: str,
    brand_id: str,
    target_brand: str | None = None,
    query: str | None = None,
) -> list[dict]:
    """
    Parses intercepted Zepto search JSON responses according to specification.
    Maps extracted items into InventorySnapshot dictionary schemas.
    """
    snapshots: list[dict] = []
    seen_variant_ids: set[str] = set()

    payloads = raw_response.get("payloads", [])
    if not payloads:
        return snapshots

    brand_filter = clean_alphanumeric(target_brand or query or "")

    for payload in payloads:
        meta = payload.get("meta", {})
        default_store_id = (
            meta.get("store_stress_info", {}).get("storeIdUsedStressRanking")
            or ""
        )

        layout = payload.get("layout", [])
        for widget in layout:
            resolver = widget.get("data", {}).get("resolver", {})
            rtype = resolver.get("type", "")
            items = resolver.get("data", {}).get("items") or []

            # Extract candidates from widget
            for item in items:
                candidates: list[tuple[dict, bool]] = []

                if "productResponse" in item:
                    candidates.append((item["productResponse"], False))
                elif item.get("type") == "PRODUCT_ITEM" and "data" in item:
                    candidates.append((item["data"], rtype == "ads_post_search"))
                elif "items" in item and isinstance(item["items"], list):
                    for sub in item["items"]:
                        if sub.get("type") == "PRODUCT_ITEM" and "data" in sub:
                            candidates.append((sub["data"], True))
                        elif "productResponse" in sub:
                            candidates.append((sub["productResponse"], False))

                for pdata, is_ad in candidates:
                    prod = pdata.get("product") or {}
                    variant = pdata.get("productVariant") or {}

                    variant_id = variant.get("id")
                    product_id = prod.get("id")
                    sku_id = str(variant_id or product_id or "")

                    if not sku_id or sku_id in seen_variant_ids:
                        continue

                    raw_brand = prod.get("brand") or ""
                    cleaned_brand = clean_alphanumeric(raw_brand)

                    # Brand filter matching
                    if brand_filter and cleaned_brand:
                        if brand_filter not in cleaned_brand and cleaned_brand not in brand_filter:
                            continue

                    seen_variant_ids.add(sku_id)

                    # Prices (Stored in paise, divide by 100 for INR)
                    raw_sp = pdata.get("sellingPrice")
                    selling_price = round(float(raw_sp) / 100.0, 2) if raw_sp is not None else None

                    raw_mrp = pdata.get("mrp")
                    mrp = round(float(raw_mrp) / 100.0, 2) if raw_mrp is not None else None

                    raw_discount_amt = pdata.get("discountAmount")
                    discount_amount = (
                        round(float(raw_discount_amt) / 100.0, 2)
                        if raw_discount_amt is not None
                        else None
                    )

                    # Stock status & quantities
                    out_of_stock = bool(pdata.get("outOfStock", False))
                    stock_status = "out_of_stock" if out_of_stock else "in_stock"
                    in_stock = not out_of_stock
                    available_qty = pdata.get("availableQuantity")

                    # Title, size, store
                    product_name = prod.get("name") or "Unknown Product"
                    pack_size = variant.get("formattedPacksize")
                    if not pack_size and variant.get("weightInGms"):
                        pack_size = f"{variant.get('weightInGms')} g"

                    store_id = str(pdata.get("storeId") or default_store_id or "")

                    # Images
                    images = [
                        img.get("path")
                        for img in variant.get("images", [])
                        if isinstance(img, dict) and img.get("path")
                    ]
                    image_url = None
                    if images:
                        image_url = f"https://cdn.zeptonow.com/production///tr:w-600,ar-100-100,pr-true,f-auto,q-80/{images[0]}"

                    # Ratings
                    rating_summary = variant.get("ratingSummary") or {}
                    avg_rating = rating_summary.get("averageRating")
                    total_ratings = rating_summary.get("totalRatings")

                    platform_metadata = {
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "is_sponsored": is_ad,
                        "discount_percent": pdata.get("discountPercent"),
                        "discount_amount": discount_amount,
                        "ratings": {
                            "average_rating": avg_rating,
                            "rating_count": total_ratings,
                        },
                        "country_of_origin": prod.get("countryOfOrigin"),
                        "weight_in_gms": variant.get("weightInGms"),
                        "image": image_url,
                        "all_images": images,
                        "widget_type": rtype,
                    }

                    snapshot_dict = {
                        "brand_id": brand_id,
                        "platform": "zepto",
                        "pincode": str(pincode),
                        "dark_store_id": store_id,
                        "sku_id": sku_id,
                        "parent_product_name": product_name,
                        "title": product_name,
                        "brand": raw_brand or target_brand,
                        "size": pack_size,
                        "mrp": mrp,
                        "selling_price": selling_price,
                        "stock_status": stock_status,
                        "in_stock": in_stock,
                        "max_allowed_cart_qty": available_qty,
                        "platform_metadata": platform_metadata,
                    }

                    snapshots.append(snapshot_dict)

    logger.info(
        f"Parsed {len(snapshots)} unique Zepto products matching '{target_brand or query}' for pincode {pincode}."
    )
    return snapshots
