"""
Video generation endpoints.

POST /api/v1/video/text2video   — submit a text-to-video job
POST /api/v1/video/image2video  — submit an image-to-video job (supports file upload)
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status

from models.schemas import (
    AspectRatio,
    Duration,
    Image2VideoRequest,
    JobResponse,
    Quality,
    Text2VideoRequest,
    VideoStyle,
)
from routers.auth import get_current_user
from utils.credits import CREDIT_COSTS, check_sufficient_credits

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/video", tags=["Video Generation"])

# ---------------------------------------------------------------------------
# Service factory — demo vs real
# ---------------------------------------------------------------------------

_DEMO_MODE = os.environ.get("DEMO_MODE", "").lower() == "true"

if _DEMO_MODE:
    from services.demo_service import DemoVideoService
    _video_service = DemoVideoService()
    _storage_service = None
    logger.info("Video router: DEMO MODE active")
else:
    from services.storage_service import StorageService
    from services.video_service import VideoService
    _video_service = VideoService()
    _storage_service = StorageService()


# ---------------------------------------------------------------------------
# POST /text2video
# ---------------------------------------------------------------------------

@router.post(
    "/text2video",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a text-to-video generation job",
)
async def create_text2video(
    request: Text2VideoRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> JobResponse:
    user_id: str = current_user["id"]

    # Determine credit cost and verify balance before submitting
    quality_val = str(request.quality)
    duration_val = int(request.duration)
    if quality_val == Quality.pro or duration_val >= int(Duration.long):
        cost_key = "text2video_10s_pro"
    else:
        cost_key = "text2video_5s_standard"

    required = CREDIT_COSTS[cost_key]
    if not await check_sufficient_credits(user_id, required):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. This job requires {required} credits.",
        )

    job_response = await _video_service.submit_text2video(user_id, request)
    background_tasks.add_task(_video_service.process_job, job_response.job_id)

    logger.info(
        "text2video job %s queued for user %s (cost=%d)",
        job_response.job_id, user_id, required,
    )
    return job_response


# ---------------------------------------------------------------------------
# POST /image2video
# ---------------------------------------------------------------------------

@router.post(
    "/image2video",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit an image-to-video animation job",
)
async def create_image2video(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    image_url: Optional[str] = Form(default=None, description="URL of the source image"),
    motion_prompt: Optional[str] = Form(default=None),
    duration: int = Form(default=5),
    aspect_ratio: str = Form(default="16:9"),
    image_file: Optional[UploadFile] = File(default=None, description="Source image file"),
) -> JobResponse:
    user_id: str = current_user["id"]

    required = CREDIT_COSTS["image2video"]
    if not await check_sufficient_credits(user_id, required):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. This job requires {required} credits.",
        )

    # Resolve image URL
    resolved_image_url: Optional[str] = image_url

    if image_file is not None:
        if _DEMO_MODE:
            # In demo mode skip real storage — use a placeholder
            resolved_image_url = resolved_image_url or "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg"
        else:
            file_bytes = await image_file.read()
            if not file_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded image file is empty",
                )
            filename = image_file.filename or f"{uuid.uuid4()}.jpg"
            resolved_image_url = await _storage_service.upload_image(user_id, file_bytes, filename)

    if not resolved_image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either image_url or an image_file upload is required",
        )

    try:
        aspect_ratio_enum = AspectRatio(aspect_ratio)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid aspect_ratio '{aspect_ratio}'. Must be one of: 16:9, 9:16, 1:1",
        )

    try:
        duration_enum = Duration(duration)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid duration '{duration}'. Must be 5 or 10",
        )

    request = Image2VideoRequest(
        image_url=resolved_image_url,
        motion_prompt=motion_prompt,
        duration=duration_enum,
        aspect_ratio=aspect_ratio_enum,
    )

    job_response = await _video_service.submit_image2video(user_id, request)
    background_tasks.add_task(_video_service.process_job, job_response.job_id)

    logger.info("image2video job %s queued for user %s", job_response.job_id, user_id)
    return job_response
