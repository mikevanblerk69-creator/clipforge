@echo off
echo ==========================================
echo  ClipForge - AI Video Studio
echo ==========================================
echo.
echo Starting backend (FastAPI on port 8000)...
start "ClipForge Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt -q && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 4 /nobreak >nul

echo Starting frontend (Next.js on port 3000)...
start "ClipForge Frontend" cmd /k "cd /d %~dp0frontend && npm install --silent && npm run dev"

echo.
echo ==========================================
echo  ClipForge is starting up!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo ==========================================
echo.
echo Running in DEMO MODE - no API keys needed.
echo Press any key to exit this window (servers keep running).
pause >nul
