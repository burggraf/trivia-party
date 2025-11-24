#!/bin/bash

# Setup script for Google Service Account credentials
# Usage: ./scripts/setup-google-credentials.sh /path/to/your-key.json

if [ -z "$1" ]; then
  echo "Usage: ./scripts/setup-google-credentials.sh /path/to/service-account-key.json"
  exit 1
fi

KEY_FILE="$1"

if [ ! -f "$KEY_FILE" ]; then
  echo "Error: File not found: $KEY_FILE"
  exit 1
fi

# Read the JSON file and minify it (remove newlines/extra spaces)
JSON_CONTENT=$(cat "$KEY_FILE" | tr -d '\n' | tr -s ' ')

# Create or update .env file
ENV_FILE=".env"

# Check if .env exists and has the variable
if grep -q "GOOGLE_SERVICE_ACCOUNT_JSON" "$ENV_FILE" 2>/dev/null; then
  echo "Updating existing GOOGLE_SERVICE_ACCOUNT_JSON in $ENV_FILE"
  # Use a temporary file for safe replacement
  grep -v "GOOGLE_SERVICE_ACCOUNT_JSON" "$ENV_FILE" > "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
fi

# Append the new variable
echo "GOOGLE_SERVICE_ACCOUNT_JSON='$JSON_CONTENT'" >> "$ENV_FILE"

echo "✅ Credentials added to .env file"
echo ""
echo "Next steps:"
echo "1. Add .env to .gitignore (if not already)"
echo "2. Test with: node scripts/test-google-credentials.js"
echo "3. Start PocketBase (it will read from .env automatically)"
