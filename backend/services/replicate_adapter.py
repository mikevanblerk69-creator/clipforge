"""
Replicate.com implementation of ModelAdapter.

Uses the Replicate REST API via httpx (async) rather than the blocking SDK
so it integrates cleanly into FastAPI's async event loop.

Models
------
- Text-to-video : lucataco/animate-diff
- Image-to-video: stability-ai/stable-video-diffusion
- Lip-sync      : devxpy/cog-wav2lip
"""

from __future__ import annotations

import os
import time
from typing import Optional

import httpx

from services.model_adapter import ModelAdapter

# ---------------------------------------------------------------------------
# Replicate model version IDs
# ---------------------------------------------------------------------------
_TEXT2VIDEO_MODEL = (
    "lucataco/animate-diff:"
    "beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f"
)
_IMAGE2VIDEO_MODEL = (
    "stability-ai/stable-video-diffusion:"
    "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438"
)
_LIPSYNC_MODEL = (
    "devxpy/cog-wav2lip:"
    "8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aea6165e182240f"
)

_REPLICATE_BASE = "https://api.replicate.com/v1/predictions"

# ---------------------------------------------------------------------------
# Status mapping: Replicate → ClipForge
# ---------------------------------------------------------------------------
_STATUS_MAP: dict[str, str] = {
    "starting": "processing",
    "processing": "processing",
    "succeeded": "completed",
    "failed": "failed",
    "canceled": "failed",
}

# ---------------------------------------------------------------------------
# Approximate progress curves (model_key → list of (elapsed_seconds, progress))
# Interpolated linearly between checkpoints.
# ---------------------------------------------------------------------------
_PROGRESS_CURVES: dict[str, list[tuple[int, int]]] = {
    "text2video": [(0, 2), (30, 20), (60, 45), (120, 70), (180, 90), (240, 99)],
    "image2video": [(0, 2), (20, 20), (45, 50), (90, 80), (120, 95), (150, 99)],
    "lipsync": [(0, 2), (15, 25), (30, 55), (60, 85), (90, 99)],
}


def _estimate_progress(model_key: str, elapsed: float) -> int:
    """Linearly interpolate a progress percentage from the elapsed time."""
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
        self._token = api_token or os.environ["REPLICATE_API_TOKEN"]
        self._headers = {
            "Authorization": f"Token {self._token}",
            "Content-Type": "application/json",
        }
        # Track job creation times for progress estimation: {job_id: (timestamp, model_key)}
        self._job_meta: dict[str, tuple[float, str]] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _post_prediction(self, version: str, input_data: dict) -> dict:
        """Create a new Replicate prediction and return the raw API response."""
        payload = {"version": version, "input": input_data}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(_REPLICATE_BASE, json=payload, headers=self._headers)
            resp.raise_for_status()
            return resp.json()

    async def _get_prediction(self, job_id: str) -> dict:
        """Fetch the current state of a prediction from the REST API."""
        url = f"{_REPLICATE_BASE}/{job_id}"
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
        # Map our enums to AnimateDiff input parameters
        width, height = _resolve_dimensions(aspect_ratio, quality)
        num_frames = 16 if duration <= 5 else 32

        input_data: dict = {
            "prompt": _style_prefix(style) + prompt,
            "num_frames": num_frames,
            "num_inference_steps": 25 if quality == "standard" else 50,
            "guidance_scale": 7.5,
            "width": width,
            "height": height,
        }
        if negative_prompt:
            input_data["negative_prompt"] = negative_prompt

        data = await self._post_prediction(_TEXT2VIDEO_MODEL, input_data)
        job_id: str = data["id"]
        self._job_meta[job_id] = (time.time(), "text2video")
        return {"job_id": job_id, "status": _STATUS_MAP.get(data.get("status", "starting"), "processing")}

    async def generate_image_to_video(
        self,
        image_url: str,
        motion_prompt: Optional[str],
        duration: int,
        aspect_ratio: str,
    ) -> dict:
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
            # SVD doesn't accept text prompts natively, but we include it as
            # metadata so downstream processors can use it if the model supports it.
            input_data["motion_prompt"] = motion_prompt

        data = await self._post_prediction(_IMAGE2VIDEO_MODEL, input_data)
        job_id: str = data["id"]
        self._job_meta[job_id] = (time.time(), "image2video")
        return {"job_id": job_id, "status": _STATUS_MAP.get(data.get("status", "starting"), "processing")}

    async def generate_lip_sync(
        self,
        video_url: str,
        audio_url: str,
    ) -> dict:
        input_data: dict = {
            "face": video_url,
            "audio": audio_url,
        }
        data = await self._post_prediction(_LIPSYNC_MODEL, input_data)
        job_id: str = data["id"]
        self._job_meta[job_id] = (time.time(), "lipsync")
        return {"job_id": job_id, "status": _STATUS_MAP.get(data.get("status", "starting"), "processing")}

    async def get_job_status(self, job_id: str) -> dict:
        data = await self._get_prediction(job_id)

        replicate_status: str = data.get("status", "starting")
        our_status = _STATUS_MAP.get(replicate_status, "processing")

        # Determine output URL
        output_url: Optional[str] = None
        if our_status == "completed":
            output = data.get("output")
            if isinstance(output, list) and output:
                output_url = output[-1]  # last frame / final video URL
            elif isinstance(output, str):
                output_url = output

        # Estimate progress
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
        url = f"{_REPLICATE_BASE}/{job_id}/cancel"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(url, headers=self._headers)
                return resp.status_code in (200, 201)
            except httpx.HTTPError:
                return False


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _resolve_dimensions(aspect_ratio: str, quality: str) -> tuple[int, int]:
    """Return (width, height) based on aspect ratio and quality tier."""
    base_sizes = {
        "16:9": (512, 288),
        "9:16": (288, 512),
        "1:1": (384, 384),
    }
    pro_sizes = {
        "16:9": (768, 432),
        "9:16": (432, 768),
        "1:1": (512, 512),
    }
    mapping = pro_sizes if quality == "pro" else base_sizes
    return mapping.get(aspect_ratio, (512, 288))


def _style_prefix(style: str) -> str:
    """Return a prompt prefix that nudges the model toward the requested style."""
    prefixes = {
        "cinematic": "cinematic film still, professional cinematography, depth of field, ",
        "anime": "anime style, vibrant colors, Studio Ghibli aesthetic, cel shading, ",
        "realistic": "photorealistic, ultra detailed, 8k, high resolution, ",
        "abstract": "abstract art, surreal, non-representational, artistic, ",
    }
    return prefixes.get(style, "")
