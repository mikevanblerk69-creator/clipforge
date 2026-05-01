@echo off
echo ============================================
echo  ClipForge - GitHub Setup
echo ============================================
echo.
echo You need a GitHub Personal Access Token.
echo Create one at: https://github.com/settings/tokens
echo Required scopes: repo, workflow
echo.
set /p USERNAME="Enter your GitHub username: "
set /p TOKEN="Enter your GitHub Personal Access Token: "
echo.
echo Creating GitHub repository...
curl -s -X POST https://api.github.com/user/repos ^
  -H "Authorization: token %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"clipforge\",\"description\":\"Full-stack AI video studio\",\"private\":false}"
echo.
echo Adding remote and pushing...
git remote add origin https://%USERNAME%:%TOKEN%@github.com/%USERNAME%/clipforge.git
git branch -M main
git push -u origin main
echo.
echo ============================================
echo  Done! Repo pushed to GitHub.
echo  Now deploy frontend: go to https://vercel.com/new
echo  And backend: go to https://railway.app/new
echo ============================================
pause
