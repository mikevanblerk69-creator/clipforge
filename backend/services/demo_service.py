"""
Demo mode service — fully in-memory, no external API calls.

Used when DEMO_MODE=true. All jobs resolve after ~5 seconds with a real
public MP4 sample video so the UI flow is fully exercisable without any
Replicate, Supabase, or Upstash credentials.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

from fastapi import HTTPException

from models.schemas import (
    Image2VideoRequest,
    JobResponse,
    JobStatus,
    JobStatusResponse,
    JobType,
    LipSyncRequest,
    Text2VideoRequest,
    VideoHistoryItem,
)
from utils.credits import CREDIT_COSTS

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEMO_USER_ID = "demo-user-id"

# Free CC0 sample video from Pexels (direct MP4 stream link)
DEMO_VIDEO_URL = (
    "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_25fps.mp4"
)

# ---------------------------------------------------------------------------
# Module-level in-memory stores (shared across all DemoVideoService instances)
# ---------------------------------------------------------------------------

_demo_jobs: Dict[str, dict] = {}
_demo_credits: Dict[str, int] = {DEMO_USER_ID: 50}
_demo_credits_used: Dict[str, int] = {DEMO_USER_ID: 0}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_demo_balance(user_id: str) -> int:
    return _demo_credits.get(user_id, 50)


def get_demo_credits_used(user_id: str) -> int:
    return _demo_credits_used.get(user_id, 0)


def spend_demo_credits(user_id: str, amount: int) -> int:
    """Deduct *amount* credits.  Raises 402 if insufficient.  Returns new balance."""
    current = _demo_credits.get(user_id, 50)
    if current < amount:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits: need {amount}, have {current}",
        )
    new_balance = current - amount
    _demo_credits[user_id] = new_balance
    _demo_credits_used[user_id] = _demo_credits_used.get(user_id, 0) + amount
    return new_balance


# ---------------------------------------------------------------------------
# DemoVideoService
# ---------------------------------------------------------------------------


class DemoVideoService:
    """
    Drop-in replacement for VideoService that uses in-memory state only.

    Implements the same public interface:
      submit_text2video / submit_image2video / submit_lipsync
      process_job
      get_job_status
      get_jobs_for_user   (extra helper for the history endpoint)
      delete_job          (extra helper for the delete endpoint)
    """

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _submit_job(
        self,
        user_id: str,
        job_type: str,
        credits: int,
        extra: dict,
    ) -> JobResponse:
        job_id = str(uuid.uuid4())
        _demo_jobs[job_id] = {
            "job_id": job_id,
            "user_id": user_id,
            "type": job_type,
            "status": JobStatus.queued,
            "progress": 0,
            "credits_used": credits,
            "created_at": _now_iso(),
            "completed_at": None,
            "video_url": None,
            "error": None,
            "_submit_time": time.monotonic(),
            **extra,
        }
        return JobResponse(
            job_id=job_id,
            status=JobStatus.queued,
            created_at=datetime.now(timezone.utc),
            estimated_seconds=8,
        )

    # ------------------------------------------------------------------
    # Job submission
    # ------------------------------------------------------------------

    async def submit_text2video(
        self, user_id: str, request: Text2VideoRequest
    ) -> JobResponse:
        quality_val = str(request.quality)
        duration_val = int(request.duration)
        cost_key = (
            "text2video_10s_pro"
            if quality_val == "pro" or duration_val >= 10
            else "text2video_5s_standard"
        )
        credits = CREDIT_COSTS[cost_key]
        spend_demo_credits(user_id, credits)
        return await self._submit_job(
            user_id,
            JobType.text2video,
            credits,
            {
                "prompt": request.prompt,
                "style": str(request.style),
                "duration": duration_val,
                "aspect_ratio": str(request.aspect_ratio),
                "quality": quality_val,
            },
        )

    async def submit_image2video(
        self, user_id: str, request: Image2VideoRequest
    ) -> JobResponse:
        credits = CREDIT_COSTS["image2video"]
        spend_demo_credits(user_id, credits)
        return await self._submit_job(
            user_id,
            JobType.image2video,
            credits,
            {
                "image_url": request.image_url,
                "motion_prompt": request.motion_prompt,
            },
        )

    async def submit_lipsync(
        self, user_id: str, request: LipSyncRequest
    ) -> JobResponse:
        credits = CREDIT_COSTS["lipsync"]
        spend_demo_credits(user_id, credits)
        return await self._submit_job(
            user_id,
            JobType.lipsync,
            credits,
            {
                "video_url": request.video_url,
                "audio_url": request.audio_url,
            },
        )

    # ------------------------------------------------------------------
    # Background processor
    # ------------------------------------------------------------------

    async def process_job(self, job_id: str) -> None:
        """Simulate a ~5-second generation delay then mark the job complete."""
        await asyncio.sleep(5)
        record = _demo_jobs.get(job_id)
        if record is not None:
            record.update(
                {
                    "status": JobStatus.completed,
                    "progress": 100,
                    "video_url": DEMO_VIDEO_URL,
                    "completed_at": _now_iso(),
                }
            )

    # ------------------------------------------------------------------
    # Status polling (user-facing)
    # ------------------------------------------------------------------

    async def get_job_status(self, job_id: str, user_id: str) -> JobStatusResponse:
        record = _demo_jobs.get(job_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Job not found")
        if record["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Simulate progress while the background task is running
        if record["status"] in (JobStatus.queued, JobStatus.processing):
            elapsed = time.monotonic() - record.get("_submit_time", time.monotonic())
            record["status"] = JobStatus.processing
            record["progress"] = min(int(elapsed * 18), 95)

        created_at = datetime.fromisoformat(record["created_at"])
        completed_at: Optional[datetime] = None
        if record.get("completed_at"):
            completed_at = datetime.fromisoformat(record["completed_at"])

        return JobStatusResponse(
            job_id=job_id,
            status=record["status"],
            progress=record["progress"],
            video_url=record.get("video_url"),
            thumbnail_url=None,
            error=record.get("error"),
            created_at=created_at,
            completed_at=completed_at,
        )

    # ------------------------------------------------------------------
    # History helpers (called directly from jobs router in demo mode)
    # ------------------------------------------------------------------

    def get_jobs_for_user(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> Tuple[list, int]:
        user_jobs = [j for j in _demo_jobs.values() if j["user_id"] == user_id]
        user_jobs.sort(key=lambda j: j["created_at"], reverse=True)
        total = len(user_jobs)
        return user_jobs[offset : offset + limit], total

    def delete_job(self, job_id: str, user_id: str) -> bool:
        record = _demo_jobs.get(job_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Video not found")
        if record["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        del _demo_jobs[job_id]
        return True
