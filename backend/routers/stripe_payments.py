"""
Stripe payment integration for ClipForge — global / USD.

Endpoints
---------
GET  /payments/stripe/packages          — list USD credit packages (public)
POST /payments/stripe/create-checkout   — create Stripe Checkout Session (authenticated)
POST /payments/stripe/webhook           — Stripe webhook: checkout.session.completed
POST /payments/stripe/redeem-appsumo    — redeem an AppSumo LTD code (authenticated)

Payment flow
------------
1. User picks a package → POST /payments/stripe/create-checkout
2. Backend creates a Stripe Checkout Session and returns {checkout_url}
3. Frontend redirects to checkout_url (Stripe-hosted page)
4. Stripe processes payment → POST /payments/stripe/webhook
5. Webhook verifies signature → grants credits → marks payment_status = confirmed

AppSumo LTD redemption flow
----------------------------
1. User signs up on ClipForge
2. User navigates to /redeem, enters their AppSumo code
3. POST /payments/stripe/redeem-appsumo validates the code against Supabase
4. If valid & unredeemed → grant LTD credits + mark code as redeemed
5. User's account is now an LTD account with appropriate credits

AppSumo LTD tiers (design)
---------------------------
  Tier 1 — 1 code  ($49)  → 2 400 credits  (50 credits × 48 months)
  Tier 2 — 2 codes ($98)  → 7 200 credits  (150 credits × 48 months)
  Tier 3 — 3 codes ($147) → 24 000 credits (500 credits × 48 months)

  Stack codes: each additional code adds the Tier-1 credit block.
  The /redeem endpoint accumulates codes on the same account.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx
import stripe
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from fastapi.responses import Response
from pydantic import BaseModel

from routers.auth import get_current_user
from utils.credits import add_credits

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments/stripe", tags=["Stripe Payments"])

# ---------------------------------------------------------------------------
# Stripe config
# ---------------------------------------------------------------------------

STRIPE_SECRET_KEY      = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET  = os.getenv("STRIPE_WEBHOOK_SECRET", "")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# ---------------------------------------------------------------------------
# USD credit packages (shown on the global / international pricing page)
# ---------------------------------------------------------------------------

USD_PACKAGES: dict[str, dict] = {
    "starter": {
        "price_cents": 900,      # $9.00
        "credits": 100,
        "label": "Starter",
        "tagline": "Perfect for trying ClipForge",
    },
    "pro": {
        "price_cents": 2900,     # $29.00
        "credits": 350,
        "label": "Pro",
        "tagline": "Best value for regular creators",
    },
    "studio": {
        "price_cents": 7900,     # $79.00
        "credits": 1000,
        "label": "Studio",
        "tagline": "High-volume production studio",
    },
}

# ---------------------------------------------------------------------------
# AppSumo LTD — credits granted per code redeemed
# ---------------------------------------------------------------------------

# 50 credits/month × 48 months = 2 400 lifetime credits per code.
# Customers can stack codes (buy 2–3 codes for more credits).
APPSUMO_CREDITS_PER_CODE = 2_400

# ---------------------------------------------------------------------------
# Supabase helpers (consistent with the rest of the codebase)
# ---------------------------------------------------------------------------

def _sb_env() -> tuple[str, str]:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return url, key


def _sb_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


# ---------------------------------------------------------------------------
# GET /packages
# ---------------------------------------------------------------------------

@router.get("/packages", summary="List USD credit packages")
async def get_packages() -> dict:
    """Public — returns USD credit packages for the international pricing page."""
    return {
        "currency": "usd",
        "packages": [
            {
                "key":         key,
                "label":       pkg["label"],
                "tagline":     pkg["tagline"],
                "price_cents": pkg["price_cents"],
                "price_usd":   pkg["price_cents"] / 100,
                "credits":     pkg["credits"],
            }
            for key, pkg in USD_PACKAGES.items()
        ],
    }


# ---------------------------------------------------------------------------
# POST /create-checkout
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    package_key: str


@router.post("/create-checkout", summary="Create a Stripe Checkout Session")
async def create_checkout(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Returns {checkout_url} — frontend redirects the user there.
    Stripe handles the card form, 3DS, etc.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe payments are not configured on this server.",
        )

    package = USD_PACKAGES.get(body.package_key)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown package '{body.package_key}'. Valid: {list(USD_PACKAGES)}",
        )

    user_id    = current_user["id"]
    user_email = current_user.get("email", "")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": package["price_cents"],
                        "product_data": {
                            "name": f"ClipForge {package['label']} — {package['credits']} credits",
                            "description": package["tagline"],
                        },
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            customer_email=user_email or None,
            metadata={
                "user_id":     user_id,
                "package_key": body.package_key,
                "credits":     str(package["credits"]),
            },
            success_url=f"{frontend_url}/dashboard?payment=success&method=stripe",
            cancel_url=f"{frontend_url}/pricing?payment=cancelled",
        )
    except stripe.StripeError as exc:
        logger.error("Stripe checkout error for user=%s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc

    logger.info(
        "Stripe checkout created: user=%s package=%s session=%s",
        user_id, body.package_key, session.id,
    )
    return {"checkout_url": session.url}


# ---------------------------------------------------------------------------
# POST /webhook  (called by Stripe, not the user)
# ---------------------------------------------------------------------------

@router.post("/webhook", summary="Stripe webhook — checkout.session.completed")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    stripe_signature: str = Header(None, alias="stripe-signature"),
) -> Response:
    """
    Stripe posts events here. We only act on checkout.session.completed.
    Always returns 200 so Stripe does not retry for logic errors.
    """
    body = await request.body()

    if not STRIPE_WEBHOOK_SECRET:
        logger.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set")
        return Response(status_code=200)

    try:
        event = stripe.Webhook.construct_event(
            body, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except stripe.SignatureVerificationError as exc:
        logger.warning("Stripe webhook signature invalid: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc
    except Exception as exc:
        logger.error("Stripe webhook parse error: %s", exc)
        return Response(status_code=200)

    if event["type"] != "checkout.session.completed":
        return Response(status_code=200)

    session_obj = event["data"]["object"]
    payment_status = session_obj.get("payment_status")

    if payment_status != "paid":
        logger.info("Stripe webhook: session %s not paid (%s)", session_obj.get("id"), payment_status)
        return Response(status_code=200)

    metadata   = session_obj.get("metadata", {})
    user_id    = metadata.get("user_id", "")
    package_key = metadata.get("package_key", "")
    credits     = int(metadata.get("credits", 0))

    if not user_id or credits <= 0:
        logger.error("Stripe webhook: missing metadata in session %s", session_obj.get("id"))
        return Response(status_code=200)

    logger.info(
        "Stripe webhook APPROVED: user=%s package=%s credits=%d session=%s",
        user_id, package_key, credits, session_obj.get("id"),
    )

    background_tasks.add_task(
        _grant_stripe_credits,
        user_id=user_id,
        package_key=package_key,
        credits=credits,
        stripe_session_id=session_obj.get("id", ""),
        amount_paid_cents=session_obj.get("amount_total", 0),
    )

    return Response(status_code=200)


async def _grant_stripe_credits(
    *,
    user_id: str,
    package_key: str,
    credits: int,
    stripe_session_id: str,
    amount_paid_cents: int,
) -> None:
    """Grant credits + mark payment confirmed after a successful Stripe payment."""
    try:
        supabase_url, service_key = _sb_env()
        hdrs = _sb_headers(service_key)

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Record in stripe_transactions audit table
            await client.post(
                f"{supabase_url}/rest/v1/stripe_transactions",
                json={
                    "user_id":          user_id,
                    "package_key":      package_key,
                    "credits_granted":  credits,
                    "amount_paid_cents": amount_paid_cents,
                    "stripe_session_id": stripe_session_id,
                    "status":           "confirmed",
                    "created_at":       datetime.now(timezone.utc).isoformat(),
                },
                headers=hdrs,
            )

            # Set payment_status = confirmed (enables video generation)
            await client.post(
                f"{supabase_url}/rest/v1/user_credits",
                json={
                    "user_id":        user_id,
                    "balance":        0,           # will be incremented below
                    "payment_status": "confirmed",
                },
                headers={
                    **hdrs,
                    "Prefer": "resolution=merge-duplicates,return=representation",
                },
            )

        # Use the shared credit utility to add balance + record transaction
        await add_credits(user_id, credits, f"Stripe purchase — {package_key} ({credits} credits)")

        logger.info(
            "Stripe credits granted: user=%s package=%s credits=%d session=%s",
            user_id, package_key, credits, stripe_session_id,
        )

    except Exception as exc:
        logger.error(
            "Failed to grant Stripe credits: user=%s session=%s error=%s",
            user_id, stripe_session_id, exc,
        )


# ---------------------------------------------------------------------------
# POST /redeem-appsumo  (AppSumo LTD code redemption)
# ---------------------------------------------------------------------------

class RedeemRequest(BaseModel):
    code: str


@router.post("/redeem-appsumo", summary="Redeem an AppSumo lifetime deal code")
async def redeem_appsumo(
    body: RedeemRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Validates an AppSumo LTD code and grants lifetime credits to the user.

    Each code grants 2,400 credits (50/month × 48 months).
    Users who bought multiple codes on AppSumo can redeem each code separately
    — credits stack on the same account.

    Codes must be pre-loaded into the `appsumo_codes` Supabase table by the admin.
    """
    user_id   = current_user["id"]
    code      = body.code.strip().upper()

    supabase_url, service_key = _sb_env()
    hdrs = _sb_headers(service_key)

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Look up the code
        resp = await client.get(
            f"{supabase_url}/rest/v1/appsumo_codes?code=eq.{code}&select=*",
            headers=hdrs,
        )
        resp.raise_for_status()
        rows = resp.json()

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Code not found. Double-check your AppSumo redemption code.",
            )

        row = rows[0]

        if row.get("redeemed_by"):
            if row["redeemed_by"] == user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You have already redeemed this code.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This code has already been redeemed by another account.",
            )

        # 2. Mark code as redeemed
        mark_resp = await client.patch(
            f"{supabase_url}/rest/v1/appsumo_codes?code=eq.{code}",
            json={
                "redeemed_by": user_id,
                "redeemed_at": datetime.now(timezone.utc).isoformat(),
            },
            headers=hdrs,
        )
        mark_resp.raise_for_status()

        # 3. Ensure payment_status = confirmed so they can generate
        await client.post(
            f"{supabase_url}/rest/v1/user_credits",
            json={
                "user_id":        user_id,
                "balance":        0,
                "payment_status": "confirmed",
                "account_type":   "ltd",
            },
            headers={
                **hdrs,
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
        )

    # 4. Grant credits (runs in background, same as Stripe path)
    background_tasks.add_task(
        add_credits,
        user_id,
        APPSUMO_CREDITS_PER_CODE,
        f"AppSumo LTD redemption — code {code}",
    )

    logger.info(
        "AppSumo code redeemed: user=%s code=%s credits_granted=%d",
        user_id, code, APPSUMO_CREDITS_PER_CODE,
    )

    return {
        "success": True,
        "credits_granted": APPSUMO_CREDITS_PER_CODE,
        "message": (
            f"Code redeemed! {APPSUMO_CREDITS_PER_CODE:,} lifetime credits have been "
            "added to your account. Welcome to ClipForge!"
        ),
    }
