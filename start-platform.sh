#!/bin/bash

# Startup script for Global Business Lead Scanner Platform

echo "🚀 Starting Global Business Lead Scanner Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if Playwright browsers are installed
if ! node -e "require('playwright'); console.log('Playwright available')" &> /dev/null; then
    echo "📦 Installing Playwright browsers..."
    npx playwright install --with-deps
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Playwright browsers"
        exit 1
    fi
fi

# Start the application
echo "🌟 Starting the Global Business Lead Scanner Platform..."
node app.js

echo "👋 Platform stopped."