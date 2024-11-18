#!/bin/bash

// Create this as cleanup.sh in your project root
cleanup() {
    echo "Cleaning up processes..."
    
    // # Kill all node processes
    pkill -f "node"
    
    // # Kill all npm processes
    pkill -f "npm"
    
    // # Kill esbuild processes
    pkill -f "esbuild"
    
    // # Kill any remaining processes related to the dev servers
    pkill -f "adeo-request-system"
    
    echo "Cleanup complete"
}

//  Run cleanup
cleanup

//  Make sure ports are freed
for port in 3000 5173 5174; do
    pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port"
        kill -9 $pid 2>/dev/null
    fi
done