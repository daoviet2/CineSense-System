#!/bin/bash
set -e

echo "=== Movie Recommendation App — Init (Giai đoạn 0) ==="

# --- 1. Công cụ bắt buộc ---
command -v docker >/dev/null 2>&1 || { echo "❌ Thiếu Docker. Cài đặt trước khi tiếp tục."; exit 1; }
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  echo "❌ Thiếu Docker Compose."; exit 1
fi
command -v node >/dev/null 2>&1 || { echo "❌ Thiếu Node.js."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ Thiếu npm."; exit 1; }
echo "✅ Docker / Docker Compose / Node.js / npm đã sẵn sàng"

# --- 2. Cấu trúc monorepo tối thiểu (feat-001) ---
missing_dirs=0
for d in frontend backend docs; do
  if [ ! -d "$d" ]; then
    echo "⚠️  Thiếu thư mục $d/ — feat-001 (Khởi tạo monorepo) chưa xong"
    missing_dirs=1
  fi
done

# --- 3. Biến môi trường (feat-003) ---
for f in backend/.env.example frontend/.env.local.example; do
  [ -f "$f" ] || echo "⚠️  Thiếu $f — feat-003 (Biến môi trường) chưa xong"
done

if [ -f backend/.env ]; then
  for key in DATABASE_URL JWT_SECRET TMDB_API_KEY RECOMMENDATION_SERVICE_URL; do
    grep -q "^${key}=.\+" backend/.env || echo "⚠️  ${key} chưa được set trong backend/.env"
  done
else
  echo "⚠️  Chưa có backend/.env (chỉ nên commit .env.example, .env thật tạo local) — kiểm tra feat-003"
fi

# --- 4. docker-compose.yml (feat-002) ---
if [ -f docker-compose.yml ]; then
  echo "=== Validate docker-compose.yml ==="
  if docker compose config >/dev/null 2>&1; then
    echo "✅ docker-compose.yml hợp lệ"
  else
    echo "❌ docker-compose.yml lỗi cú pháp"; exit 1
  fi
else
  echo "⚠️  Chưa có docker-compose.yml — feat-002 chưa xong"
fi

# --- 5. Prisma schema (feat-004) ---
if [ -f backend/prisma/schema.prisma ]; then
  echo "=== Validate Prisma schema ==="
  if [ -f backend/package.json ]; then
    (cd backend && npm install --silent && npx prisma validate) \
      && echo "✅ Prisma schema hợp lệ" \
      || { echo "❌ Prisma schema lỗi"; exit 1; }
  else
    echo "⚠️  backend/package.json chưa tồn tại, bỏ qua prisma validate"
  fi
else
  echo "⚠️  Chưa có backend/prisma/schema.prisma — feat-004 chưa xong"
fi

# --- 6. Cài dependencies nếu đã có package.json ---
for d in frontend backend; do
  if [ -f "$d/package.json" ]; then
    echo "=== npm install ($d) ==="
    (cd "$d" && npm install)
  fi
done

if [ "$missing_dirs" -eq 1 ]; then
  echo ""
  echo "=== Kiểm tra hoàn tất với CẢNH BÁO (xem ⚠️ ở trên) ==="
else
  echo ""
  echo "=== Kiểm tra hoàn tất ==="
fi

echo ""
echo "Next steps:"
echo "1. Đọc feature_list.json để chọn ĐÚNG 1 feature chưa 'done', theo thứ tự dependencies"
echo "2. Chỉ sửa file liên quan đến feature đó"
echo "3. Re-run ./init.sh trước khi báo cáo hoàn thành"
echo "4. Cập nhật claude-progress.md + feature_list.json trước khi kết thúc phiên"
