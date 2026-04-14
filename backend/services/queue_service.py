"""
Upstash Redis job queue using the Upstash Redis REST API via httpx.

We do NOT use redis-py because Upstash REST is HTTP-based and integrates
cleanly with async FastAPI without a connection pool.

Key layout
----------
  job:{job_id}   → JSON string of the full job dict
  job_queue      → Redis list used as a FIFO queue (RPUSH to enqueue, BLPOP/LPOP to dequeue)
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Optional

import httpx


class QueueService:
    """Async job queue backed by Upstash Redis REST API."""

    def __init__(
        self,
        rest_url: Optional[str] = None,
        rest_token: Optional[str] = None,
    ) -> None:
        self._rest_url = (rest_url or os.environ["UPSTASH_REDIS_REST_URL"]).rstrip("/")
        self._token = rest_token or os.environ["UPSTASH_REDIS_REST_TOKEN"]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @property
    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"}

    async def _execute(self, *args: str | int) -> dict:
        """
        Execute a Redis command via the Upstash REST API.

        The Upstash REST endpoint accepts commands as a JSON array posted
        to the root URL:   POST /  body: ["COMMAND", "arg1", "arg2", ...]
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                self._rest_url,
                json=list(args),
                headers={**self._headers, "Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def enqueue_job(self, job_data: dict) -> str:
        """
        Persist job_data and push its ID onto the queue list.

        Returns the generated job_id.
        """
        job_id: str = job_data.get("job_id") or str(uuid.uuid4())
        job_data = {**job_data, "job_id": job_id}

        # Store the job record
        await self._execute("SET", f"job:{job_id}", json.dumps(job_data))
        # Push job_id onto the queue list
        await self._execute("RPUSH", "job_queue", job_id)

        return job_id

    async def get_job(self, job_id: str) -> Optional[dict]:
        """Retrieve a job record by ID.  Returns None if not found."""
        result = await self._execute("GET", f"job:{job_id}")
        raw = result.get("result")
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return None

    async def update_job(self, job_id: str, updates: dict) -> bool:
        """
        Merge *updates* into the existing job record.

        Returns True if the record existed and was updated, False otherwise.
        """
        existing = await self.get_job(job_id)
        if existing is None:
            return False
        merged = {**existing, **updates}
        await self._execute("SET", f"job:{job_id}", json.dumps(merged))
        return True

    async def dequeue_next_job(self) -> Optional[dict]:
        """
        Pop the oldest job_id from the queue and return its full record.

        Returns None if the queue is empty.
        """
        result = await self._execute("LPOP", "job_queue")
        job_id = result.get("result")
        if not job_id:
            return None
        return await self.get_job(job_id)
