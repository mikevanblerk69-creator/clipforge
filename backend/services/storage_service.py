"""
Supabase Storage integration.

All operations use the Supabase Storage REST API directly via httpx so we
avoid the synchronous supabase-py client.

Bucket layout
-------------
  videos/{user_id}/{job_id}.mp4
  images/{user_id}/{filename}
"""

from __future__ import annotations

import os
from typing import Optional

import httpx


class StorageService:
    """Async Supabase Storage client."""

    VIDEO_BUCKET = "videos"
    IMAGE_BUCKET = "images"

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        service_role_key: Optional[str] = None,
    ) -> None:
        self._base_url = (supabase_url or os.environ["SUPABASE_URL"]).rstrip("/")
        self._service_key = service_role_key or os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self._storage_url = f"{self._base_url}/storage/v1"

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _auth_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._service_key}",
            "apikey": self._service_key,
        }

    def _object_url(self, bucket: str, path: str) -> str:
        return f"{self._storage_url}/object/{bucket}/{path}"

    def _public_url(self, bucket: str, path: str) -> str:
        return f"{self._storage_url}/public/{bucket}/{path}"

    async def _ensure_bucket(self, bucket: str, client: httpx.AsyncClient) -> None:
        """Create bucket if it does not already exist."""
        resp = await client.post(
            f"{self._storage_url}/bucket",
            json={"id": bucket, "name": bucket, "public": True},
            headers={**self._auth_headers, "Content-Type": "application/json"},
        )
        # 200/201 = created, 400 with "already exists" = fine
        if resp.status_code not in (200, 201) and "already exists" not in resp.text:
            resp.raise_for_status()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def upload_video(self, user_id: str, job_id: str, video_url: str) -> str:
        """
        Download the video at *video_url* and upload it to Supabase Storage.

        Returns the public URL for the stored video.
        """
        storage_path = f"{user_id}/{job_id}.mp4"

        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            # 1. Download the video from the source URL
            download_resp = await client.get(video_url)
            download_resp.raise_for_status()
            video_bytes = download_resp.content

            # 2. Ensure the bucket exists
            await self._ensure_bucket(self.VIDEO_BUCKET, client)

            # 3. Upload to Supabase Storage
            upload_resp = await client.post(
                self._object_url(self.VIDEO_BUCKET, storage_path),
                content=video_bytes,
                headers={
                    **self._auth_headers,
                    "Content-Type": "video/mp4",
                    "x-upsert": "true",
                },
            )
            upload_resp.raise_for_status()

        return self._public_url(self.VIDEO_BUCKET, storage_path)

    async def upload_image(self, user_id: str, file_bytes: bytes, filename: str) -> str:
        """
        Upload raw image bytes to Supabase Storage.

        Returns the public URL for the stored image.
        """
        storage_path = f"{user_id}/{filename}"
        content_type = _guess_content_type(filename)

        async with httpx.AsyncClient(timeout=60.0) as client:
            await self._ensure_bucket(self.IMAGE_BUCKET, client)

            resp = await client.post(
                self._object_url(self.IMAGE_BUCKET, storage_path),
                content=file_bytes,
                headers={
                    **self._auth_headers,
                    "Content-Type": content_type,
                    "x-upsert": "true",
                },
            )
            resp.raise_for_status()

        return self._public_url(self.IMAGE_BUCKET, storage_path)

    async def delete_video(self, user_id: str, video_path: str) -> bool:
        """
        Delete a video object from Supabase Storage.

        *video_path* can be the full storage path (e.g. ``user_id/job_id.mp4``)
        or just the filename; if only the filename is passed we prepend *user_id*.
        """
        if "/" not in video_path:
            video_path = f"{user_id}/{video_path}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                self._object_url(self.VIDEO_BUCKET, video_path),
                headers=self._auth_headers,
            )
            return resp.status_code in (200, 204)


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _guess_content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
    }
    return mapping.get(ext, "application/octet-stream")
