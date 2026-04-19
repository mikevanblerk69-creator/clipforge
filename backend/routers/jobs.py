"""
Job management and video history endpoints.

GET    /api/v1/jobs/{job_id}        — poll a single job's status
GET    /api/v1/history              — paginated video generation history
DELETE /api/v1/history/{video_id}   — soft-delete a history record + storage
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.schemas import HistoryResponse, JobStatusResponse, VideoHistoryItem
from routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Jobs & History"])

# ---------------------------------------------------------------------------
# Service factory — demo vs real
# ---------------------------------------------------------------------------

_DEMO_MODE = os.environ.get("DEMO_MODE", "").lower() == "true"

if _DEMO_MODE:
    from services.demo_service import DemoVideoService
    _video_service = DemoVideoService()
    _storage_service = None
    logger.info("Jobs router: DEMO MODE active")
else:
    from services.storage_service import StorageService
    from services.video_service import VideoService
    _video_service = VideoService()
    _storage_service = StorageService()


def _sb_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _supabase_base() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return url, key


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}
# ---------------------------------------------------------------------------

@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
    summary="Get the status of a video generation job",
)
async def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
) -> JobStatusResponse:
    user_id: str = current_user["id"]
    return await _video_service.get_job_status(job_id, user_id)


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------

@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="List the current user's video generation history",
)
async def get_history(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100, description="Number of items to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
) -> HistoryResponse:
    user_id: str = current_user["id"]

    if _DEMO_MODE:
        jobs_list, total = _video_service.get_jobs_for_user(user_id, limit=limit, offset=offset)
        items = [_row_to_history_item(row) for row in jobs_list]
        return HistoryResponse(videos=items, total=total)

    supabase_url, service_key = _supabase_base()

    params = (
        f"user_id=eq.{user_id}"
        f"&deleted=eq.false"
        f"&order=created_at.desc"
        f"&limit={limit}"
        f"&offset={offset}"
        f"&select=*"
    )
    url = f"{supabase_url}/rest/v1/jobs?{params}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            url,
            headers={**_sb_headers(service_key), "Prefer": "count=exact"},
        )
        resp.raise_for_status()

        content_range = resp.headers.get("content-range", "")
        total = _parse_total(content_range)
        raw_items = resp.json()

    items = [_row_to_history_item(row) for row in raw_items if isinstance(row, dict)]
    return HistoryResponse(videos=items, total=total)


# ---------------------------------------------------------------------------
# DELETE /history/{video_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/history/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a video from the user's history",
)
async def delete_history_item(
    video_id: str,
    current_user: dict = Depends(get_current_user),
) -> None:
    user_id: str = current_user["id"]

    if _DEMO_MODE:
        _video_service.delete_job(video_id, user_id)
        return

    supabase_url, service_key = _supabase_base()
    hdrs = _sb_headers(service_key)

    fetch_url = (
        f"{supabase_url}/rest/v1/jobs"
        f"?job_id=eq.{video_id}&select=job_id,user_id,video_url,deleted"
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(fetch_url, headers=hdrs)
        resp.raise_for_status()
        data = resp.json()

    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    record = data[0]
    if record.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if record.get("deleted"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video has already been deleted",
        )

    patch_url = f"{supabase_url}/rest/v1/jobs?job_id=eq.{video_id}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        patch_resp = await client.patch(patch_url, json={"deleted": True}, headers=hdrs)
        patch_resp.raise_for_status()

    video_url: Optional[str] = record.get("video_url")
    if video_url and _storage_service is not None:
        storage_path = _extract_storage_path(video_url, user_id)
        try:
            await _storage_service.delete_video(user_id, storage_path)
        except Exception as exc:
            logger.warning(
                "Storage deletion failed for video_id=%s path=%s: %s",
                video_id, storage_path, exc,
            )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_history_item(row: dict) -> VideoHistoryItem:
    from datetime import datetime

    created_at = row.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    elif created_at is None:
        from datetime import timezone
        created_at = datetime.now(timezone.utc)

    return VideoHistoryItem(
        id=row.get("job_id", ""),
        type=row.get("type", "text2video"),
        status=row.get("status", "completed"),
        prompt=row.get("prompt"),
        video_url=row.get("video_url"),
        thumbnail_url=row.get("thumbnail_url"),
        credits_used=row.get("credits_used", 0),
        created_at=created_at,
    )


def _parse_total(content_range: str) -> int:
    if "/" in content_range:
        try:
            return int(content_range.split("/")[-1])
        except ValueError:
            pass
    return 0


def _extract_storage_path(video_url: str, user_id: str) -> str:
    if "/public/videos/" in video_url:
        return video_url.split("/public/videos/", 1)[-1]
    return video_url
