#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo " ClipForge - AI Video Studio"
echo "=========================================="
echo ""
echo "Starting backend (FastAPI on port 8000)..."
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 3

echo "Starting frontend (Next.js on port 3000)..."
cd "$SCRIPT_DIR/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo " ClipForge is running!"
echo " Frontend: http://localhost:3000"
echo " Backend:  http://localhost:8000"
echo " API Docs: http://localhost:8000/docs"
echo "=========================================="
echo ""
echo "Running in DEMO MODE - no API keys needed."
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
