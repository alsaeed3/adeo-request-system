#!/bin/bash

# Exit on any error
set -e

# Print each command before executing (optional, for debugging)
set -x

# Ensure nvm is loaded
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # Load nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # Load nvm bash_completion

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
  echo "Installing NVM (Node Version Manager)..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
  source ~/.bashrc
fi

# Install the latest LTS version of Node.js using nvm
echo "Installing Node.js (Latest LTS)..."
nvm install --lts

# Use the installed Node.js version
echo "Using Node.js (Latest LTS)..."
nvm use --lts

# Verify Node.js installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Navigate to the project directory
PROJECT_DIR="/home/medojiedr/Downloads/adeo-request-system-main"
echo "Navigating to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

# Remove old dependencies if they exist
echo "Removing existing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Ensure the correct version of concurrently is installed
echo "Installing compatible version of concurrently..."
npm install concurrently@latest

# Start the development server
echo "Starting the development server..."
npm run dev
