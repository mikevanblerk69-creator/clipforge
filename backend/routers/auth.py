"""
FastAPI dependency for Supabase JWT authentication.

Flow
----
1. Client sends:  Authorization: Bearer <supabase_access_token>
2. We validate the token by calling Supabase's /auth/v1/user endpoint.
3. If valid, we return a user dict {id, email}.
4. If invalid or expired, we raise HTTP 401.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """
    FastAPI dependency — validates a Supabase JWT and returns the user dict.

    In DEMO_MODE, skips JWT verification and returns the hardcoded demo user.
    Raises HTTP 401 for missing, malformed, or invalid tokens.
    """
    if os.environ.get("DEMO_MODE", "").lower() == "true":
        return {"id": "demo-user-id", "email": "demo@clipforge.ai"}

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")

    if not supabase_url or not anon_key:
        logger.error("SUPABASE_URL or SUPABASE_ANON_KEY environment variables not set")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service misconfigured",
        )

    user_endpoint = f"{supabase_url}/auth/v1/user"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(user_endpoint, headers=headers)
    except httpx.RequestError as exc:
        logger.warning("Auth request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )

    if resp.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if resp.status_code != 200:
        logger.error("Supabase /auth/v1/user returned %d: %s", resp.status_code, resp.text)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = resp.json()

    user_id: Optional[str] = user_data.get("id")
    email: Optional[str] = user_data.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user id",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"id": user_id, "email": email}
