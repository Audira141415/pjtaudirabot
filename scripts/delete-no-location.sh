#!/bin/bash
# Script to delete all maintenance schedules without location (old ones)
BASE_URL="${1:-http://localhost:4000}"

echo "🔑 Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Audira@2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [ -z "$TOKEN" ]; then
  echo "❌ Login gagal"
  exit 1
fi
echo "✅ Login berhasil"

echo ""
echo "🗑️  Menghapus jadwal tanpa lokasi..."
RESULT=$(curl -s -X DELETE "$BASE_URL/api/admin/maintenance/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"filter":"no-location"}')
echo "$RESULT"

echo ""
echo "📊 Sinkronisasi GSheet..."
SYNC=$(curl -s -X POST "$BASE_URL/api/admin/maintenance/sheets/sync" \
  -H "Authorization: Bearer $TOKEN")
echo "$SYNC"
