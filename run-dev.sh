#!/bin/bash

# Function to cleanup processes on exit
cleanup() {
    echo "Cleaning up processes..."
    killall node npm 2>/dev/null
    exit
}

# Register cleanup function on script exit
trap cleanup EXIT

# Kill any existing node/npm processes
echo "Cleaning up existing processes..."
killall node npm 2>/dev/null

# Wait a moment for processes to clean up
sleep 2

# Store the root directory
ROOT_DIR=$(pwd)

echo "Starting development servers..."

# Start backend
echo "Starting backend..."
cd "$ROOT_DIR/adeo-request-system-backend" || exit
npm start &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$ROOT_DIR/adeo-request-system-frontend" || exit
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID