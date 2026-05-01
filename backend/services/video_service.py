"""
Core video generation service.

Orchestrates: ReplicateAdapter → QueueService → StorageService → Supabase DB.

All Supabase DB operations use the REST API directly via httpx so we stay
fully async without the blocking supabase-py client.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx

from models.schemas import (
    AspectRatio,
    Duration,
    Image2VideoRequest,
    JobResponse,
    JobStatus,
    JobStatusResponse,
    JobType,
    LipSyncRequest,
    Quality,
    Text2VideoRequest,
)
from services.queue_service import QueueService
from services.replicate_adapter import ReplicateAdapter
from services.storage_service import StorageService
from utils.credits import CREDIT_COSTS, deduct_credits
from utils.polling import poll_until_complete

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _supabase_headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _cost_key(job_type: str, duration: int, quality: str) -> str:
    if job_type == JobType.text2video:
        if quality == Quality.pro or duration >= Duration.long:
            return "text2video_10s_pro"
        return "text2video_5s_standard"
    if job_type == JobType.image2video:
        return "image2video"
    return "lipsync"


# ---------------------------------------------------------------------------
# VideoService
# ---------------------------------------------------------------------------

class VideoService:
    """Orchestrates video generation jobs end-to-end."""

    def __init__(self) -> None:
        self._supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
        self._service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self._adapter = ReplicateAdapter()
        self._storage = StorageService()
        self._queue = QueueService()

    # ------------------------------------------------------------------
    # Supabase DB helpers
    # ------------------------------------------------------------------

    async def _insert_job_record(self, record: dict) -> dict:
        url = f"{self._supabase_url}/rest/v1/jobs"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                json=record,
                headers=_supabase_headers(self._service_key),
            )
            resp.raise_for_status()
            data = resp.json()
            return data[0] if isinstance(data, list) else data

    async def _update_job_record(self, job_id: str, updates: dict) -> None:
        url = f"{self._supabase_url}/rest/v1/jobs?job_id=eq.{job_id}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.patch(
                url,
                json=updates,
                headers=_supabase_headers(self._service_key),
            )
            resp.raise_for_status()

    async def _fetch_job_record(self, job_id: str) -> Optional[dict]:
        url = f"{self._supabase_url}/rest/v1/jobs?job_id=eq.{job_id}&select=*"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url,
                headers=_supabase_headers(self._service_key),
            )
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else None

    # ------------------------------------------------------------------
    # Job submission
    # ------------------------------------------------------------------

    async def submit_text2video(
        self, user_id: str, request: Text2VideoRequest
    ) -> JobResponse:
        job_id = str(uuid.uuid4())
        cost_key = _cost_key(JobType.text2video, int(request.duration), str(request.quality))
        credits_required = CREDIT_COSTS[cost_key]

        # Deduct credits before enqueueing (raises if insufficient)
        await deduct_credits(user_id, credits_required, f"text2video job {job_id}")

        job_record = {
            "job_id": job_id,
            "user_id": user_id,
            "type": JobType.text2video,
            "status": JobStatus.queued,
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "style": str(request.style),
            "duration": int(request.duration),
            "aspect_ratio": str(request.aspect_ratio),
            "quality": str(request.quality),
            "credits_used": credits_required,
            "progress": 0,
            "created_at": _now_iso(),
        }

        await self._insert_job_record(job_record)
        try:
            await self._queue.enqueue_job(job_record)
        except Exception as exc:
            logger.warning("Queue unavailable for job %s (continuing): %s", job_id, exc)

        estimated = 120 if str(request.quality) == "standard" else 240

        return JobResponse(
            job_id=job_id,
            status=JobStatus.queued,
            created_at=datetime.fromisoformat(job_record["created_at"]),
            estimated_seconds=estimated,
        )

    async def submit_image2video(
        self, user_id: str, request: Image2VideoRequest
    ) -> JobResponse:
        job_id = str(uuid.uuid4())
        credits_required = CREDIT_COSTS["image2video"]

        await deduct_credits(user_id, credits_required, f"image2video job {job_id}")

        job_record = {
            "job_id": job_id,
            "user_id": user_id,
            "type": JobType.image2video,
            "status": JobStatus.queued,
            "image_url": request.image_url,
            "motion_prompt": request.motion_prompt,
            "duration": int(request.duration),
            "aspect_ratio": str(request.aspect_ratio),
            "credits_used": credits_required,
            "progress": 0,
            "created_at": _now_iso(),
        }

        await self._insert_job_record(job_record)
        try:
            await self._queue.enqueue_job(job_record)
        except Exception as exc:
            logger.warning("Queue unavailable for job %s (continuing): %s", job_id, exc)

        return JobResponse(
            job_id=job_id,
            status=JobStatus.queued,
            created_at=datetime.fromisoformat(job_record["created_at"]),
            estimated_seconds=90,
        )

    async def submit_lipsync(
        self, user_id: str, request: LipSyncRequest
    ) -> JobResponse:
        job_id = str(uuid.uuid4())
        credits_required = CREDIT_COSTS["lipsync"]

        await deduct_credits(user_id, credits_required, f"lipsync job {job_id}")

        job_record = {
            "job_id": job_id,
            "user_id": user_id,
            "type": JobType.lipsync,
            "status": JobStatus.queued,
            "video_url": request.video_url,
            "audio_url": request.audio_url,
            "tts_text": request.tts_text,
            "credits_used": credits_required,
            "progress": 0,
            "created_at": _now_iso(),
        }

        await self._insert_job_record(job_record)
        try:
            await self._queue.enqueue_job(job_record)
        except Exception as exc:
            logger.warning("Queue unavailable for job %s (continuing): %s", job_id, exc)

        return JobResponse(
            job_id=job_id,
            status=JobStatus.queued,
            created_at=datetime.fromisoformat(job_record["created_at"]),
            estimated_seconds=60,
        )

    # ------------------------------------------------------------------
    # Background job processor
    # ------------------------------------------------------------------

    async def process_job(self, job_id: str) -> None:
        """
        Called by a FastAPI BackgroundTask.

        1. Reads the job record from Supabase.
        2. Submits it to the appropriate Replicate model.
        3. Polls until completed or failed.
        4. Uploads the output video to Supabase Storage.
        5. Updates the DB record with the final status and public URL.
        """
        record = await self._fetch_job_record(job_id)
        if record is None:
            logger.error("process_job: job %s not found in DB", job_id)
            return

        job_type: str = record.get("type", "")
        user_id: str = record["user_id"]

        try:
            # Mark as processing
            await self._update_job_record(job_id, {"status": JobStatus.processing, "progress": 5})

            # Submit to Replicate
            if job_type == JobType.text2video:
                result = await self._adapter.generate_text_to_video(
                    prompt=record["prompt"],
                    negative_prompt=record.get("negative_prompt"),
                    style=record.get("style", "cinematic"),
                    duration=record.get("duration", 5),
                    aspect_ratio=record.get("aspect_ratio", "16:9"),
                    quality=record.get("quality", "standard"),
                )
            elif job_type == JobType.image2video:
                result = await self._adapter.generate_image_to_video(
                    image_url=record["image_url"],
                    motion_prompt=record.get("motion_prompt"),
                    duration=record.get("duration", 5),
                    aspect_ratio=record.get("aspect_ratio", "16:9"),
                )
            elif job_type == JobType.lipsync:
                video_url = record.get("video_url", "")
                audio_url = record.get("audio_url") or ""
                # If tts_text is provided and audio_url is absent, a TTS step
                # would be inserted here (placeholder: use audio_url directly)
                result = await self._adapter.generate_lip_sync(
                    video_url=video_url,
                    audio_url=audio_url,
                )
            else:
                raise ValueError(f"Unknown job type: {job_type}")

            replicate_job_id: str = result["job_id"]

            # Update DB with the provider's prediction ID
            await self._update_job_record(
                job_id, {"provider_job_id": replicate_job_id, "progress": 10}
            )
            try:
                await self._queue.update_job(job_id, {"provider_job_id": replicate_job_id})
            except Exception:
                pass

            # Poll until Replicate finishes
            final = await poll_until_complete(
                replicate_job_id,
                self._adapter,
                max_attempts=120,
                interval=5,
            )

            if final["status"] == JobStatus.failed:
                raise RuntimeError(final.get("error") or "Replicate job failed")

            output_url: str = final["output_url"]

            # Upload to Supabase Storage
            public_url = await self._storage.upload_video(user_id, job_id, output_url)

            await self._update_job_record(
                job_id,
                {
                    "status": JobStatus.completed,
                    "progress": 100,
                    "video_url": public_url,
                    "completed_at": _now_iso(),
                },
            )
            logger.info("Job %s completed → %s", job_id, public_url)

        except Exception as exc:
            logger.exception("Job %s failed: %s", job_id, exc)
            await self._update_job_record(
                job_id,
                {
                    "status": JobStatus.failed,
                    "error": str(exc),
                    "completed_at": _now_iso(),
                },
            )

    # ------------------------------------------------------------------
    # Status polling (user-facing)
    # ------------------------------------------------------------------

    async def get_job_status(self, job_id: str, user_id: str) -> JobStatusResponse:
        record = await self._fetch_job_record(job_id)
        if record is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Job not found")

        if record.get("user_id") != user_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Access denied")

        created_at = datetime.fromisoformat(record["created_at"])
        completed_at: Optional[datetime] = None
        if record.get("completed_at"):
            completed_at = datetime.fromisoformat(record["completed_at"])

        return JobStatusResponse(
            job_id=job_id,
            status=record.get("status", JobStatus.queued),
            progress=record.get("progress", 0),
            video_url=record.get("video_url"),
            thumbnail_url=record.get("thumbnail_url"),
            error=record.get("error"),
            created_at=created_at,
            completed_at=completed_at,
        )
