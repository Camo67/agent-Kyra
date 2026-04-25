#!/bin/bash

# Kyra n8n Configuration Script
# This script helps set up n8n with the correct configuration for Kyra workflows

echo "🔧 Kyra n8n Configuration Script"
echo "================================="

# Check if n8n is running
if pgrep -f "n8n start" > /dev/null; then
    echo "❌ n8n is already running. Please stop it first with: pkill -f 'n8n start'"
    exit 1
fi

# Load environment variables
if [ -f "local.env" ]; then
    echo "📄 Loading environment variables from local.env..."
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        export "$key=$value"
    done < local.env
else
    echo "❌ local.env file not found!"
    exit 1
fi

# Determine n8n port
DEFAULT_PORT=9090
N8N_PORT=${N8N_PORT:-$DEFAULT_PORT}
while ss -ltn | awk '{print $4}' | grep -Eq ":$N8N_PORT$"; do
    echo "⚠️  Port $N8N_PORT is already in use. Trying next port..."
    N8N_PORT=$((N8N_PORT + 1))
    if [ "$N8N_PORT" -gt 9100 ]; then
        echo "❌ No available port found between $DEFAULT_PORT and 9100"
        exit 1
    fi
done

N8N_BASE_URL=${N8N_BASE_URL:-"http://localhost:$N8N_PORT"}

echo "🚀 Starting n8n with authentication disabled..."
echo "📍 n8n will be available at: $N8N_BASE_URL"
echo "🔑 No authentication required for development"
echo ""
echo "To stop n8n later, run: pkill -f 'n8n start'"
echo ""

export N8N_AUTH_DISABLED=true
export N8N_PORT="$N8N_PORT"
export N8N_BASE_URL
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false

n8n start
