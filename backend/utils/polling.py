"""
Async polling utilities for waiting on long-running AI model jobs.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from services.model_adapter import ModelAdapter

logger = logging.getLogger(__name__)

# Terminal statuses — stop polling when we reach one of these
_TERMINAL_STATUSES = {"completed", "failed"}


async def poll_until_complete(
    job_id: str,
    adapter: ModelAdapter,
    max_attempts: int = 60,
    interval: int = 5,
) -> dict:
    """
    Poll *adapter.get_job_status(job_id)* every *interval* seconds until
    the job reaches a terminal state or *max_attempts* is exhausted.

    Parameters
    ----------
    job_id:       Provider-specific prediction / job identifier.
    adapter:      ModelAdapter instance to query.
    max_attempts: Maximum number of polling attempts before giving up.
    interval:     Seconds to wait between attempts.

    Returns
    -------
    The final status dict returned by the adapter once a terminal state
    is reached (status == "completed" or "failed").

    Raises
    ------
    TimeoutError  If the job has not finished after *max_attempts* polls.
    """
    last_status: Optional[dict] = None

    for attempt in range(1, max_attempts + 1):
        try:
            status = await adapter.get_job_status(job_id)
        except Exception as exc:
            logger.warning(
                "poll_until_complete: attempt %d/%d for job %s raised %s: %s",
                attempt,
                max_attempts,
                job_id,
                type(exc).__name__,
                exc,
            )
            # Allow transient network errors — still wait and retry
            await asyncio.sleep(interval)
            continue

        last_status = status
        current = status.get("status", "")
        progress = status.get("progress", 0)

        logger.debug(
            "poll job=%s attempt=%d/%d status=%s progress=%d%%",
            job_id,
            attempt,
            max_attempts,
            current,
            progress,
        )

        if current in _TERMINAL_STATUSES:
            return status

        await asyncio.sleep(interval)

    raise TimeoutError(
        f"Job {job_id} did not complete after {max_attempts} attempts "
        f"({max_attempts * interval}s). Last status: {last_status}"
    )
