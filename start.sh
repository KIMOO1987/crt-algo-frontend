#!/usr/bin/env bash

echo "🚀 Starting CRT-ALGO Backend..."

# Start Trade Tracking Worker (Node.js) in background
echo "📈 Starting Trade Tracking Worker..."
node scripts/trade-tracker.js &
TRACKER_PID=$!

# Give tracker time to initialize
sleep 2

# Start FastAPI web server
echo "🌐 Starting FastAPI server..."
uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1 --no-access-log

# Cleanup on shutdown
trap "echo '🛑 Shutting down...'; kill $TRACKER_PID 2>/dev/null; exit" SIGTERM SIGINT
