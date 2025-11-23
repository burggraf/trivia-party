#!/bin/bash
set -e

echo "=== Full Deployment ==="
echo "1. Building and deploying frontend..."
./scripts/deploy-frontend.sh

echo ""
echo "2. Deploying hooks..."
./scripts/deploy-hooks.sh

echo ""
echo "3. Deploying migrations..."
./scripts/deploy-migrations.sh


echo ""
echo "=== Deployment Complete ==="

