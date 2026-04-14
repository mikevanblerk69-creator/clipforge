# ClipForge — Deployment Guide

This guide covers deploying ClipForge for **real production use** with actual API keys.
All services used have **free tiers** sufficient to get started.

---

## Architecture

| Layer    | Service            | Purpose                        |
|----------|--------------------|--------------------------------|
| Frontend | Vercel             | Next.js hosting + CDN          |
| Backend  | Railway            | FastAPI Python server          |
| Database | Supabase           | PostgreSQL + Auth + Storage    |
| AI       | Replicate          | Video generation models        |
| Queue    | Upstash Redis      | Background job queue           |

---

## Step 1 — Supabase Setup (~3 minutes)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to your users, set a DB password
3. Once created, go to **SQL Editor** and paste the full contents of `supabase/schema.sql`
4. Click **Run** to create all tables, triggers, and RLS policies
5. Go to **Settings → API** and copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **anon/public key**
   - **service_role key** (keep this secret — backend only)
6. Go to **Storage** → create two buckets:
   - `videos` (public)
   - `images` (public)

---

## Step 2 — Replicate Setup (~1 minute)

1. Go to [replicate.com](https://replicate.com) → sign up (free)
2. Go to **Account → API Tokens** → copy your token (`r8_...`)

---

## Step 3 — Upstash Redis Setup (~2 minutes)

1. Go to [upstash.com](https://upstash.com) → **Create Database**
2. Choose **Redis**, pick a region
3. Copy the **REST URL** and **REST Token** from the dashboard

---

## Step 4 — Deploy Backend to Railway (~3 minutes)

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Connect your repo and select the `clipforge/` root
3. Set **Root Directory** to `backend`
4. Railway auto-detects the `Dockerfile` in `docker/` or uses `requirements.txt`
5. Add environment variables in Railway dashboard:

```
DEMO_MODE=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REPLICATE_API_TOKEN=r8_your-token
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
FRONTEND_URL=https://your-vercel-app.vercel.app
ADMIN_API_KEY=generate-a-random-secret-here
ENV=production
```

6. Deploy. Railway gives you a URL like `https://clipforge-backend.up.railway.app`

**Dockerfile** (already at `docker/Dockerfile`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Step 5 — Deploy Frontend to Vercel (~2 minutes)

### Option A: Vercel CLI

```bash
cd clipforge/frontend
npx vercel --prod
```

When prompted:
- Link to existing project or create new
- Framework: **Next.js** (auto-detected)
- Root directory: `./` (you're already in `frontend/`)

### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) → **New Project → Import from GitHub**
2. Set **Root Directory** to `frontend`
3. Framework: **Next.js** (auto-detected)

### Environment Variables for Vercel

Add these in **Project Settings → Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
```

---

## Step 6 — Update CORS on Backend

In `backend/main.py`, update the `FRONTEND_URL` env var to your Vercel URL, or set:
```python
allow_origins=["https://your-app.vercel.app"]
```

---

## Step 7 — Configure Supabase Auth

1. In Supabase dashboard → **Authentication → URL Configuration**
2. Set **Site URL**: `https://your-app.vercel.app`
3. Add **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Production Checklist

- [ ] `DEMO_MODE=false` on backend
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` on frontend
- [ ] Real Supabase URL and keys set
- [ ] Real Replicate token set
- [ ] Real Upstash credentials set
- [ ] Supabase schema.sql executed
- [ ] Storage buckets `videos` and `images` created
- [ ] Backend deployed and responding to `/health`
- [ ] Frontend deployed and can reach backend
- [ ] Supabase auth redirect URLs configured

---

## Demo Mode (local dev)

To run locally without any API keys:

```bash
# Windows
clipforge\start.bat

# Mac/Linux
bash clipforge/start.sh
```

Both servers use `DEMO_MODE=true` which bypasses all external APIs.
Videos complete in ~5 seconds using a sample Pexels clip.

---

## Troubleshooting

**CORS errors**: Make sure `FRONTEND_URL` env var on backend matches your exact Vercel URL.

**Auth not working**: Check Supabase → Authentication → URL Configuration has your Vercel URL.

**Videos not saving**: Check Supabase Storage buckets exist and are public.

**Railway deploy fails**: Ensure `docker/Dockerfile` copies from `backend/` and the Railway root directory is set to the repo root (not `backend/`).
