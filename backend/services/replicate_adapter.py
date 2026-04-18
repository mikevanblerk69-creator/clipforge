"""
Replicate.com implementation of ModelAdapter.

Uses the Replicate REST API via httpx (async) — no blocking SDK needed.

Models (all use latest-version endpoint — no stale hash pinning)
-----------------------------------------------------------------
- Text-to-video : minimax/video-01           (MiniMax Video 01 — best quality)
- Image-to-video: stability-ai/stable-video-diffusion
- Lip-sync      : devxpy/cog-wav2lip
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional

import httpx

from services.model_adapter import ModelAdapter

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model identifiers  (owner/name — no version hashes, always uses latest)
# ---------------------------------------------------------------------------
_TEXT2VIDEO_MODEL   = "minimax/video-01"
_IMAGE2VIDEO_MODEL  = "stability-ai/stable-video-diffusion"
_LIPSYNC_MODEL      = "devxpy/cog-wav2lip"

_REPLICATE_BASE        = "https://api.replicate.com/v1"
_PREDICTIONS_ENDPOINT  = f"{_REPLICATE_BASE}/predictions"

# ---------------------------------------------------------------------------
# Status mapping: Replicate → ClipForge
# ---------------------------------------------------------------------------
_STATUS_MAP: dict[str, str] = {
    "starting":   "processing",
    "processing": "processing",
    "succeeded":  "completed",
    "failed":     "failed",
    "canceled":   "failed",
}

# ---------------------------------------------------------------------------
# Approximate progress curves (model_key → [(elapsed_secs, pct)])
# ---------------------------------------------------------------------------
_PROGRESS_CURVES: dict[str, list[tuple[int, int]]] = {
    "text2video":  [(0, 2), (15, 10), (30, 25), (60, 50), (120, 75), (180, 92), (240, 99)],
    "image2video": [(0, 2), (10, 15), (25, 40), (50, 70), (90, 90),  (120, 99)],
    "lipsync":     [(0, 2), (10, 20), (25, 50), (50, 80), (80, 99)],
}


def _estimate_progress(model_key: str, elapsed: float) -> int:
    curve = _PROGRESS_CURVES.get(model_key, _PROGRESS_CURVES["text2video"])
    if elapsed <= curve[0][0]:
        return curve[0][1]
    for i in range(len(curve) - 1):
        t0, p0 = curve[i]
        t1, p1 = curve[i + 1]
        if t0 <= elapsed <= t1:
            fraction = (elapsed - t0) / (t1 - t0)
            return int(p0 + fraction * (p1 - p0))
    return curve[-1][1]


class ReplicateAdapter(ModelAdapter):
    """Async Replicate.com adapter using httpx."""

    def __init__(self, api_token: Optional[str] = None) -> None:
        self._token = api_token or os.environ.get("REPLICATE_API_TOKEN", "")
        self._headers = {
            "Authorization": f"Token {self._token}",
            "Content-Type": "application/json",
        }
        # job_id → (created_at_timestamp, model_key)
        self._job_meta: dict[str, tuple[float, str]] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _post_prediction(self, model: str, input_data: dict) -> dict:
        """
        Create a Replicate prediction using the /models/{owner}/{name}/predictions
        endpoint (always runs the latest deployed version — no stale hash needed).
        Falls back to /predictions with version hash if model contains ':'.
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            if ":" in model:
                # Legacy: explicit version hash
                owner_name, version = model.split(":", 1)
                payload = {"version": version, "input": input_data}
                resp = await client.post(
                    _PREDICTIONS_ENDPOINT, json=payload, headers=self._headers
                )
            else:
                # Modern: /models/{owner}/{name}/predictions  (latest version)
                owner, name = model.split("/", 1)
                url = f"{_REPLICATE_BASE}/models/{owner}/{name}/predictions"
                payload = {"input": input_data}
                resp = await client.post(url, json=payload, headers=self._headers)

            if resp.status_code not in (200, 201):
                logger.error(
                    "Replicate API error %d: %s", resp.status_code, resp.text[:300]
                )
                resp.raise_for_status()
            return resp.json()

    async def _get_prediction(self, job_id: str) -> dict:
        url = f"{_PREDICTIONS_ENDPOINT}/{job_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=self._headers)
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # ModelAdapter implementation
    # ------------------------------------------------------------------

    async def generate_text_to_video(
        self,
        prompt: str,
        negative_prompt: Optional[str],
        style: str,
        duration: int,
        aspect_ratio: str,
        quality: str,
    ) -> dict:
        """Submit a text-to-video job using MiniMax Video-01."""
        full_prompt = _style_prefix(style) + prompt

        input_data: dict = {
            "prompt": full_prompt,
            "prompt_optimizer": True,
        }

        data = await self._post_prediction(_TEXT2VIDEO_MODEL, input_data)
        job_id: str = data["id"]
        self._job_meta[job_id] = (time.time(), "text2video")
        logger.info("text2video prediction created: %s", job_id)
        return {
            "job_id": job_id,
            "status": _STATUS_MAP.get(data.get("status", "starting"), "processing"),
        }

    async def generate_image_to_video(
        self,
        image_url: str,
        motion_prompt: Optional[str],
        duration: int,
        aspect_ratio: str,
    ) -> dict:
        """Submit an image-to-video job using Stable Video Diffusion."""
        num_frames = 14 if duration <= 5 else 25

        input_data: dict = {
            "input_image": image_url,
            "video_length": f"{num_frames}_frames_with_svd",
            "sizing_strategy": "input_image",
            "frames_per_second": 6,
            "motion_bucket_id": 127,
            "cond_aug": 0.02,
            "decoding_t": 7,
        }
        if motion_prompt:
            input_data["motion_prompt"] = motion_prompt

        data = await self._post_prediction(_IMAGE2VIDEO_MODEL, input_data)
        job_id: str = data["id"]
        self._job_meta[job_id] = (time.time(), "image2video")
        logger.info("image2video prediction created: %s", job_id)
        return {
            "job_id": job_id,
            "status": _STATUS_MAP.get(data.get("status", "starting"), "processing"),
        }

    async def generate_lip_sync(self, video_url: str, audio_url: str) -> dict:
        """Submit a lip-sync job using cog-wav2lip."""
        input_data: dict = {"face": video_url, "audio": audio_url}
        data = await self._post_prediction(_LIPSYNC_MODEL, input_data)
        job_id: str = data["id"]
        self._job_meta[job_id] = (time.time(), "lipsync")
        logger.info("lipsync prediction created: %s", job_id)
        return {
            "job_id": job_id,
            "status": _STATUS_MAP.get(data.get("status", "starting"), "processing"),
        }

    async def get_job_status(self, job_id: str) -> dict:
        data = await self._get_prediction(job_id)

        replicate_status: str = data.get("status", "starting")
        our_status = _STATUS_MAP.get(replicate_status, "processing")

        # Extract output URL — handle list or string output
        output_url: Optional[str] = None
        if our_status == "completed":
            output = data.get("output")
            if isinstance(output, list) and output:
                # Some models return list of frame URLs — last item is the video
                output_url = output[-1]
            elif isinstance(output, str):
                output_url = output
            elif isinstance(output, dict):
                # MiniMax returns {"video_url": "..."}
                output_url = output.get("video_url") or output.get("url")

        # Estimate progress percentage
        if our_status == "completed":
            progress = 100
        elif our_status == "failed":
            progress = 0
        else:
            created_ts, model_key = self._job_meta.get(job_id, (time.time(), "text2video"))
            elapsed = time.time() - created_ts
            progress = _estimate_progress(model_key, elapsed)

        error: Optional[str] = data.get("error")

        return {
            "job_id": job_id,
            "status": our_status,
            "progress": progress,
            "output_url": output_url,
            "error": error,
        }

    async def cancel_job(self, job_id: str) -> bool:
        url = f"{_PREDICTIONS_ENDPOINT}/{job_id}/cancel"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(url, headers=self._headers)
                return resp.status_code in (200, 201)
            except httpx.HTTPError:
                return False


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _style_prefix(style: str) -> str:
    """Return a prompt prefix that steers the model toward the requested style."""
    prefixes = {
        "cinematic": "cinematic film shot, professional camera work, dramatic lighting, ",
        "anime":     "anime style, vibrant colors, Studio Ghibli aesthetic, ",
        "realistic": "photorealistic, ultra-detailed, 8k quality, ",
        "abstract":  "abstract art, surreal, artistic composition, ",
    }
    return prefixes.get(style, "")
