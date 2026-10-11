# CineSense

CineSense là ứng dụng gợi ý phim hiện đại theo kiến trúc **Hybrid Recommendation** (GenreMatch + Similarity + AverageRating + RecencyBoost) kết hợp **Redis Cache** và **BullMQ Event Invalidation**.
Hệ thống Monorepo gồm **Frontend (Next.js 15 App Router)**, **Backend (Node.js/Express + TypeScript + Prisma ORM)**, **PostgreSQL**, **Redis** và nguồn dữ liệu phim từ **TMDB API**.

---

## Cấu trúc Repository (Repository Layout)

- `frontend/`: Ứng dụng Next.js (TypeScript, Zustand, TanStack React Query, Dark Cinema UI).
- `backend/`: API Express TypeScript chia theo module domain (`auth`, `user`), Prisma ORM, JWT HttpOnly Cookie, Rate Limiter, Helmet, CORS.
- `docs/`: Tài liệu kế hoạch, kiến trúc, cơ sở dữ liệu, luồng người dùng và API endpoints:
  - [Kế hoạch dự án](docs/KE_HOACH_DU_AN.md)
  - [Cấu trúc dự án](docs/CAU_TRUC_DU_AN.md)
  - [Thiết kế CSDL](docs/DATABASE_SCHEMA.md)
  - [Luồng người dùng](docs/LUONG_NGUOI_DUNG.md)
  - [Đặc tả API Endpoints](docs/API_ENDPOINTS.md)
- `docker-compose.yml`: Cấu hình chạy toàn bộ các dịch vụ (PostgreSQL, Redis, Backend, Frontend).

---

## Yêu cầu môi trường (Prerequisites)

- **Docker Desktop** (hỗ trợ Docker Compose).
- **Node.js >= 20** (nếu chạy kiểm thử hoặc phát triển trực tiếp trên host).
- **PowerShell** (trên Windows) hoặc Bash shell.

---

## Khởi động & Phát triển Local (Local Development)

### 1. Thiết lập biến môi trường

Từ thư mục gốc của repository, sao chép file cấu hình mẫu:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.local.example frontend/.env.local
```

**Các biến môi trường chính trong `backend/.env`**:
- `NODE_ENV`: `development` | `production` | `test`
- `PORT`: Cổng dịch vụ backend (`4000` trong container, publish ra host `4001`)
- `DATABASE_URL`: Kết nối PostgreSQL (`postgresql://postgres:postgres@postgres:5432/cinesense_dev?schema=public`)
- `REDIS_URL`: Kết nối Redis (`redis://redis:6379`)
- `JWT_SECRET`: Khóa bí mật ký JWT (yêu cầu tối thiểu 32 ký tự, sinh bằng `openssl rand -base64 48`)
- `JWT_EXPIRES_IN`: Thời hạn của access token (mặc định `7d`)
- `FRONTEND_ORIGIN`: Địa chỉ nguồn frontend được phép truy cập CORS (`http://localhost:3000` hoặc `http://localhost:3002`)
- `TMDB_API_KEY`: API key từ The Movie Database (cho Giai đoạn 2)

### 2. Khởi động hệ thống với Docker Compose

Kiểm tra cú pháp Compose và khởi chạy toàn bộ 4 containers:

```powershell
# Chọn cổng frontend nếu cổng 3000 đang bận trên máy host
$env:FRONTEND_PORT = "3002"

# Build và khởi chạy background
docker compose up --build -d
```

### 3. Đồng bộ Database Schema (Prisma Migration)

Áp dụng migrations vào cơ sở dữ liệu PostgreSQL trong container:

```powershell
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma validate
docker compose exec backend npx prisma migrate status
```

### 4. Truy cập các dịch vụ

- **Frontend App**: `http://localhost:3002` (hoặc cổng cấu hình trong `FRONTEND_PORT`)
  - Trang chủ: `/`
  - Đăng nhập: `/login`
  - Đăng ký: `/signup`
  - Quản lý hồ sơ: `/profile` (được bảo vệ bởi Route Guard Middleware)
- **Backend API**: `http://localhost:4001`
  - Smoke Health Check: `GET http://localhost:4001/health`
  - Chi tiết endpoints: xem [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `redis:6379` (nội bộ Compose network)

---

## Kiểm thử hệ thống (Testing)

### Backend Tests

Chạy kiểm thử unit và kiểm thử tích hợp (integration) bên trong container backend:

```powershell
# Typecheck TypeScript
docker compose exec backend npm run typecheck

# Chạy toàn bộ Unit Tests (90 tests)
docker compose exec backend npm run test:unit

# Chạy Integration Tests luồng Auth/Users trên DB test biệt lập (7 tests)
docker compose exec backend npm run test:integration
```

### Frontend Tests

Chạy kiểm thử cho client application (trong thư mục `frontend/`):

```powershell
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

---

## Trạng thái hiện tại (Current Scope)

- **Giai đoạn 0 (Nền tảng & CSDL)**: Đã hoàn tất (Monorepo, Docker Compose, Postgres, Redis, Prisma Models `User`, `UserProfile`, `Movie`, `WatchHistory`, `Watchlist`, `Rating`).
- **Giai đoạn 1 (Xác thực người dùng & Profile)**: Đã hoàn tất (Đăng ký, Đăng nhập, Đăng xuất, HttpOnly Cookie JWT HS256, Hash Bcrypt cost 12, Rate limiting, Helmet, CORS, Profile page, Next.js Edge Middleware route guard, Zod error mapping, 100% tests passed).
- **Giai đoạn 2 (Movie & TMDB Sync)**: Chuẩn bị khởi động theo kế hoạch.
