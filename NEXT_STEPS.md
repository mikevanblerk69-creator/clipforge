# ClipForge — Deployment Next Steps

Your git repo is already initialized with 1 commit:
`21da284 Initial ClipForge build — full-stack AI video studio`

Neither GitHub CLI nor Vercel CLI are authenticated in this environment.
Follow the steps below to push to GitHub and deploy to Vercel.

---

## Step 1 — Push to GitHub

1. Go to **https://github.com/new**
2. Create a new repository named `clipforge`
   - Visibility: Public or Private (your choice)
   - **Do NOT** initialize with README, .gitignore, or license (repo must be empty)
3. Copy the repo URL (e.g. `https://github.com/mikev/clipforge.git`)
4. Open a terminal in the `clipforge` folder and run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/clipforge.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 2 — Deploy to Vercel

### Option A — Via Vercel Dashboard (easiest)

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Connect your GitHub account if not already connected
4. Select the `clipforge` repo
5. Set the **Root Directory** to `frontend`
6. Vercel will auto-detect Next.js — click **Deploy**
7. Add your environment variables in Project Settings → Environment Variables:
   - `NEXT_PUBLIC_API_URL` — your backend API URL
   - Any other `.env` variables from `frontend/.env.local`

### Option B — Via CLI

```bash
cd "C:\Users\mikev\OneDrive\Desktop\jarvis new\clipforge\frontend"
npx vercel login
npx vercel --prod
```

---

## Step 3 — Deploy the Backend (FastAPI)

The backend lives in `clipforge/backend/`. You can deploy it to:

- **Railway**: https://railway.app — drag & drop Python deploy
- **Render**: https://render.com — connect GitHub repo, set root to `backend/`
- **Fly.io**: `flyctl launch` from the `backend/` directory

Set environment variables from `backend/.env` in whichever platform you choose.

---

## Notes

- The `.gitignore` already excludes `node_modules`, `.next`, `__pycache__`, `.env` files
- Two helper scripts exist at the repo root: `setup-github.bat` and `setup-github.sh`
  (these were not committed — you can use them or the commands above)
