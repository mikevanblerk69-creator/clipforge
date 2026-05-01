#!/bin/bash
echo "============================================"
echo " ClipForge - GitHub Setup"
echo "============================================"
echo ""
echo "You need a GitHub Personal Access Token."
echo "Create one at: https://github.com/settings/tokens"
echo "Required scopes: repo, workflow"
echo ""
read -p "Enter your GitHub username: " USERNAME
read -sp "Enter your GitHub Personal Access Token: " TOKEN
echo ""
echo ""
echo "Creating GitHub repository..."
curl -s -X POST https://api.github.com/user/repos \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"clipforge","description":"Full-stack AI video studio","private":false}'
echo ""
echo "Adding remote and pushing..."
git remote add origin "https://$USERNAME:$TOKEN@github.com/$USERNAME/clipforge.git"
git branch -M main
git push -u origin main
echo ""
echo "============================================"
echo " Done! Repo pushed to GitHub."
echo " Now deploy frontend: https://vercel.com/new"
echo " And backend: https://railway.app/new"
echo "============================================"
