#!/bin/sh

# Xcode Cloud Post-Clone Script
# This script runs after Xcode Cloud clones your repository
# It installs CocoaPods dependencies before building

set -e

echo "🚀 Xcode Cloud Post-Clone Script Started"
echo "========================================"

# Set default values for environment variables
CI_WORKSPACE="${CI_WORKSPACE:-$PWD}"
CI_PRIMARY_REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$CI_WORKSPACE}"

echo "Working directory: $PWD"
echo "Repository path: $CI_PRIMARY_REPOSITORY_PATH"

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

echo "✅ CocoaPods installation complete!"
echo "========================================"
