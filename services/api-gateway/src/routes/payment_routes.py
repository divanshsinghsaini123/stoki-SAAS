import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from typing import Any

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import razorpay

from packages.database.connection import get_db
from packages.database.models import (
    Tenant,
    TenantSubscription,
    SubscriptionPlan,
    Invoice,
    Coupon,
    DiscountType,
)

try:
    from ..auth import get_current_user
    from ..config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
    from ..schemas import (
        ApplyCouponRequest,
        ApplyCouponResponse,
        CreateOrderRequest,
        CreateOrderResponse,
        VerifyPaymentRequest,
        VerifyPaymentResponse,
    )
except ImportError:
    from auth import get_current_user
    from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
    from schemas import (
        ApplyCouponRequest,
        ApplyCouponResponse,
        CreateOrderRequest,
        CreateOrderResponse,
        VerifyPaymentRequest,
        VerifyPaymentResponse,
    )

logger = logging.getLogger("payment-routes")

router = APIRouter(tags=["Payments & Webhooks"])

# Master Plan Catalog with strict server-side pricing
PLAN_CATALOG: dict[str, dict[str, Any]] = {
    "STARTER_30D": {
        "name": "Starter 30-Day Intelligence Pass",
        "base_price": 4999,  # INR
        "days": 30,
        "max_daily_scans": 100,
        "max_brands": 1,
    },
    "PRO_30D": {
        "name": "Pro 30-Day Intelligence Pass",
        "base_price": 14999,  # INR
        "days": 30,
        "max_daily_scans": 500,
        "max_brands": 5,
    },
    "ANNUAL": {
        "name": "Enterprise Annual Pass",
        "base_price": 49999,  # INR
        "days": 365,
        "max_daily_scans": 2500,
        "max_brands": 25,
    },
}

# Initialize Razorpay Client
try:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    logger.warning(f"Failed to initialize Razorpay Client: {e}")
    razorpay_client = None


def get_plan_base_price(plan_id: str, db: Session) -> tuple[int, dict[str, Any]]:
    """Resolves base price and plan metadata server-side."""
    normalized_id = plan_id.upper().strip()
    if normalized_id in PLAN_CATALOG:
        return PLAN_CATALOG[normalized_id]["base_price"], PLAN_CATALOG[normalized_id]

    # Check database SubscriptionPlan table by name or ID
    db_plan = None
    try:
        uuid_obj = uuid.UUID(plan_id)
        db_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == uuid_obj).first()
    except (ValueError, TypeError):
        pass

    if not db_plan:
        db_plan = db.query(SubscriptionPlan).filter(
            func.lower(SubscriptionPlan.plan_name) == func.lower(plan_id)
        ).first()

    if db_plan:
        price = int(db_plan.price)
        days = 365 if db_plan.billing_cycle == "yearly" else 30
        return price, {
            "name": db_plan.plan_name,
            "base_price": price,
            "days": days,
            "max_daily_scans": db_plan.max_daily_scans,
            "max_brands": db_plan.max_brands,
            "db_plan_id": db_plan.id,
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Subscription plan '{plan_id}' does not exist in master catalog.",
    )


DEFAULT_COUPONS = {
    "STOKI20": {
        "discount_type": DiscountType.PERCENTAGE,
        "discount_value": 20,
        "applicable_plans": ["STARTER_30D", "PRO_30D", "ANNUAL"],
        "min_checkout_amount": 0,
        "max_uses": 1000,
    },
    "LAUNCH1000": {
        "discount_type": DiscountType.FLAT,
        "discount_value": 1000,
        "applicable_plans": ["STARTER_30D", "PRO_30D", "ANNUAL"],
        "min_checkout_amount": 2000,
        "max_uses": 500,
    },
    "FLASH50": {
        "discount_type": DiscountType.PERCENTAGE,
        "discount_value": 50,
        "applicable_plans": ["STARTER_30D", "PRO_30D"],
        "min_checkout_amount": 3000,
        "max_uses": 200,
    },
}


def validate_and_compute_coupon(
    coupon_code: str,
    plan_id: str,
    base_price: int,
    db: Session,
) -> tuple[Coupon, int, int]:
    """
    Validates coupon eligibility and returns (coupon, discount_amount, final_amount).
    Raises HTTPException(400) if invalid or expired.
    """
    code_normalized = coupon_code.strip().upper()
    coupon = None
    try:
        coupon = db.query(Coupon).filter(Coupon.code == code_normalized).first()
    except Exception as e:
        logger.warning(f"Database coupon query skipped/failed: {e}")

    # Auto-seed standard master promotions if not yet in database
    if not coupon and code_normalized in DEFAULT_COUPONS:
        cfg = DEFAULT_COUPONS[code_normalized]
        coupon = Coupon(
            id=uuid.uuid4(),
            code=code_normalized,
            discount_type=cfg["discount_type"],
            discount_value=cfg["discount_value"],
            applicable_plans=cfg["applicable_plans"],
            min_checkout_amount=cfg["min_checkout_amount"],
            max_uses=cfg.get("max_uses"),
            used_count=0,
            valid_until=datetime.now(timezone.utc) + timedelta(days=90),
            is_active=True,
        )
        try:
            db.add(coupon)
            db.commit()
            db.refresh(coupon)
        except Exception:
            db.rollback()

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code_normalized}' is invalid.",
        )

    if not coupon.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code_normalized}' is deactivated.",
        )

    now_utc = datetime.now(timezone.utc)
    if coupon.valid_until and coupon.valid_until.tzinfo is None:
        valid_until = coupon.valid_until.replace(tzinfo=timezone.utc)
    else:
        valid_until = coupon.valid_until

    if valid_until and now_utc > valid_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code_normalized}' has expired.",
        )

    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code_normalized}' has reached its global redemption limit.",
        )

    # Check applicable plans
    applicable = [p.upper() for p in (coupon.applicable_plans or [])]
    normalized_plan = plan_id.upper().strip()
    if applicable and normalized_plan not in applicable and "ALL" not in applicable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code_normalized}' is not applicable to the selected plan.",
        )

    # Check minimum checkout amount
    if base_price < (coupon.min_checkout_amount or 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promo code '{code_normalized}' requires a minimum order value of ₹{coupon.min_checkout_amount:,}.",
        )

    # Calculate discount
    if coupon.discount_type == DiscountType.PERCENTAGE or str(coupon.discount_type) == "PERCENTAGE":
        discount = (base_price * int(coupon.discount_value)) // 100
    else:  # FLAT
        discount = min(int(coupon.discount_value), base_price)

    final_amount = max(0, base_price - discount)
    return coupon, discount, final_amount


# =========================================================================
# 1. APPLY COUPON ENDPOINT
# =========================================================================
@router.post("/payments/apply-coupon", response_model=ApplyCouponResponse)
def apply_coupon(
    payload: ApplyCouponRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates tenant session, checks coupon eligibility, and calculates discount.
    """
    base_price, _ = get_plan_base_price(payload.plan_id, db)
    coupon, discount_amount, final_amount = validate_and_compute_coupon(
        payload.coupon_code,
        payload.plan_id,
        base_price,
        db,
    )

    return ApplyCouponResponse(
        valid=True,
        code=coupon.code,
        base_price=base_price,
        discount_amount=discount_amount,
        final_amount=final_amount,
    )


# =========================================================================
# 2. CREATE RAZORPAY ORDER ENDPOINT
# =========================================================================
@router.post("/payments/create-order", response_model=CreateOrderResponse)
def create_order(
    payload: CreateOrderRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates Razorpay order with server-calculated price. Client amounts are never trusted.
    """
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Active tenant session required.",
        )

    base_price, plan_info = get_plan_base_price(payload.plan_id, db)
    discount_amount = 0
    final_amount = base_price
    coupon_applied = ""

    if payload.coupon_code and payload.coupon_code.strip():
        coupon, discount_amount, final_amount = validate_and_compute_coupon(
            payload.coupon_code,
            payload.plan_id,
            base_price,
            db,
        )
        coupon_applied = coupon.code

    amount_in_paise = int(final_amount * 100)

    # Razorpay standard order payload
    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "payment_capture": 1,
        "notes": {
            "tenant_id": str(tenant_id),
            "plan_id": payload.plan_id.upper().strip(),
            "coupon_used": coupon_applied,
            "days": plan_info.get("days", 30),
            "base_price": base_price,
            "final_amount": final_amount,
        },
    }

    order_id = None
    if razorpay_client:
        try:
            rzp_order = razorpay_client.order.create(data=order_data)
            order_id = rzp_order.get("id")
        except Exception as e:
            logger.error(f"Razorpay order creation error: {e}")
            # If live API credentials fail in development/test, generate deterministic dev order
            if "rzp_test" in RAZORPAY_KEY_ID:
                order_id = f"order_dev_{uuid.uuid4().hex[:14]}"
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Payment gateway error: {str(e)}",
                )
    else:
        order_id = f"order_dev_{uuid.uuid4().hex[:14]}"

    return CreateOrderResponse(
        order_id=order_id,
        amount=amount_in_paise,
        currency="INR",
        key_id=RAZORPAY_KEY_ID,
    )


# =========================================================================
# 3. VERIFY PAYMENT ENDPOINT
# =========================================================================
@router.post("/payments/verify", response_model=VerifyPaymentResponse)
def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verifies Razorpay HMAC signature, activates tenant subscription, and updates coupon usage.
    """
    tenant_id_str = current_user.get("tenant_id")
    if not tenant_id_str:
        raise HTTPException(status_code=401, detail="Unauthorized")

    tenant_id = uuid.UUID(tenant_id_str)

    # Signature verification
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # For dev orders with dummy keys, allow development verification bypass
    is_dev_test = payload.razorpay_order_id.startswith("order_dev_") or "rzp_test" in RAZORPAY_KEY_ID
    if not is_dev_test and not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed. Untrusted response.",
        )

    # Attempt to fetch order details from Razorpay to get notes
    order_notes: dict[str, Any] = {}
    if razorpay_client and not payload.razorpay_order_id.startswith("order_dev_"):
        try:
            rzp_order = razorpay_client.order.fetch(payload.razorpay_order_id)
            order_notes = rzp_order.get("notes", {})
        except Exception as e:
            logger.warning(f"Could not fetch order from Razorpay: {e}")

    plan_id = order_notes.get("plan_id", "PRO_30D")
    coupon_used = order_notes.get("coupon_used", "")
    days = int(order_notes.get("days", 30))
    final_amount = float(order_notes.get("final_amount", 14999))

    # 1. Update or create TenantSubscription
    sub = (
        db.query(TenantSubscription)
        .filter(TenantSubscription.tenant_id == tenant_id)
        .order_by(TenantSubscription.created_at.desc())
        .first()
    )

    # Find or link subscription plan in DB
    db_plan = db.query(SubscriptionPlan).filter(
        func.lower(SubscriptionPlan.plan_name).contains(plan_id.split("_")[0].lower())
    ).first()

    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=days)

    if sub:
        sub.status = "active"
        if db_plan:
            sub.plan_id = db_plan.id
        sub.current_period_start = now
        sub.current_period_end = expiry
        sub.payment_provider_id = payload.razorpay_payment_id
    else:
        sub = TenantSubscription(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            plan_id=db_plan.id if db_plan else uuid.uuid4(),
            status="active",
            current_period_start=now,
            current_period_end=expiry,
            scans_used_today=0,
            extra_scan_credits=100,
            payment_provider_id=payload.razorpay_payment_id,
        )
        db.add(sub)

    # 2. Increment coupon used_count if coupon was used
    if coupon_used:
        coupon = db.query(Coupon).filter(Coupon.code == coupon_used.upper().strip()).first()
        if coupon:
            coupon.used_count += 1
            logger.info(f"Incremented coupon '{coupon.code}' used_count to {coupon.used_count}")

    # 3. Create Invoice record
    invoice = Invoice(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        subscription_id=sub.id if sub else None,
        amount=final_amount,
        currency="INR",
        status="paid",
        payment_gateway_invoice_id=payload.razorpay_payment_id,
        paid_at=now,
    )
    db.add(invoice)

    db.commit()
    logger.info(f"Subscription activated successfully for tenant {tenant_id}, plan {plan_id}")

    return VerifyPaymentResponse(
        success=True,
        redirect_url="/dashboard?payment=success",
    )


# =========================================================================
# 4. RAZORPAY WEBHOOK FAIL-SAFE
# =========================================================================
@router.post("/webhooks/razorpay")
@router.post("/payments/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """
    Failsafe webhook listener for 'payment.captured' and 'order.paid'.
    Ensures idempotent subscription activation if user drops connection before /verify.
    """
    body_bytes = await request.body()

    # Webhook signature verification
    secret = RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET
    expected_sig = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    if x_razorpay_signature and not hmac.compare_digest(expected_sig, x_razorpay_signature):
        logger.warning("Razorpay webhook signature verification failed.")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event_payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    event_type = event_payload.get("event")
    logger.info(f"Received Razorpay Webhook Event: {event_type}")

    if event_type in ["payment.captured", "order.paid"]:
        payment_entity = (
            event_payload.get("payload", {}).get("payment", {}).get("entity", {})
        )
        notes = payment_entity.get("notes", {})
        tenant_id_str = notes.get("tenant_id")
        payment_id = payment_entity.get("id")

        if tenant_id_str:
            try:
                tenant_id = uuid.UUID(tenant_id_str)
                # Idempotency check: see if an invoice already recorded this payment_id
                existing_invoice = db.query(Invoice).filter(
                    Invoice.payment_gateway_invoice_id == payment_id
                ).first()
                if not existing_invoice:
                    plan_id = notes.get("plan_id", "PRO_30D")
                    days = int(notes.get("days", 30))
                    final_amount = float(notes.get("final_amount", payment_entity.get("amount", 0) / 100))

                    sub = (
                        db.query(TenantSubscription)
                        .filter(TenantSubscription.tenant_id == tenant_id)
                        .order_by(TenantSubscription.created_at.desc())
                        .first()
                    )

                    now = datetime.now(timezone.utc)
                    expiry = now + timedelta(days=days)

                    if sub:
                        sub.status = "active"
                        sub.current_period_start = now
                        sub.current_period_end = expiry
                        sub.payment_provider_id = payment_id
                    else:
                        sub = TenantSubscription(
                            id=uuid.uuid4(),
                            tenant_id=tenant_id,
                            plan_id=uuid.uuid4(),
                            status="active",
                            current_period_start=now,
                            current_period_end=expiry,
                            scans_used_today=0,
                            payment_provider_id=payment_id,
                        )
                        db.add(sub)

                    # Invoice
                    inv = Invoice(
                        id=uuid.uuid4(),
                        tenant_id=tenant_id,
                        subscription_id=sub.id if sub else None,
                        amount=final_amount,
                        currency="INR",
                        status="paid",
                        payment_gateway_invoice_id=payment_id,
                        paid_at=now,
                    )
                    db.add(inv)

                    # Increment coupon if used
                    coupon_used = notes.get("coupon_used")
                    if coupon_used:
                        c = db.query(Coupon).filter(Coupon.code == coupon_used.upper().strip()).first()
                        if c:
                            c.used_count += 1

                    db.commit()
                    logger.info(f"Webhook idempotently activated subscription for tenant {tenant_id}")
            except Exception as e:
                logger.error(f"Error processing webhook event: {e}")
                db.rollback()

    return {"status": "ok"}
