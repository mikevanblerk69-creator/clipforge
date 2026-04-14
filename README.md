# ClipForge — Forge Your Vision

A full-stack AI video generation studio platform. Generate stunning videos from text or images, sync lips to audio, and edit your creations — all in one dark cinematic interface.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Backend | Python FastAPI |
| Database | Supabase (auth, profiles, jobs, credits) |
| Storage | Supabase Storage (videos + images) |
| Queue | Upstash Redis (job queue) |
| AI Models | Replicate.com (AnimateDiff, SVD, Wav2Lip) |
| Hosting | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
clipforge/
├── frontend/          # Next.js 14 app
│   ├── app/           # App Router pages
│   ├── components/    # UI components
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utilities & API client
├── backend/           # Python FastAPI service
│   ├── routers/       # API route handlers
│   ├── services/      # Business logic
│   ├── models/        # Pydantic schemas
│   └── utils/         # Helper utilities
├── supabase/
│   └── schema.sql     # Database schema
├── docker/
│   └── Dockerfile     # For Railway deployment
└── .env.example       # Environment variable template
```

---

## Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier)
- A [Replicate](https://replicate.com) account (pay-per-use)
- An [Upstash](https://upstash.com) Redis instance (free tier)

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <your-repo>
cd clipforge
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. In **Storage**, create two buckets:
   - `videos` — set to **Public**
   - `images` — set to **Public**
4. Copy your project URL and API keys from **Settings → API**

### 3. Set Up Upstash Redis

1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy the **REST URL** and **REST Token**

### 4. Get Replicate API Token

1. Sign up at [replicate.com](https://replicate.com)
2. Go to **Account → API Tokens**
3. Copy your token (starts with `r8_`)

---

## Running Locally

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create env file
cp ../.env.example .env.local
# Edit .env.local with your values

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create env file
cp ../.env.example .env
# Edit .env with your values

# Start dev server
uvicorn main:app --reload --port 8000
# Runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

---

## Environment Variables

Copy `.env.example` and fill in all values:

| Variable | Description | Where to get |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase → Settings → API |
| `REPLICATE_API_TOKEN` | Replicate API token | replicate.com → Account |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | upstash.com → Database |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | upstash.com → Database |
| `NEXT_PUBLIC_API_URL` | Backend URL (frontend uses this) | `http://localhost:8000` locally |
| `FRONTEND_URL` | Frontend URL (backend CORS) | `http://localhost:3000` locally |

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Add all `NEXT_PUBLIC_*` env vars in Vercel dashboard.

### Backend → Railway

```bash
# From project root
railway init
railway up
```

Or connect your GitHub repo in [railway.app](https://railway.app) and set the root directory to `/` with the Dockerfile at `docker/Dockerfile`.

Add all backend env vars in Railway dashboard.

---

## Credit System

| Action | Cost |
|---|---|
| Text to Video (5s Standard) | 10 credits |
| Text to Video (10s Pro) | 25 credits |
| Image to Video | 15 credits |
| Lip Sync | 20 credits |
| New user signup bonus | +50 credits |

---

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

```
POST /api/v1/video/text2video    Submit text-to-video job
POST /api/v1/video/image2video   Submit image-to-video job
POST /api/v1/lipsync             Submit lip sync job
GET  /api/v1/jobs/{job_id}       Poll job status
GET  /api/v1/credits             Get credit balance
GET  /api/v1/history             Get video history
DELETE /api/v1/history/{id}      Delete a video
```

All endpoints require `Authorization: Bearer <supabase-jwt-token>` header.

---

## Adding New AI Model Backends

ClipForge uses a pluggable adapter architecture. To add a new provider (e.g., RunwayML, Kling):

1. Create `backend/services/your_adapter.py`
2. Implement the `ModelAdapter` abstract class from `model_adapter.py`
3. Update `video_service.py` to use your new adapter

```python
# Example: services/runway_adapter.py
from .model_adapter import ModelAdapter

class RunwayAdapter(ModelAdapter):
    async def generate_text_to_video(self, ...):
        # Your RunwayML API calls here
        pass
```

---

## License

MIT — built with love in Cape Town 🇿🇦
