#!/bin/bash
# setup.sh

echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y curl
sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo apt-get install -y mongodb

# Install n (Node.js version manager)
sudo npm install -g n
# Install and use Node.js v18 (or your preferred version)
sudo n 18

# Install global npm packages
sudo npm install -g concurrently

# Setup MongoDB
echo "Setting up MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Create required directories
echo "Creating required directories..."
mkdir -p adeo-request-system-backend/uploads
mkdir -p adeo-request-system-backend/logs

# Install project dependencies
echo "Installing project dependencies..."
npm install
cd adeo-request-system-frontend && npm install
cd ../adeo-request-system-backend && npm install
cd ..

echo "Setup complete! You can now run 'npm run dev' to start the application."