# Kế Hoạch Dự Án: Movie Recommendation App (Mức Trung Bình)

## 1. Mục tiêu dự án
Xây dựng ứng dụng web cho phép người dùng:
- Đăng ký / đăng nhập tài khoản
- Lưu lịch sử xem phim
- Thêm/xóa phim trong watchlist
- Nhận gợi ý phim theo phương pháp **Hybrid Recommendation** (kết hợp thể loại yêu thích, phim tương đồng, rating trung bình, lịch sử xem gần đây)

## 2. Phạm vi tính năng

| Nhóm | Tính năng |
|---|---|
| Authentication | Đăng ký/Đăng nhập, hash mật khẩu, JWT/session, quên mật khẩu (tùy chọn), profile (tên, email, avatar) |
| Lịch sử xem | Ghi lại khi click phim, hiển thị danh sách gần đây, xóa từng mục/toàn bộ |
| Watchlist | Thêm/xóa phim, hiển thị danh sách |
| Recommendation | Hybrid: thể loại + phim tương tự + rating + lịch sử gần đây |

## 3. Công nghệ đề xuất

### 3.1 Frontend
- **React (Next.js)** — SSR/SEO tốt, routing sẵn, dễ tách trang login/profile/watchlist
- **TailwindCSS** — dựng UI nhanh, responsive
- **React Query / TanStack Query** — quản lý cache dữ liệu API (danh sách phim, watchlist...)
- **Zustand hoặc Redux Toolkit** — quản lý state auth, user session

### 3.2 Backend
- **Node.js + Express** (hoặc NestJS nếu muốn cấu trúc chuẩn MVC/module rõ ràng hơn)
- **JWT (jsonwebtoken)** cho xác thực stateless
- **bcrypt** để hash mật khẩu
- **Nodemailer** (nếu làm tính năng quên mật khẩu qua email)

### 3.3 Cơ sở dữ liệu
- **PostgreSQL** (khuyến nghị) — quan hệ rõ ràng giữa User – History – Watchlist – Movie – Rating
  - Có thể dùng **Prisma ORM** để thao tác dễ, tự sinh migration
- Thay thế: **MongoDB** nếu muốn schema linh hoạt hơn (ít khuyến nghị hơn vì dữ liệu có tính quan hệ cao)

### 3.4 Nguồn dữ liệu phim
- **TMDB API (The Movie Database)** — lấy metadata phim: tên, thể loại, poster, rating, mô tả, phim tương tự (`/movie/{id}/similar`, `/movie/{id}/recommendations`)
- Đồng bộ dữ liệu phim về DB nội bộ (cache) để giảm số lần gọi API và phục vụ tính toán recommendation

### 3.5 Recommendation Engine (Hybrid)
- Giai đoạn đầu: viết bằng **Node.js thuần** (tính điểm theo công thức trọng số, không cần ML phức tạp)
- Giai đoạn nâng cao (tùy chọn mở rộng): **Python microservice** (FastAPI) dùng `scikit-learn`/`pandas` để tính:
  - Content-based filtering (dựa trên thể loại, mô tả phim — TF-IDF/cosine similarity)
  - Collaborative filtering đơn giản (dựa trên rating người dùng)
- Backend chính (Node.js) gọi sang microservice này qua REST API nội bộ

### 3.6 Triển khai (Deployment)
- **Docker + docker-compose** cho local dev (frontend, backend, database)
- Frontend: **Vercel**
- Backend + DB: **Render / Railway / AWS EC2 + RDS**
- CI/CD cơ bản: **GitHub Actions** (lint, test, build, deploy)

## 4. Công thức Hybrid Recommendation (đề xuất)

```
Score(movie) = w1 * GenreMatchScore
             + w2 * SimilarityScore (dựa trên phim đã xem)
             + w3 * AverageRatingScore
             + w4 * RecencyBoost (ưu tiên phim liên quan đến lịch sử xem gần đây)
```

Gợi ý trọng số khởi điểm: `w1=0.35, w2=0.35, w3=0.15, w4=0.15` (có thể tinh chỉnh sau khi test với dữ liệu thật).

- **GenreMatchScore**: tỷ lệ trùng thể loại giữa phim ứng viên và top thể loại người dùng hay xem
- **SimilarityScore**: độ tương đồng (cosine similarity trên vector thể loại/mô tả) giữa phim ứng viên và các phim trong lịch sử xem
- **AverageRatingScore**: rating trung bình chuẩn hóa (0–1) của phim trên TMDB hoặc rating nội bộ
- **RecencyBoost**: tăng điểm nếu phim ứng viên liên quan đến phim xem trong 7–14 ngày gần nhất

## 5. Các bước triển khai theo giai đoạn

### Giai đoạn 0 — Chuẩn bị (1 tuần)
1. Khởi tạo repo (monorepo hoặc 2 repo frontend/backend)
2. Setup Docker, môi trường dev, biến môi trường (`.env`)
3. Đăng ký TMDB API key
4. Thiết kế schema database (xem file `DATABASE_SCHEMA.md`)

### Giai đoạn 1 — Authentication (1–2 tuần)
1. API đăng ký / đăng nhập (hash mật khẩu bằng bcrypt)
2. Sinh & xác thực JWT, middleware bảo vệ route
3. API profile (xem/cập nhật tên, email, avatar)
4. (Tùy chọn) Quên mật khẩu qua email token
5. Trang Login/Signup/Profile ở frontend

### Giai đoạn 2 — Tích hợp dữ liệu phim (1 tuần)
1. Kết nối TMDB API, cache dữ liệu phim vào DB nội bộ
2. Trang danh sách phim, trang chi tiết phim
3. API tìm kiếm/lọc phim theo thể loại

### Giai đoạn 3 — Lịch sử xem & Watchlist (1–2 tuần)
1. API ghi lịch sử xem khi user click vào phim
2. API lấy danh sách lịch sử (phân trang), xóa từng mục/toàn bộ
3. API thêm/xóa/lấy danh sách watchlist
4. Giao diện hiển thị lịch sử xem & watchlist

### Giai đoạn 4 — Recommendation Engine (2–3 tuần)
1. Xây dựng logic tính GenreMatchScore, SimilarityScore, AverageRatingScore, RecencyBoost
2. API `/recommendations` trả về danh sách phim gợi ý theo hybrid score
3. (Tùy chọn) Tách microservice Python nếu cần thuật toán ML nâng cao
4. Giao diện trang "Gợi ý cho bạn", "Phim tương tự"

### Giai đoạn 5 — Kiểm thử & Hoàn thiện (1 tuần)
1. Unit test cho backend (Jest)
2. Test luồng chính bằng tay hoặc Cypress/Playwright (E2E)
3. Tối ưu UI/UX, responsive mobile
4. Viết README, tài liệu API (Swagger/Postman)

### Giai đoạn 6 — Triển khai (0.5–1 tuần)
1. Cấu hình CI/CD
2. Deploy backend + DB
3. Deploy frontend
4. Kiểm tra production, theo dõi log/lỗi

**Tổng thời gian ước tính: ~8–11 tuần** (tùy quy mô team và mức độ hoàn thiện tính năng tùy chọn).

## 6. Tài liệu liên quan
- `LUONG_NGUOI_DUNG.md` — mô tả chi tiết luồng người dùng (user flow)
- `CAU_TRUC_DU_AN.md` — cấu trúc thư mục/file của dự án
- `DATABASE_SCHEMA.md` — thiết kế bảng dữ liệu (User, Movie, History, Watchlist, Rating)
