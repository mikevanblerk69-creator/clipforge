"""
Lip-sync endpoint.

POST /api/v1/lipsync
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from models.schemas import JobResponse, LipSyncRequest
from routers.auth import get_current_user
from utils.credits import CREDIT_COSTS, check_sufficient_credits

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["Lip Sync"])

# ---------------------------------------------------------------------------
# Service factory — demo vs real
# ---------------------------------------------------------------------------

_DEMO_MODE = os.environ.get("DEMO_MODE", "").lower() == "true"

if _DEMO_MODE:
    from services.demo_service import DemoVideoService
    _video_service = DemoVideoService()
    _storage_service = None
    logger.info("Lipsync router: DEMO MODE active")
else:
    from services.storage_service import StorageService
    from services.video_service import VideoService
    _video_service = VideoService()
    _storage_service = StorageService()

_LIPSYNC_CREDIT_COST = CREDIT_COSTS["lipsync"]  # 20


@router.post(
    "/lipsync",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a lip-sync job",
)
async def create_lipsync(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    video_url: Optional[str] = Form(default=None),
    video_file: Optional[UploadFile] = File(default=None),
    audio_url: Optional[str] = Form(default=None),
    audio_file: Optional[UploadFile] = File(default=None),
    tts_text: Optional[str] = Form(default=None),
) -> JobResponse:
    user_id: str = current_user["id"]

    if not await check_sufficient_credits(user_id, _LIPSYNC_CREDIT_COST):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Lip-sync requires {_LIPSYNC_CREDIT_COST} credits.",
        )

    # ---- Resolve video ------------------------------------------------
    resolved_video_url: Optional[str] = video_url
    if video_file is not None:
        if _DEMO_MODE:
            resolved_video_url = resolved_video_url or "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_25fps.mp4"
        else:
            video_bytes = await video_file.read()
            if not video_bytes:
                raise HTTPException(status_code=400, detail="Uploaded video file is empty")
            video_filename = video_file.filename or f"{uuid.uuid4()}.mp4"
            resolved_video_url = await _storage_service.upload_image(user_id, video_bytes, video_filename)

    if not resolved_video_url:
        raise HTTPException(status_code=400, detail="Either video_url or a video_file upload is required")

    # ---- Resolve audio ------------------------------------------------
    resolved_audio_url: Optional[str] = audio_url
    if audio_file is not None:
        if tts_text:
            raise HTTPException(status_code=422, detail="Provide either audio_file/audio_url OR tts_text, not both")
        if _DEMO_MODE:
            resolved_audio_url = resolved_audio_url or "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        else:
            audio_bytes = await audio_file.read()
            if not audio_bytes:
                raise HTTPException(status_code=400, detail="Uploaded audio file is empty")
            audio_filename = audio_file.filename or f"{uuid.uuid4()}.wav"
            resolved_audio_url = await _storage_service.upload_image(user_id, audio_bytes, audio_filename)

    if resolved_audio_url and tts_text:
        raise HTTPException(status_code=422, detail="Provide either audio_url/audio_file OR tts_text, not both")
    if not resolved_audio_url and not tts_text:
        raise HTTPException(status_code=422, detail="Either audio_url, audio_file, or tts_text is required")

    request = LipSyncRequest(
        video_url=resolved_video_url,
        audio_url=resolved_audio_url,
        tts_text=tts_text,
    )

    job_response = await _video_service.submit_lipsync(user_id, request)
    background_tasks.add_task(_video_service.process_job, job_response.job_id)

    logger.info("lipsync job %s queued for user %s", job_response.job_id, user_id)
    return job_response
