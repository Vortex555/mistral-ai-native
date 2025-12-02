#!/bin/sh

# Xcode Cloud Post-Clone Script
# This script runs after Xcode Cloud clones your repository
# It installs Node.js and CocoaPods dependencies before building

set -e

echo "🚀 Xcode Cloud Post-Clone Script Started"
echo "========================================"

# Set default values for environment variables
CI_WORKSPACE="${CI_WORKSPACE:-$PWD}"
CI_PRIMARY_REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$CI_WORKSPACE}"

echo "Working directory: $PWD"
echo "Repository path: $CI_PRIMARY_REPOSITORY_PATH"

# Install Node.js using Homebrew (if not present)
echo "📦 Checking Node.js installation..."
if ! command -v node > /dev/null 2>&1; then
    echo "⚠️  Node.js not found, installing via Homebrew..."
    
    # Install Homebrew if not present
    if ! command -v brew > /dev/null 2>&1; then
        echo "Installing Homebrew..."
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    # Install Node.js
    echo "Installing Node.js..."
    brew install node
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Ensure node is in PATH
export PATH="/opt/homebrew/bin:$PATH"

# Navigate to iOS directory
if [ -d "$CI_PRIMARY_REPOSITORY_PATH/ios" ]; then
    cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
elif [ -d "ios" ]; then
    cd ios
else
    echo "❌ Error: ios directory not found"
    exit 1
fi

echo "Current directory: $PWD"
echo "📦 Installing CocoaPods dependencies..."

# Check if CocoaPods is installed
if ! command -v pod > /dev/null 2>&1; then
    echo "⚠️  CocoaPods not found, installing..."
    # Install without sudo for Xcode Cloud
    gem install cocoapods --user-install
    export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
else
    echo "✅ CocoaPods already installed: $(pod --version)"
fi

# Install pods
echo "Running pod install..."
pod install

echo "✅ Dependencies installation complete!"
echo "========================================"
