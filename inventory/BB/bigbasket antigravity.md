================================================================================
BIGBASKET END-TO-END SCRAPING SPECIFICATION & DATA MAPPING GUIDE
================================================================================

This document details the complete technical architecture, session binding,
and sequential API call flow required to extract real-time dark-store inventory,
dynamic pricing, catalog hierarchies, and SKU-level availability from BigBasket 
across target pincodes[cite: 1, 2].

================================================================================
SECTION 1: GLOBAL HEADERS & SESSION CONTEXT
================================================================================

BigBasket operates an address-bound, session-stateful architecture[cite: 2]. Unlike 
Blinkit (which accepts raw latitude and longitude headers on every search 
request)[cite: 3], BigBasket requires an explicit address-setting handshake[cite: 2]. Once set, 
the server assigns delivery cluster cookies (`_bb_addressinfo`, `_bb_sa_ids`, 
`_bb_cda_sa_info`) that govern subsequent catalog searches[cite: 2].

Mandatory Client Telemetry & Request Headers:
- "x-channel": "BB-WEB"[cite: 2]
- "x-entry-context": "bbnow" (or "bb-b2c" for main service)[cite: 2]
- "x-entry-context-id": "10" (or "100" for standard scheduled delivery)[cite: 2]
- "x-caller": "UI-KIRK"[cite: 2]
- "x-tracker": "{UUID4}" (e.g., "72c78d70-4b4d-422b-a763-52ebef417201")[cite: 2]
- "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"[cite: 2]
- "Content-Type": "application/json"[cite: 2]
- "Accept": "application/json, text/plain, */*"[cite: 2]

Session Cookie Prerequisites:
All steps MUST be executed using a persistent cookie session (`requests.Session`).
Akamai Bot Manager cookies (`_abck`, `bm_sz`) and server-set routing cookies 
(`_bb_bb2.0`, `_bb_sa_ids`, `_bb_pin_code`) must persist automatically[cite: 2].

================================================================================
SECTION 2: STEP-BY-STEP API FLOW
================================================================================

--------------------------------------------------------------------------------
STEP 1: Pincode Autocomplete & Prediction Resolution
--------------------------------------------------------------------------------
Resolves the raw target pincode string into BigBasket's internal geocoding Place ID[cite: 2].

* Method: GET[cite: 2]
* URL: https://www.bigbasket.com/places/v1/places/autocomplete/[cite: 2]
* Query Parameters:[cite: 2]
  - inputText: "{PINCODE}" (e.g., "400001")[cite: 2]
  - token: "{UUID4}" (e.g., "25ebf488-cc7f-482f-a2fb-ac5b4b2b792d")[cite: 2]

* Extraction Logic:
  predictions = response.json()["predictions"][cite: 2]
  target_item = predictions[0][cite: 2]
  place_id = target_item["placeId"] (e.g., "ChIJE5MNEtvR5zsRjMfa76ZglM0")[cite: 2]
  description = target_item["description"] (e.g., "Mumbai, Maharashtra 400001, India")[cite: 2]

--------------------------------------------------------------------------------
STEP 2: Coordinate Resolution & Boundary Lookup
--------------------------------------------------------------------------------
Resolves the Place ID into high-precision GPS coordinates (latitude and longitude) 
required for fulfillment center mapping[cite: 2].

* Method: GET[cite: 2]
* URL: https://www.bigbasket.com/places/v1/places/details/[cite: 2]
* Query Parameters:[cite: 2]
  - placeId: "{PLACE_ID_FROM_STEP_1}"[cite: 2]
  - token: "{UUID4_FROM_STEP_1}"[cite: 2]
  - xArm: "898"[cite: 2]
  - yArm: "230"[cite: 2]

* Extraction Logic:
  location = response.json()["geometry"]["location"][cite: 2]
  latitude = location["lat"] (e.g., 18.9385352)[cite: 2]
  longitude = location["lng"] (e.g., 72.836334)[cite: 2]
  formatted_address = response.json()["formattedAddress"][cite: 2]

--------------------------------------------------------------------------------
STEP 3: Multi-Door Serviceability Check
--------------------------------------------------------------------------------
Validates whether the resolved coordinates are serviceable across BigBasket 
delivery channels (`bbnow` instant delivery, `bb-b2c` scheduled, etc.)[cite: 2].

* Method: GET[cite: 2]
* URL: https://www.bigbasket.com/ui-svc/v1/serviceable/[cite: 2]
* Query Parameters:[cite: 2]
  - lat: "{LATITUDE_FROM_STEP_2}"[cite: 2]
  - lng: "{LONGITUDE_FROM_STEP_2}"[cite: 2]
  - send_all_serviceability: "true"[cite: 2]

* Extraction Logic:
  ecs = response.json().get("serviceable_ecs_info", {})[cite: 2]
  is_bbnow_available = ecs.get("bbnow", {}).get("serviceable") is not None[cite: 2]
  is_b2c_available = ecs.get("bb-b2c", {}).get("serviceable") is not None[cite: 2]

  * Validation Check: If neither channel is serviceable, abort execution for this pincode.

--------------------------------------------------------------------------------
STEP 4: Set Delivery Address in User Session (Dark Store Binding)
--------------------------------------------------------------------------------
Binds the coordinates to the active session. The response sets the required 
`_bb_sa_ids` (Sub-Area / Dark Store IDs) in the session cookies[cite: 2].

* Method: PUT[cite: 2]
* URL: https://www.bigbasket.com/member-svc/v2/member/current-delivery-address/[cite: 2]
* Headers:[cite: 2]
  - "x-channel": "BB-WEB"[cite: 2]
  - "x-entry-context": "bbnow"[cite: 2]
  - "x-entry-context-id": "10"[cite: 2]
  - "Content-Type": "application/json"[cite: 2]
* Payload (JSON):[cite: 2]
  {
    "lat": {LATITUDE_FROM_STEP_2},
    "long": {LONGITUDE_FROM_STEP_2},
    "return_hub_cookies": false,
    "area": null,
    "contact_zipcode": "{PINCODE}"
  }

* Action: Verify HTTP 200 OK. BigBasket sets `_bb_addressinfo` and `_bb_sa_ids` 
  in the session cookie jar[cite: 2].

--------------------------------------------------------------------------------
STEP 5: App Configuration & Bucket ID Resolution
--------------------------------------------------------------------------------
Queries the client configuration to determine the current catalog partition 
and A/B testing `bucket_id` required for search routing[cite: 2].

* Method: GET[cite: 2]
* URL: https://www.bigbasket.com/ui-svc/v1/app-data/[cite: 2]
* Query Parameters:[cite: 2]
  - i: "{CURRENT_TIMESTAMP_EPOCH_MS}" (e.g., "1789657953005")[cite: 2]

* Extraction Logic:
  bucket_id = response.json().get("bucket_id", 81)[cite: 2]

--------------------------------------------------------------------------------
STEP 6: Search Term Completion & Taxonomy Slug Resolution
--------------------------------------------------------------------------------
Converts a raw user query (e.g., "red bull") into exact catalog slugs for both 
the target brand and parent category[cite: 1].

* Method: GET[cite: 1]
* URL: https://www.bigbasket.com/listing-svc/v1/product/term-completion[cite: 1]
* Query Parameters:[cite: 1]
  - term: "{SEARCH_KEYWORD}" (URL-encoded, e.g., "red+bull")[cite: 1]

* Extraction Logic:
  data = response.json()[cite: 1]
  brand_slug = data["brands"]["values"][0]["slug"] (e.g., "red-bull")[cite: 1]
  category_slug = data["categories"]["values"][0]["slug"] (e.g., "energy-soft-drinks")[cite: 1]

--------------------------------------------------------------------------------
STEP 7: Primary Search Results (Product Search Batch)
--------------------------------------------------------------------------------
Fetches the initial batch of exact-match products matching the resolved slug[cite: 1, 2].

* Method: GET
* URL: https://www.bigbasket.com/listing-svc/v2/products
* Query Parameters:
  - type: "ps" (Product Search)
  - slug: "{BRAND_SLUG_FROM_STEP_6}" (e.g., "red-bull" or raw term)
  - page: {PAGE_NUMBER} (Starts at 1, increments sequentially)
  - bucket_id: "{BUCKET_ID_FROM_STEP_5}" (e.g., "81")

* Extraction Logic:
  products_list = response.json().get("products", [])

--------------------------------------------------------------------------------
STEP 8: Extended Discovery / Infinite Scroll Fallback
--------------------------------------------------------------------------------
Triggered when primary results run out. BigBasket loosens exact brand filters 
and fetches related products within the category[cite: 1].

* Method: GET
* URL: https://www.bigbasket.com/listing-svc/v2/products
* Query Parameters:
  - type: "extended_results"
  - slug: "{CATEGORY_SLUG_FROM_STEP_6}" (e.g., "sports-energy-drinks")
  - search_term: "{SEARCH_KEYWORD}" (e.g., "red bull")
  - page: {PAGE_NUMBER} (Starts at 1)

================================================================================
SECTION 3: UNIQUE DATA STRUCTURE & ATTRIBUTE EXTRACTION
================================================================================

BigBasket returns product cards inside the top-level `products` array[cite: 1].
Each product dictionary contains item details, availability status, and pricing[cite: 1].

JSON Parsing Paths:
- Product ID / SKU: `product["id"]` (e.g., "100012278")[cite: 1]
- SKU Deck Type: `product["sku_deck_type"]` (e.g., "discounts_deck")[cite: 1]
- Product Name / Description: `product["desc"]` (e.g., "Energy Drink")[cite: 1]
- Pack Volume / Weight: `product["w"]` (e.g., "250 ml", "355 ml")[cite: 1]
- Pack Description: `product["pack_desc"]` (e.g., "Can", "(Pack of 4)", "(Pack of 6)")[cite: 1]
- Brand Name: `product["brand"]["name"]` (e.g., "Red Bull")[cite: 1]
- Brand Slug: `product["brand"]["slug"]` (e.g., "red-bull")[cite: 1]
- Absolute Product URL: `product["absolute_url"]`[cite: 1]
- In-Stock Status Code: `product["availability"]["avail_status"]` ("001" = In Stock, "000" = Out of Stock)[cite: 1]
- Call To Action: `product["availability"]["button"]` ("Add" vs "Notify Me")[cite: 1]
- Express Delivery Eligible: `product["availability"]["show_express"]` (Boolean)[cite: 1]
- Selling Price: `float(product["pricing"]["discount"]["prim_price"]["sp"])` (e.g., 125.0)[cite: 1]
- MRP: `float(product["pricing"]["discount"]["mrp"])` (e.g., 125.0 or 480.0)[cite: 1]
- Discount Label: `product["pricing"]["discount"]["d_text"]` (e.g., "15% OFF")[cite: 1]
- Out of Stock Badge: `product.get("sku_badge", {}).get("label")` (e.g., "sold out")[cite: 1]
- Primary Image: `product["images"][0]["s"]`[cite: 1]
- Image Gallery: `[img["s"] for img in product.get("images", [])]`[cite: 1]
- Storage USP: `[usp["label"] for usp in product.get("usps", [])]` (e.g., ["CHILLED"])[cite: 1]

================================================================================
SECTION 4: COMPARISON: BIGBASKET VS. BLINKIT VS. ZEPTO
================================================================================

1. Session & Dark Store Binding:
   - BigBasket: State stored in session cookies (`_bb_sa_ids`, `_bb_addressinfo`) via `PUT /member/current-delivery-address/`[cite: 2].
   - Blinkit: Stateless coordinate headers (`lat`, `lon`) supplied in every request[cite: 3].
   - Zepto: Cookie-based store allocation (`storeId` bound in headers and session).

2. Search Mechanics:
   - BigBasket: Two-tiered search. `type=ps` returns exact matches; `type=extended_results` loads category fallbacks when exact inventory is exhausted[cite: 1].
   - Blinkit: Single endpoint (`/v1/layout/search`) that blends exact items and padding items sequentially[cite: 3].
   - Zepto: Layout-driven widget tree with lazy-loaded carousels.

3. Inventory Visibility:
   - BigBasket: Boolean inventory status (`avail_status == "001"` = Available, `"000"` = OOS)[cite: 1]. Absolute unit stock counts are masked on the frontend.
   - Blinkit: Numeric stock values exposed directly via `snippet["data"]["inventory"]`[cite: 3].
   - Zepto: Numeric stock counts exposed via `availableQuantity`.

4. Defensive Filtering Strategy:
   - Filter by brand substring: `target_brand.lower() in product["brand"]["name"].lower()` to strip out filler products (e.g., lipsticks or alternative drinks)[cite: 1].
   - Track seen `product["id"]` values across page iterations to eliminate infinite scroll duplicates[cite: 3].

================================================================================
SECTION 5: COMPLETE PYTHON SCRAPER LOGIC
================================================================================

```python
import time
import uuid
import random
import requests

def scrape_bigbasket_pincode(pincode: str, target_brand: str = "red bull"):
    session = requests.Session()
    client_token = str(uuid.uuid4())
    
    headers = {
        "x-channel": "BB-WEB",
        "x-entry-context": "bbnow",
        "x-entry-context-id": "10",
        "x-caller": "UI-KIRK",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*"
    }

    # --------------------------------------------------------------------------
    # STEP 1: Address Autocomplete
    # --------------------------------------------------------------------------
    autocomplete_url = "[https://www.bigbasket.com/places/v1/places/autocomplete/](https://www.bigbasket.com/places/v1/places/autocomplete/)"
    params_step1 = {
        "inputText": pincode,
        "token": client_token
    }
    
    res1 = session.get(autocomplete_url, params=params_step1, headers=headers).json()
    predictions = res1.get("predictions", [])
    if not predictions:
        return {"status": "FAILED", "reason": "Invalid Pincode"}

    place_id = predictions[0]["placeId"]
    time.sleep(random.uniform(0.8, 1.5))

    # --------------------------------------------------------------------------
    # STEP 2: Coordinate Resolution
    # --------------------------------------------------------------------------
    details_url = "[https://www.bigbasket.com/places/v1/places/details/](https://www.bigbasket.com/places/v1/places/details/)"
    params_step2 = {
        "placeId": place_id,
        "token": client_token,
        "xArm": "898",
        "yArm": "230"
    }
    
    res2 = session.get(details_url, params=params_step2, headers=headers).json()
    loc = res2.get("geometry", {}).get("location", {})
    lat = loc.get("lat")
    lng = loc.get("lng")
    
    if not lat or not lng:
        return {"status": "FAILED", "reason": "Failed to resolve coordinates"}

    time.sleep(random.uniform(0.8, 1.5))

    # --------------------------------------------------------------------------
    # STEP 3: Serviceability Verification
    # --------------------------------------------------------------------------
    service_url = "[https://www.bigbasket.com/ui-svc/v1/serviceable/](https://www.bigbasket.com/ui-svc/v1/serviceable/)"
    params_step3 = {
        "lat": lat,
        "lng": lng,
        "send_all_serviceability": "true"
    }
    
    res3 = session.get(service_url, params=params_step3, headers=headers).json()
    ecs_info = res3.get("serviceable_ecs_info", {})
    if not ecs_info:
        return {"status": "UNSERVICEABLE", "pincode": pincode}

    # --------------------------------------------------------------------------
    # STEP 4: Lock Delivery Address in Session
    # --------------------------------------------------------------------------
    address_url = "[https://www.bigbasket.com/member-svc/v2/member/current-delivery-address/](https://www.bigbasket.com/member-svc/v2/member/current-delivery-address/)"
    address_payload = {
        "lat": lat,
        "long": lng,
        "return_hub_cookies": False,
        "area": None,
        "contact_zipcode": str(pincode)
    }
    
    res4 = session.put(address_url, json=address_payload, headers=headers)
    if res4.status_code != 200:
        return {"status": "FAILED", "reason": "Could not bind address to session"}

    time.sleep(random.uniform(0.8, 1.5))

    # --------------------------------------------------------------------------
    # STEP 5: App Config & Bucket ID Extraction
    # --------------------------------------------------------------------------
    timestamp_ms = int(time.time() * 1000)
    app_data_url = "[https://www.bigbasket.com/ui-svc/v1/app-data/](https://www.bigbasket.com/ui-svc/v1/app-data/)"
    res5 = session.get(app_data_url, params={"i": timestamp_ms}, headers=headers).json()
    bucket_id = res5.get("bucket_id", 81)

    # --------------------------------------------------------------------------
    # STEP 6: Term Completion (Slugs Resolution)
    # --------------------------------------------------------------------------
    completion_url = "[https://www.bigbasket.com/listing-svc/v1/product/term-completion](https://www.bigbasket.com/listing-svc/v1/product/term-completion)"
    res6 = session.get(completion_url, params={"term": target_brand}, headers=headers).json()
    
    brands = res6.get("brands", {}).get("values", [])
    categories = res6.get("categories", {}).get("values", [])
    
    brand_slug = brands[0]["slug"] if brands else target_brand.replace(" ", "-").lower()
    category_slug = categories[0]["slug"] if categories else ""

    # --------------------------------------------------------------------------
    # STEP 7: Primary Product Search (type=ps)
    # --------------------------------------------------------------------------
    page = 1
    seen_skus = set()
    extracted_inventory = []

    while True:
        search_url = "[https://www.bigbasket.com/listing-svc/v2/products](https://www.bigbasket.com/listing-svc/v2/products)"
        params_step7 = {
            "type": "ps",
            "slug": brand_slug,
            "page": page,
            "bucket_id": bucket_id
        }
        
        resp = session.get(search_url, params=params_step7, headers=headers)
        if resp.status_code != 200:
            break
            
        data = resp.json()
        products = data.get("products", [])
        if not products:
            break
            
        new_items_found = False
        for p in products:
            p_id = p.get("id")
            brand_info = p.get("brand", {})
            b_name = brand_info.get("name", "")
            
            # Brand match & deduplication filter
            if target_brand.lower() in b_name.lower() or target_brand.lower() in p.get("desc", "").lower():
                if p_id and p_id not in seen_skus:
                    seen_skus.add(p_id)
                    new_items_found = True
                    
                    pricing = p.get("pricing", {}).get("discount", {})
                    prim_price = pricing.get("prim_price", {})
                    avail = p.get("availability", {})
                    badge = p.get("sku_badge") or {}
                    
                    extracted_inventory.append({
                        "product_id": p_id,
                        "brand": b_name,
                        "name": p.get("desc"),
                        "pack_size": p.get("w"),
                        "packaging": p.get("pack_desc"),
                        "selling_price": prim_price.get("sp"),
                        "mrp": pricing.get("mrp"),
                        "discount_text": pricing.get("d_text"),
                        "in_stock": avail.get("avail_status") == "001",
                        "stock_badge": badge.get("label", "in_stock"),
                        "url": "[https://www.bigbasket.com](https://www.bigbasket.com)" + p.get("absolute_url", ""),
                        "image": p.get("images", [{}])[0].get("s", "")
                    })
                    
        if not new_items_found:
            break
            
        page += 1
        time.sleep(random.uniform(1.2, 2.0))

    return {
        "status": "SUCCESS",
        "pincode": pincode,
        "coordinates": {"lat": lat, "lng": lng},
        "total_unique_skus": len(extracted_inventory),
        "products": extracted_inventory
    }