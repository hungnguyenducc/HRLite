#!/bin/bash
# Script tự động crawl dữ liệu mỗi giờ
# Gọi API endpoint POST /api/crawl/random-users
#
# Cài đặt crontab:
#   crontab -e
#   0 * * * * /Applications/Workspace/HRLite/scripts/crawl-cron.sh >> /Applications/Workspace/HRLite/logs/crawl.log 2>&1

APP_URL="${APP_URL:-http://localhost:3002}"
CRON_SECRET="${CRON_SECRET:-$(grep CRON_SECRET /Applications/Workspace/HRLite/.env 2>/dev/null | cut -d'"' -f2)}"
COUNT=100

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bắt đầu crawl ${COUNT} người dùng"
echo "=========================================="

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${APP_URL}/api/crawl/random-users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d "{\"count\": ${COUNT}}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: ${HTTP_CODE}"
echo "Response: ${BODY}"

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Crawl thành công!"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Crawl thất bại! HTTP ${HTTP_CODE}"
  exit 1
fi
