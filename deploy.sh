#!/usr/bin/env bash
# deploy.sh — pull latest Kyra changes and restart services
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
N8N_URL="${N8N_URL:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-}"

echo "==> Pulling latest from main..."
cd "$REPO_DIR"
git pull origin main

# Restart kyra-server via pm2 if available, else node directly
if command -v pm2 &>/dev/null; then
  echo "==> Restarting kyra-server via pm2..."
  pm2 restart kyra-server 2>/dev/null || pm2 start kyra-server.js --name kyra-server
else
  echo "⚠️  pm2 not found — restart kyra-server.js manually."
fi

# Import / update n8n workflows via API (requires N8N_API_KEY)
if [ -n "$N8N_API_KEY" ]; then
  echo "==> Importing n8n workflows..."
  for workflow in n8n/*.workflow.json; do
    name=$(basename "$workflow")
    echo "    -> $name"
    curl -s -X POST "${N8N_URL}/api/v1/workflows" \
      -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
      -H "Content-Type: application/json" \
      -d @"$workflow" | python3 -c "import sys,json; d=json.load(sys.stdin); print('       id:', d.get('id','?'), 'name:', d.get('name','?'))" 2>/dev/null || echo "       (already exists — update manually in n8n UI)"
  done
else
  echo "ℹ️  Set N8N_API_KEY to auto-import workflows, or import manually:"
  echo "    n8n/kyra-telegram-bridge.workflow.json"
  echo "    n8n/kyra-atlas-agent.workflow.json"
fi

echo ""
echo "✅ Done. Kyra should be live on port 8790."
echo "   Test: curl http://localhost:8790/health"
