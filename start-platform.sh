#!/bin/bash

# Startup script for Global Business Lead Scanner Platform (CamoFlow Stack)

echo "🚀 Starting Global Business Lead Scanner Platform..."

# Check for Docker Compose option
if [ "$1" == "--docker" ] || [ "$1" == "-d" ]; then
    echo "🐳 Starting full stack via Docker Compose (n8n + MCP Bridge + Kyra)..."
    docker-compose up -d
    echo "📍 n8n: http://localhost:5678"
    echo "📍 Kyra Server: http://localhost:8790"
    echo "📍 Dashboard: http://localhost:3001"
else
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js first."
    elif ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install npm first."
    else
        # Install dependencies if node_modules doesn't exist
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install
        fi

        # Check if Playwright browsers are installed
        if ! node -e "require('playwright'); console.log('Playwright available')" &> /dev/null; then
            echo "📦 Installing Playwright browsers..."
            npx playwright install --with-deps chromium
        fi

        # Start the application
        echo "🌟 Starting the Global Business Lead Scanner Platform..."

        if [ "$1" == "--with-mcp" ]; then
            echo "🔌 Starting local MCP bridge in background..."
            npm run mcp:n8n > mcp.log 2>&1 &
        fi

        node app.js &
        node kyra-server.js

        echo "👋 Platform stopped."
    fi
fi
