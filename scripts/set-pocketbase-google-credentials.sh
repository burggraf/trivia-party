#!/bin/bash

# This script adds Google Service Account credentials to PocketBase settings
# so they can be accessed from hooks via $app.settings().meta

echo "Setting Google Service Account credentials in PocketBase settings..."

# Load from .env file
if [ ! -f ".env" ]; then
  echo "Error: .env file not found"
  exit 1
fi

CREDENTIALS=$(cat .env | grep GOOGLE_SERVICE_ACCOUNT_JSON | cut -d"'" -f2)

if [ -z "$CREDENTIALS" ]; then
  echo "Error: GOOGLE_SERVICE_ACCOUNT_JSON not found in .env"
  exit 1
fi

# Use PocketBase API to update settings
# Note: You need to be logged in as admin to do this via API
# For now, we'll just print instructions

echo ""
echo "✅ Credentials loaded from .env"
echo ""
echo "To configure PocketBase settings:"
echo "1. Go to http://localhost:8090/_/"
echo "2. Click 'Settings' (gear icon) in the left sidebar"
echo "3. Scroll down to 'Application settings'"
echo "4. Look for 'Meta' or 'Custom data' section"
echo "5. Add a new field:"
echo "   Key: google_service_account_json"
echo "   Value: [paste the JSON from .env]"
echo ""
echo "Or run this command while PocketBase is running:"
echo ""
echo "curl -X PATCH http://localhost:8090/api/admin/settings \\"
echo "  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"meta\":{\"google_service_account_json\":\"'\"$CREDENTIALS\"'\"}}'"
echo ""
