"""
ClipForge API — main application entry point.

Start with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before anything else so env vars are available at import time
load_dotenv()

from routers import auth, credits, jobs, lipsync, payments, stripe_payments, videos  # noqa: E402

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown hooks."""
    logger.info("ClipForge API started")
    logger.info("Environment: %s", os.environ.get("ENV", "development"))
    yield
    logger.info("ClipForge API shutting down")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ClipForge API",
    version="1.0.0",
    description=(
        "AI-powered video generation studio — text-to-video, image-to-video, "
        "and lip-sync generation backed by Replicate models."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(videos.router)
app.include_router(lipsync.router)
app.include_router(jobs.router)
app.include_router(credits.router)
app.include_router(payments.router)          # PayFast — ZAR (South Africa)
app.include_router(stripe_payments.router)   # Stripe  — USD (international)

# ---------------------------------------------------------------------------
# Root / health endpoints
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"status": "ok", "service": "ClipForge API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health() -> dict:
    """Kubernetes / load-balancer health probe."""
    return {"status": "healthy"}
