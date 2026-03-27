#!/bin/bash
# Script tự động crawl dữ liệu mỗi giờ
# Chạy trực tiếp bằng Node.js — không cần server đang chạy
#
# Cài đặt crontab:
#   crontab -e
#   0 * * * * /Applications/Workspace/HRLite/scripts/crawl-cron.sh >> /Applications/Workspace/HRLite/logs/crawl.log 2>&1

PROJECT_DIR="/Applications/Workspace/HRLite"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

echo "=========================================="
echo "${LOG_PREFIX} Bắt đầu crawl dữ liệu nhân viên"
echo "=========================================="

cd "${PROJECT_DIR}" || { echo "${LOG_PREFIX} Không tìm thấy thư mục project"; exit 1; }

# Chạy seed-crawl trực tiếp bằng tsx (không phụ thuộc server)
npx tsx prisma/seed-crawl.ts 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "${LOG_PREFIX} Crawl thành công!"
else
  echo "${LOG_PREFIX} Crawl thất bại! Exit code: ${EXIT_CODE}"
  exit 1
fi
