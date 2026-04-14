"""
Pydantic v2 models for all ClipForge request/response types.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class VideoStyle(str, Enum):
    cinematic = "cinematic"
    anime = "anime"
    realistic = "realistic"
    abstract = "abstract"


class AspectRatio(str, Enum):
    widescreen = "16:9"
    portrait = "9:16"
    square = "1:1"


class Duration(int, Enum):
    short = 5
    long = 10


class Quality(str, Enum):
    standard = "standard"
    pro = "pro"


class JobType(str, Enum):
    text2video = "text2video"
    image2video = "image2video"
    lipsync = "lipsync"


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class Text2VideoRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt describing the video")
    negative_prompt: Optional[str] = Field(
        None, max_length=500, description="What to avoid in the generated video"
    )
    style: VideoStyle = Field(VideoStyle.cinematic, description="Visual style of the generated video")
    duration: Duration = Field(Duration.short, description="Video duration in seconds")
    aspect_ratio: AspectRatio = Field(AspectRatio.widescreen, description="Output aspect ratio")
    quality: Quality = Field(Quality.standard, description="Generation quality tier")

    model_config = {"use_enum_values": True}


class Image2VideoRequest(BaseModel):
    image_url: str = Field(..., description="URL of the source image to animate")
    motion_prompt: Optional[str] = Field(
        None, max_length=500, description="Optional prompt to guide the motion"
    )
    duration: Duration = Field(Duration.short, description="Video duration in seconds")
    aspect_ratio: AspectRatio = Field(AspectRatio.widescreen, description="Output aspect ratio")

    model_config = {"use_enum_values": True}


class LipSyncRequest(BaseModel):
    video_url: Optional[str] = Field(None, description="URL of the source video to lip-sync")
    audio_url: Optional[str] = Field(None, description="URL of the audio file to sync lips to")
    tts_text: Optional[str] = Field(
        None, max_length=2000, description="Text to convert to speech then sync (mutually exclusive with audio_url)"
    )

    @model_validator(mode="after")
    def validate_audio_source(self) -> "LipSyncRequest":
        if self.audio_url is None and self.tts_text is None:
            raise ValueError("Either audio_url or tts_text must be provided")
        if self.audio_url is not None and self.tts_text is not None:
            raise ValueError("Provide either audio_url or tts_text, not both")
        return self

    model_config = {"use_enum_values": True}


class CreditDeductRequest(BaseModel):
    user_id: str = Field(..., description="The user's UUID")
    amount: int = Field(..., gt=0, description="Number of credits to deduct")
    reason: str = Field(..., min_length=1, max_length=255, description="Reason for the deduction")


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class JobResponse(BaseModel):
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    created_at: datetime = Field(..., description="When the job was created")
    estimated_seconds: int = Field(..., description="Estimated processing time in seconds")

    model_config = {"use_enum_values": True}


class JobStatusResponse(BaseModel):
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    progress: int = Field(..., ge=0, le=100, description="Completion percentage (0–100)")
    video_url: Optional[str] = Field(None, description="Public URL of the completed video")
    thumbnail_url: Optional[str] = Field(None, description="Public URL of the video thumbnail")
    error: Optional[str] = Field(None, description="Error message if the job failed")
    created_at: datetime = Field(..., description="When the job was created")
    completed_at: Optional[datetime] = Field(None, description="When the job finished (success or failure)")

    model_config = {"use_enum_values": True}


class CreditResponse(BaseModel):
    user_id: str = Field(..., description="The user's UUID")
    balance: int = Field(..., ge=0, description="Current credit balance")
    total_used: int = Field(0, ge=0, description="Total credits used so far")


class VideoHistoryItem(BaseModel):
    id: str = Field(..., description="Record UUID")
    type: JobType = Field(..., description="Generation type")
    status: JobStatus = Field(..., description="Final job status")
    prompt: Optional[str] = Field(None, description="Prompt used (if applicable)")
    video_url: Optional[str] = Field(None, description="Public URL of the video")
    thumbnail_url: Optional[str] = Field(None, description="Public URL of the thumbnail")
    credits_used: int = Field(..., ge=0, description="Credits consumed for this job")
    created_at: datetime = Field(..., description="When the record was created")

    model_config = {"use_enum_values": True}


class HistoryResponse(BaseModel):
    videos: List[VideoHistoryItem] = Field(default_factory=list)
    total: int = Field(..., ge=0, description="Total number of history records for this user")
