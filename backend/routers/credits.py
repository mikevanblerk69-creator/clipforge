"""
Credit balance endpoints.

GET  /api/v1/credits          — return the authenticated user's credit balance
POST /api/v1/credits/deduct   — internal/admin endpoint to deduct credits
"""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status

from models.schemas import CreditDeductRequest, CreditResponse
from routers.auth import get_current_user
from utils.credits import add_credits, deduct_credits, get_credit_balance, get_credits_used

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Credits"])

# ---------------------------------------------------------------------------
# Internal admin guard
# ---------------------------------------------------------------------------

_ADMIN_API_KEY_HEADER = "X-Admin-Api-Key"


async def _require_admin(x_admin_api_key: str = Header(default="")) -> None:
    """
    Dependency that checks for an internal admin API key.

    The key is read from the ADMIN_API_KEY environment variable.
    If the env var is not set, the endpoint is effectively disabled.
    """
    expected = os.environ.get("ADMIN_API_KEY", "")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin endpoint is not configured",
        )
    if x_admin_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin API key",
        )


# ---------------------------------------------------------------------------
# GET /credits
# ---------------------------------------------------------------------------

@router.get(
    "/credits",
    response_model=CreditResponse,
    summary="Get the current user's credit balance",
)
async def get_credits(
    current_user: dict = Depends(get_current_user),
) -> CreditResponse:
    """
    Returns the authenticated user's current credit balance.
    """
    user_id: str = current_user["id"]
    balance = await get_credit_balance(user_id)
    total_used = get_credits_used(user_id)
    return CreditResponse(user_id=user_id, balance=balance, total_used=total_used)


# ---------------------------------------------------------------------------
# POST /credits/deduct  (admin/internal)
# ---------------------------------------------------------------------------

@router.post(
    "/credits/deduct",
    response_model=CreditResponse,
    summary="[Admin] Deduct credits from a user account",
    description=(
        "Internal/admin endpoint. Requires the `X-Admin-Api-Key` header matching "
        "the `ADMIN_API_KEY` environment variable."
    ),
)
async def admin_deduct_credits(
    request: CreditDeductRequest,
    _: None = Depends(_require_admin),
) -> CreditResponse:
    """
    Deducts the specified number of credits from the target user's account
    and records a transaction.  Returns the updated balance.
    """
    await deduct_credits(request.user_id, request.amount, request.reason)
    new_balance = await get_credit_balance(request.user_id)
    logger.info(
        "Admin deducted %d credits from user %s (reason: %s). New balance: %d",
        request.amount,
        request.user_id,
        request.reason,
        new_balance,
    )
    return CreditResponse(user_id=request.user_id, balance=new_balance)


# ---------------------------------------------------------------------------
# POST /credits/add  (admin/internal — bonus endpoint for completeness)
# ---------------------------------------------------------------------------

@router.post(
    "/credits/add",
    response_model=CreditResponse,
    summary="[Admin] Add credits to a user account",
    description=(
        "Internal/admin endpoint. Requires the `X-Admin-Api-Key` header matching "
        "the `ADMIN_API_KEY` environment variable."
    ),
)
async def admin_add_credits(
    request: CreditDeductRequest,
    _: None = Depends(_require_admin),
) -> CreditResponse:
    """
    Adds credits to the target user's account and records a transaction.
    Returns the updated balance.
    """
    await add_credits(request.user_id, request.amount, request.reason)
    new_balance = await get_credit_balance(request.user_id)
    logger.info(
        "Admin added %d credits to user %s (reason: %s). New balance: %d",
        request.amount,
        request.user_id,
        request.reason,
        new_balance,
    )
    return CreditResponse(user_id=request.user_id, balance=new_balance)
