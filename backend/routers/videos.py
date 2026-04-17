"""
Video generation endpoints.

POST /api/v1/video/text2video   — submit a text-to-video job
POST /api/v1/video/image2video  — submit an image-to-video job (supports file upload)

Payment gate (enforced on every generation endpoint)
-----------------------------------------------------
A request is rejected with HTTP 402 if ANY of the following is true:
  • The user has zero credits remaining
  • The user's payment_status is not 'confirmed'

This means free / welcome credits alone cannot trigger generation — the user
must have completed a real, verified PayFast purchase first.
(DEMO_MODE bypasses this check so local dev still works.)
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
from utils.credits import CREDIT_COSTS, check_payment_confirmed, check_sufficient_credits

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
# Payment gate helper
# ---------------------------------------------------------------------------

async def _enforce_payment_gate(user_id: str, required_credits: int) -> None:
    """
    Raise HTTP 402 if the user cannot generate videos.

    Two checks must BOTH pass:
      1. credits > 0 (and >= required)
      2. payment_status == 'confirmed'   (real PayFast payment on file)

    In DEMO_MODE both checks are skipped (check_payment_confirmed always
    returns True and the demo credit store is pre-seeded).
    """
    if not await check_sufficient_credits(user_id, required_credits):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Insufficient credits. This job requires {required_credits} credit(s). "
                "Purchase a plan at /pricing to continue."
            ),
        )

    if not await check_payment_confirmed(user_id):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                "Payment not yet confirmed. "
                "Please complete a purchase at /pricing before generating videos. "
                "If you just paid, it may take a few seconds for PayFast to confirm."
            ),
        )


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

    # Determine credit cost
    quality_val = str(request.quality)
    duration_val = int(request.duration)
    if quality_val == Quality.pro or duration_val >= int(Duration.long):
        cost_key = "text2video_10s_pro"
    else:
        cost_key = "text2video_5s_standard"

    required = CREDIT_COSTS[cost_key]

    # --- PAYMENT GATE (credits AND payment confirmed) ---
    await _enforce_payment_gate(user_id, required)

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

    # --- PAYMENT GATE (credits AND payment confirmed) ---
    await _enforce_payment_gate(user_id, required)

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
