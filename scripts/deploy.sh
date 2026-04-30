#!/bin/bash
set -e

# SYSU-Arxiv Deployment Script
# Deploys the application to Tencent Cloud server

SERVER="ubuntu@43.136.42.69"
SSH_KEY="/Users/mac/.ssh/id_rsa"
REMOTE_DIR="/var/www/sysu-arxiv"
BACKEND_PORT="8083"

echo "=== SYSU-Arxiv Deployment ==="

# Build frontend
echo "Building frontend..."
cd /Users/mac/foo/sysu-arxiv/frontend
npm run build

# Build backend
echo "Building backend..."
cd /Users/mac/foo/sysu-arxiv/backend
GOPROXY=https://goproxy.cn,direct GOOS=linux GOARCH=amd64 go build -o sysu-arxiv-backend

# Deploy to server
echo "Deploying to server..."
ssh -i "$SSH_KEY" "$SERVER" "sudo mkdir -p $REMOTE_DIR/{frontend,backend,data/uploads} && sudo chown -R ubuntu:ubuntu $REMOTE_DIR"

# Sync files
rsync -avz --delete \
  /Users/mac/foo/sysu-arxiv/frontend/dist/ \
  -e "ssh -i $SSH_KEY" \
  "$SERVER:$REMOTE_DIR/frontend/"

rsync -avz \
  /Users/mac/foo/sysu-arxiv/backend/sysu-arxiv-backend \
  -e "ssh -i $SSH_KEY" \
  "$SERVER:$REMOTE_DIR/backend/"

rsync -avz \
  /Users/mac/foo/sysu-arxiv/data/sysu-arxiv.db \
  -e "ssh -i $SSH_KEY" \
  "$SERVER:$REMOTE_DIR/data/"

# Restart backend with pm2
ssh -i "$SSH_KEY" "$SERVER" "cd $REMOTE_DIR/backend && pm2 restart sysu-arxiv-backend || pm2 start ./sysu-arxiv-backend --name sysu-arxiv-backend -- -port $BACKEND_PORT -data $REMOTE_DIR/data"

echo "=== Deployment Complete ==="
echo "Frontend: https://arxiv.jaison.ink"
echo "API: http://$SERVER:$BACKEND_PORT"
