#!/bin/bash

# Kyra n8n Workflow Import Script
# This script imports all Kyra workflows into a running n8n instance

echo "📥 Kyra n8n Workflow Import Script"
echo "==================================="

# Check if n8n is running
if ! pgrep -f "n8n start" > /dev/null; then
    echo "❌ n8n is not running. Please start it first with: ./start-n8n.sh"
    exit 1
fi

# Load environment variables
if [ -f "local.env" ]; then
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        export "$key=$value"
    done < local.env
fi

N8N_BASE_URL=${N8N_BASE_URL:-"http://localhost:9090"}

# Wait for n8n to be ready
echo "⏳ Waiting for n8n to be ready at $N8N_BASE_URL..."
for i in {1..20}; do
    if curl -s "$N8N_BASE_URL/rest/health" >/dev/null 2>&1; then
        echo "✅ n8n is ready"
        break
    fi
    sleep 1
    printf "."
    if [ "$i" -eq 20 ]; then
        echo ""
        echo "❌ n8n did not become ready in time. Please start n8n first."
        exit 1
    fi
done

authorization_header=""
if [ -n "$N8N_API_TOKEN" ]; then
    authorization_header="-H \"X-N8N-API-KEY: $N8N_API_TOKEN\""
fi

# Import workflows
WORKFLOWS=(
    "n8n/kyra-telegram-bridge.workflow.json"
    "n8n/kyra-memory-writer.workflow.json"
    "n8n/kyra-obsidian-voice-bridge.workflow.json"
    "n8n/kyra-playwright-tool.workflow.json"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        echo "📤 Importing $workflow..."
        curl -s -X POST "$N8N_BASE_URL/rest/workflows" \
             -H "Content-Type: application/json" \
             $authorization_header \
             -d "@$workflow" | jq '.data.name // .message' 2>/dev/null || echo "  ❌ Failed to import $workflow"
    else
        echo "⚠️  $workflow not found, skipping..."
    fi
done

echo ""
echo "✅ Workflow import complete!"
echo "🔗 Open n8n at: $N8N_BASE_URL"
echo "🎯 Activate the workflows using the toggle in the top-right of each workflow"
