#!/bin/sh
set -e

echo "Running Prisma db push..."
NODE_PATH=/app/migrator_modules node /app/migrator_modules/prisma/build/index.js db push --skip-generate --accept-data-loss

echo "Starting application..."
exec node server.js
