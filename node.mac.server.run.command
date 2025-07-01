#!/bin/bash

# Get and move to the script's directory
cd "$(cd "$(dirname "$0")" && pwd)" || exit

# Start the server in the background
echo "Starting server..."
npx serve > /dev/null 2>&1 &

# Capture the server's PID
SERVER_PID=$!

# Wait for the server to be ready on port 3000
echo "Waiting for server to be ready on port 3000..."
until nc -z localhost 3000; do
  sleep 0.5
done

# Open default browser
echo "Opening http://localhost:3000 in your browser..."
open http://localhost:3000

# Keep the terminal open until the server stops
wait $SERVER_PID
