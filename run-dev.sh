#!/bin/bash

# Start the backend
cd adeo-request-system-backend
npm start & 

# Start the frontend
cd ../adeo-request-system-frontend
npm run dev &

# Wait for all background processes
wait
