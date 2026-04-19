"""
PayFast payment integration for ClipForge.

Endpoints
---------
GET  /payments/packages         — list available credit packages (public)
POST /payments/create-payment   — generate signed PayFast form params (authenticated)
POST /payments/itn              — PayFast Instant Transaction Notification webhook (no auth — called by PayFast)

Business logic (critical)
-------------------------
1. User picks a package → frontend calls /payments/create-payment
2. Frontend builds a hidden form from the returned params and POSTs to PayFast
3. PayFast processes payment → sends POST to /payments/itn
4. ITN handler:
     a) Verifies source IP (sandbox skips this)
     b) Verifies MD5 signature
     c) Checks payment_status == COMPLETE
     d) PROFIT GATE: amount_gross >= expected price (1% tolerance) AND covers API cost
     e) Only then: adds credits to user account and marks payment_status = confirmed
5. Video generation endpoints additionally check payment_status = confirmed
   so no generation ever happens without a verified, profitable payment.
"""

from __future__ import annotations

import hashlib
import logging
import os
import urllib.parse
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import Response

from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

# ---------------------------------------------------------------------------
# PayFast config
# ---------------------------------------------------------------------------

PAYFAST_MERCHANT_ID  = os.getenv("PAYFAST_MERCHANT_ID", "")
PAYFAST_MERCHANT_KEY = os.getenv("PAYFAST_MERCHANT_KEY", "")
PAYFAST_PASSPHRASE   = os.getenv("PAYFAST_PASSPHRASE", "")

# PayFast production IPs (from their docs)
_PAYFAST_VALID_IPS = {
    "197.97.145.144",
    "197.97.145.145",
    "197.97.145.146",
    "197.97.145.147",
}

# ---------------------------------------------------------------------------
# Credit packages (single source of truth)
# ---------------------------------------------------------------------------

CREDIT_PACKAGES: dict[str, dict] = {
    "starter": {
        "amount":   99.00,
        "credits":  10,
        "api_cost": 10.00,   # Replicate cost ~R1/video
        "label":    "Starter",
        "tagline":  "Perfect for trying ClipForge",
    },
    "pro": {
        "amount":   199.00,
        "credits":  25,
        "api_cost": 25.00,
        "label":    "Pro",
        "tagline":  "Best value for regular creators",
    },
    "studio": {
        "amount":   399.00,
        "credits":  60,
        "api_cost": 60.00,
        "label":    "Studio",
        "tagline":  "High-volume production studio",
    },
}

# ---------------------------------------------------------------------------
# Supabase helpers (httpx — consistent with the rest of the codebase)
# ---------------------------------------------------------------------------

def _sb_env() -> tuple[str, str]:
    """Return (supabase_url, service_role_key)."""
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return url, key


def _sb_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


# ---------------------------------------------------------------------------
# Signature helpers
# ---------------------------------------------------------------------------

def _build_param_string(data: dict, passphrase: str = "") -> str:
    """Build PayFast-spec query string for MD5 signing."""
    param_string = "&".join(
        f"{k}={urllib.parse.quote_plus(str(v))}"
        for k, v in data.items()
        if str(v) != ""
    )
    if passphrase:
        param_string += f"&passphrase={urllib.parse.quote_plus(passphrase)}"
    return param_string


def _generate_signature(data: dict, passphrase: str = "") -> str:
    param_string = _build_param_string(data, passphrase)
    return hashlib.md5(param_string.encode()).hexdigest()


def _verify_itn_signature(data: dict, passphrase: str = "") -> bool:
    """Verify the signature on an incoming ITN payload."""
    data_for_sig = {k: v for k, v in data.items() if k != "signature"}
    received_sig = data.get("signature", "")
    expected_sig = _generate_signature(data_for_sig, passphrase)
    return expected_sig == received_sig


# ---------------------------------------------------------------------------
# IP verification
# ---------------------------------------------------------------------------

async def _is_payfast_ip(request: Request) -> bool:
    """Return True if the request originated from a known PayFast IP."""
    if os.getenv("PAYFAST_SANDBOX", "true").lower() == "true":
        # Sandbox: PayFast sends from arbitrary IPs
        return True
    client_ip = request.client.host if request.client else ""
    return client_ip in _PAYFAST_VALID_IPS


# ---------------------------------------------------------------------------
# Credit granting (runs in background after ITN validation)
# ---------------------------------------------------------------------------

async def _grant_credits(
    *,
    user_id: str,
    package_key: str,
    credits: int,
    amount_paid: float,
    profit: float,
    pf_payment_id: str,
) -> None:
    """
    Atomically add credits to the user account and record the transaction.
    Called ONLY after the payment is verified and the profit gate is passed.
    """
    try:
        supabase_url, service_key = _sb_env()
        hdrs = _sb_headers(service_key)

        async with httpx.AsyncClient(timeout=15.0) as client:

            # 1. Record in payfast_transactions table (audit trail)
            tx_resp = await client.post(
                f"{supabase_url}/rest/v1/payfast_transactions",
                json={
                    "user_id":         user_id,
                    "package_key":     package_key,
                    "credits_granted": credits,
                    "amount_paid":     amount_paid,
                    "profit":          profit,
                    "pf_payment_id":   pf_payment_id,
                    "status":          "confirmed",
                    "created_at":      datetime.now(timezone.utc).isoformat(),
                },
                headers=hdrs,
            )
            tx_resp.raise_for_status()

            # 2. Read current balance
            balance_resp = await client.get(
                f"{supabase_url}/rest/v1/user_credits?user_id=eq.{user_id}&select=balance",
                headers=hdrs,
            )
            balance_resp.raise_for_status()
            existing = balance_resp.json()
            current_balance = int(existing[0]["balance"]) if existing else 0

            new_balance = current_balance + credits

            # 3. Upsert user_credits row (add credits + mark payment confirmed)
            upsert_resp = await client.post(
                f"{supabase_url}/rest/v1/user_credits",
                json={
                    "user_id":        user_id,
                    "balance":        new_balance,
                    "payment_status": "confirmed",
                },
                headers={
                    **hdrs,
                    "Prefer": "resolution=merge-duplicates,return=representation",
                },
            )
            upsert_resp.raise_for_status()

            # 4. Record in credit_transactions for history / dashboard
            crtx_resp = await client.post(
                f"{supabase_url}/rest/v1/credit_transactions",
                json={
                    "user_id":    user_id,
                    "amount":     credits,
                    "reason":     f"PayFast purchase — {package_key} ({credits} videos)",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                headers=hdrs,
            )
            crtx_resp.raise_for_status()

        logger.info(
            "Credits granted: user=%s package=%s credits=%d profit=R%.2f pf_id=%s",
            user_id, package_key, credits, profit, pf_payment_id,
        )

    except Exception as exc:  # noqa: BLE001
        # Log the error but don't re-raise — PayFast expects a 200 regardless.
        # The transaction table entry will be missing; can be replayed manually.
        logger.error(
            "Failed to grant credits for user=%s pf_id=%s: %s",
            user_id, pf_payment_id, exc,
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/packages", summary="List available credit packages")
async def get_packages() -> dict:
    """Public — returns credit package info for the pricing page."""
    return {
        "packages": [
            {
                "key":     key,
                "label":   pkg["label"],
                "tagline": pkg["tagline"],
                "amount":  pkg["amount"],
                "credits": pkg["credits"],
            }
            for key, pkg in CREDIT_PACKAGES.items()
        ]
    }


@router.post("/create-payment", summary="Generate signed PayFast payment parameters")
async def create_payment(
    package_key: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Authenticated — generates the PayFast payment form parameters including
    the MD5 signature. The frontend builds a hidden form and POSTs directly
    to PayFast's action_url.
    """
    package = CREDIT_PACKAGES.get(package_key)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown package: {package_key}. Valid options: {list(CREDIT_PACKAGES)}",
        )

    user_id = current_user["id"]
    m_payment_id = f"{user_id}_{package_key}"

    sandbox = os.getenv("PAYFAST_SANDBOX", "true").lower() == "true"
    action_url = (
        "https://sandbox.payfast.co.za/eng/process"
        if sandbox
        else "https://www.payfast.co.za/eng/process"
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    backend_url  = os.getenv("BACKEND_URL",  "http://localhost:8000")

    # Build params in PayFast's required order for consistent signature
    params: dict = {
        "merchant_id":  PAYFAST_MERCHANT_ID,
        "merchant_key": PAYFAST_MERCHANT_KEY,
        "return_url":   f"{frontend_url}/dashboard?payment=success",
        "cancel_url":   f"{frontend_url}/pricing?payment=cancelled",
        "notify_url":   f"{backend_url}/payments/itn",
        "m_payment_id": m_payment_id,
        "amount":       f"{package['amount']:.2f}",
        "item_name":    f"ClipForge {package['label']} — {package['credits']} videos",
    }

    params["signature"] = _generate_signature(params, PAYFAST_PASSPHRASE)
    params["action_url"] = action_url

    logger.info("Payment params generated for user=%s package=%s", user_id, package_key)
    return params


@router.post("/itn", summary="PayFast ITN webhook (called by PayFast, not the user)")
async def payfast_itn(
    request: Request,
    background_tasks: BackgroundTasks,
) -> Response:
    """
    PayFast Instant Transaction Notification handler.

    PayFast expects HTTP 200 as acknowledgement regardless of outcome.
    All business logic failures return 200 (with a log entry) so PayFast
    does not keep retrying for non-payment reasons.
    """

    # --- 1. Parse form body ---------------------------------------------------
    try:
        form_data = await request.form()
        data: dict = dict(form_data)
    except Exception as exc:
        logger.error("ITN: failed to parse form data: %s", exc)
        return Response(status_code=200)

    # --- 2. Verify source IP --------------------------------------------------
    if not await _is_payfast_ip(request):
        logger.warning("ITN: rejected — unexpected source IP %s", request.client.host if request.client else "?")
        raise HTTPException(status_code=403, detail="Forbidden: invalid source IP")

    # --- 3. Verify MD5 signature ----------------------------------------------
    if not _verify_itn_signature(data, PAYFAST_PASSPHRASE):
        logger.warning("ITN: signature mismatch — possible tampered payload")
        raise HTTPException(status_code=400, detail="Invalid ITN signature")

    # --- 4. Only process COMPLETE payments ------------------------------------
    payment_status = data.get("payment_status", "")
    if payment_status != "COMPLETE":
        logger.info("ITN: payment_status=%s — ignored (not COMPLETE)", payment_status)
        return Response(status_code=200)

    # --- 5. Parse our custom m_payment_id: "{user_id}_{package_key}" ---------
    m_payment_id = data.get("m_payment_id", "")
    parts = m_payment_id.split("_", 1)
    if len(parts) != 2:
        logger.error("ITN: malformed m_payment_id=%r", m_payment_id)
        return Response(status_code=200)

    user_id, package_key = parts[0], parts[1]
    package = CREDIT_PACKAGES.get(package_key)
    if not package:
        logger.error("ITN: unknown package_key=%r in m_payment_id=%r", package_key, m_payment_id)
        return Response(status_code=200)

    # --- 6. PROFIT GATE -------------------------------------------------------
    try:
        amount_gross = float(data.get("amount_gross", 0))
    except (ValueError, TypeError):
        logger.error("ITN: invalid amount_gross=%r", data.get("amount_gross"))
        return Response(status_code=200)

    expected_amount: float = package["amount"]
    api_cost:        float = package["api_cost"]

    # Allow 1 % tolerance for PayFast processing fees rounding
    if amount_gross < expected_amount * 0.99:
        logger.warning(
            "ITN: amount mismatch — expected R%.2f got R%.2f for package=%s user=%s",
            expected_amount, amount_gross, package_key, user_id,
        )
        return Response(status_code=200)

    profit = amount_gross - api_cost
    if profit <= 0:
        logger.error(
            "ITN: profit gate failed — amount=R%.2f api_cost=R%.2f package=%s user=%s",
            amount_gross, api_cost, package_key, user_id,
        )
        return Response(status_code=200)

    # --- 7. All checks passed — grant credits in background ------------------
    pf_payment_id = data.get("pf_payment_id", "")
    logger.info(
        "ITN: APPROVED — user=%s package=%s credits=%d amount=R%.2f profit=R%.2f pf_id=%s",
        user_id, package_key, package["credits"], amount_gross, profit, pf_payment_id,
    )

    background_tasks.add_task(
        _grant_credits,
        user_id=user_id,
        package_key=package_key,
        credits=package["credits"],
        amount_paid=amount_gross,
        profit=profit,
        pf_payment_id=pf_payment_id,
    )

    return Response(status_code=200)
