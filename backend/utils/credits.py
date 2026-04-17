"""
Credit management using Supabase REST API (httpx).

Schema assumptions
------------------
Table: user_credits
  user_id         TEXT PRIMARY KEY
  balance         INTEGER NOT NULL DEFAULT 0
  payment_status  TEXT DEFAULT 'pending'   -- 'pending' | 'confirmed'

Table: credit_transactions
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY
  user_id    TEXT NOT NULL
  amount     INTEGER NOT NULL   -- positive = add, negative = deduct
  reason     TEXT NOT NULL
  created_at TIMESTAMPTZ DEFAULT now()
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Credit cost registry
# ---------------------------------------------------------------------------
CREDIT_COSTS: dict[str, int] = {
    "text2video_5s_standard": 10,
    "text2video_10s_pro": 25,
    "image2video": 15,
    "lipsync": 20,
}

# ---------------------------------------------------------------------------
# Demo mode in-memory store
# ---------------------------------------------------------------------------

_DEMO_CREDITS: dict[str, int] = {"demo-user-id": 50}
_DEMO_CREDITS_USED: dict[str, int] = {"demo-user-id": 0}


def _is_demo() -> bool:
    return os.environ.get("DEMO_MODE", "").lower() == "true"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _env_supabase() -> tuple[str, str]:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return url, key


def _headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_credit_balance(user_id: str) -> int:
    """Return the current credit balance for *user_id*."""
    if _is_demo():
        return _DEMO_CREDITS.get(user_id, 50)

    supabase_url, service_key = _env_supabase()
    url = f"{supabase_url}/rest/v1/user_credits?user_id=eq.{user_id}&select=balance"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=_headers(service_key))
        resp.raise_for_status()
        data = resp.json()

    if not data:
        # User record not yet created — treat as zero balance
        return 0
    return int(data[0].get("balance", 0))


def get_credits_used(user_id: str) -> int:
    """Return total credits used (demo mode only; returns 0 in production)."""
    if _is_demo():
        return _DEMO_CREDITS_USED.get(user_id, 0)
    return 0


async def check_payment_confirmed(user_id: str) -> bool:
    """
    Return True if the user's payment_status is 'confirmed'.

    In DEMO_MODE this always returns True so generation still works locally.
    In production, a user must have completed a PayFast purchase first.
    """
    if _is_demo():
        return True

    supabase_url, service_key = _env_supabase()
    url = f"{supabase_url}/rest/v1/user_credits?user_id=eq.{user_id}&select=payment_status"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=_headers(service_key))
        resp.raise_for_status()
        data = resp.json()

    if not data:
        return False
    return data[0].get("payment_status") == "confirmed"


async def deduct_credits(user_id: str, amount: int, reason: str) -> bool:
    """
    Deduct *amount* credits from *user_id* and record the transaction.

    Raises HTTPException 402 if the balance is insufficient.
    Returns True on success.
    """
    if _is_demo():
        balance = _DEMO_CREDITS.get(user_id, 50)
        if balance < amount:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits: need {amount}, have {balance}",
            )
        _DEMO_CREDITS[user_id] = balance - amount
        _DEMO_CREDITS_USED[user_id] = _DEMO_CREDITS_USED.get(user_id, 0) + amount
        logger.info("[DEMO] Deducted %d credits from %s. New balance: %d", amount, user_id, _DEMO_CREDITS[user_id])
        return True

    supabase_url, service_key = _env_supabase()
    hdrs = _headers(service_key)

    # 1. Verify sufficient balance
    balance = await get_credit_balance(user_id)
    if balance < amount:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits: need {amount}, have {balance}",
        )

    # 2. Decrement balance using RPC to avoid race conditions
    #    Supabase doesn't support UPDATE … WHERE with arithmetic in the REST API
    #    natively; we use a raw RPC call OR a conditional update.
    #    Here we do a PATCH with the new computed balance.
    new_balance = balance - amount
    async with httpx.AsyncClient(timeout=10.0) as client:
        patch_url = f"{supabase_url}/rest/v1/user_credits?user_id=eq.{user_id}"
        resp = await client.patch(
            patch_url,
            json={"balance": new_balance},
            headers=hdrs,
        )
        resp.raise_for_status()

        # 3. Insert transaction record
        tx_url = f"{supabase_url}/rest/v1/credit_transactions"
        tx_resp = await client.post(
            tx_url,
            json={
                "user_id": user_id,
                "amount": -amount,
                "reason": reason,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            headers=hdrs,
        )
        tx_resp.raise_for_status()

    logger.info("Deducted %d credits from %s (reason: %s)", amount, user_id, reason)
    return True


async def add_credits(user_id: str, amount: int, reason: str) -> bool:
    """
    Add *amount* credits to *user_id* and record the transaction.

    Creates the user_credits row if it doesn't exist yet (upsert).
    Returns True on success.
    """
    if _is_demo():
        _DEMO_CREDITS[user_id] = _DEMO_CREDITS.get(user_id, 0) + amount
        logger.info("[DEMO] Added %d credits to %s. New balance: %d", amount, user_id, _DEMO_CREDITS[user_id])
        return True

    supabase_url, service_key = _env_supabase()
    hdrs = _headers(service_key)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Upsert: if the row exists increment; if not, create with amount
        upsert_url = f"{supabase_url}/rest/v1/user_credits"
        current = await get_credit_balance(user_id)
        new_balance = current + amount

        upsert_resp = await client.post(
            upsert_url,
            json={"user_id": user_id, "balance": new_balance},
            headers={**hdrs, "Prefer": "resolution=merge-duplicates,return=representation"},
        )
        upsert_resp.raise_for_status()

        # Insert transaction record
        tx_url = f"{supabase_url}/rest/v1/credit_transactions"
        tx_resp = await client.post(
            tx_url,
            json={
                "user_id": user_id,
                "amount": amount,
                "reason": reason,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            headers=hdrs,
        )
        tx_resp.raise_for_status()

    logger.info("Added %d credits to %s (reason: %s)", amount, user_id, reason)
    return True


async def check_sufficient_credits(user_id: str, required: int) -> bool:
    """Return True if the user has at least *required* credits."""
    balance = await get_credit_balance(user_id)
    return balance >= required
