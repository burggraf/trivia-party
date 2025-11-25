#!/bin/bash
# Build script for debug production builds (no auto-updater, with devtools)
# Connects to localhost:8090 for local PocketBase testing

cd "$(dirname "$0")"

# Set environment for local development
export VITE_POCKETBASE_URL="http://localhost:8090"

echo "Building debug build with PocketBase URL: $VITE_POCKETBASE_URL"

# Temporarily disable updater in config
cp src-tauri/tauri.conf.json src-tauri/tauri.conf.json.bak
cat src-tauri/tauri.conf.json | jq '.plugins.updater.active = false' > src-tauri/tauri.conf.json.tmp
mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json

# Build with debug profile (Tauri 2.0 syntax)
echo "Building debug production build..."
pnpm tauri build --debug

# Restore original config
mv src-tauri/tauri.conf.json.bak src-tauri/tauri.conf.json

echo ""
echo "Debug build complete! App is at:"
echo "  src-tauri/target/debug/bundle/macos/Trivia Party Display.app"
echo ""
echo "To run:"
echo "  open 'src-tauri/target/debug/bundle/macos/Trivia Party Display.app'"
