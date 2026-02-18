#!/usr/bin/env bash
# Run after each PR merge: pull main, npm install, npm run build.
# Usage: ./scripts/post-merge-verify.sh
# Exit 0 = OK, non-zero = build failed (report error and stop).

set -e
cd "$(dirname "$0")/.."
echo "Pulling main..."
git fetch origin main
git checkout main
git pull origin main
echo "Running npm install..."
npm install
echo "Running npm run build..."
npm run build
echo "Build OK."
