"""
Abstract base class for AI model backends.

All concrete adapters (Replicate, Runway, etc.) must implement every method
defined here so that the rest of the application is decoupled from the
underlying AI provider.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class ModelAdapter(ABC):
    """
    Abstract interface for AI video-generation model backends.

    Every method is async so implementations can use non-blocking I/O
    (httpx, aiohttp, etc.) without wrapping.
    """

    # ------------------------------------------------------------------
    # Generation endpoints
    # ------------------------------------------------------------------

    @abstractmethod
    async def generate_text_to_video(
        self,
        prompt: str,
        negative_prompt: Optional[str],
        style: str,
        duration: int,
        aspect_ratio: str,
        quality: str,
    ) -> dict:
        """
        Submit a text-to-video generation request.

        Returns a dict that includes at minimum:
            {
                "job_id": "<provider-specific prediction id>",
                "status": "<initial status string>",
            }
        """

    @abstractmethod
    async def generate_image_to_video(
        self,
        image_url: str,
        motion_prompt: Optional[str],
        duration: int,
        aspect_ratio: str,
    ) -> dict:
        """
        Submit an image-to-video animation request.

        Returns a dict that includes at minimum:
            {
                "job_id": "<provider-specific prediction id>",
                "status": "<initial status string>",
            }
        """

    @abstractmethod
    async def generate_lip_sync(
        self,
        video_url: str,
        audio_url: str,
    ) -> dict:
        """
        Submit a lip-sync generation request.

        Returns a dict that includes at minimum:
            {
                "job_id": "<provider-specific prediction id>",
                "status": "<initial status string>",
            }
        """

    # ------------------------------------------------------------------
    # Job management
    # ------------------------------------------------------------------

    @abstractmethod
    async def get_job_status(self, job_id: str) -> dict:
        """
        Poll the current status of a previously submitted job.

        Returns a dict that includes at minimum:
            {
                "job_id":     str,
                "status":     str,   # one of our JobStatus enum values
                "progress":   int,   # 0-100
                "output_url": str | None,
                "error":      str | None,
            }
        """

    @abstractmethod
    async def cancel_job(self, job_id: str) -> bool:
        """
        Attempt to cancel a running or queued job.

        Returns True if the cancellation was accepted, False otherwise.
        """
