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
- Công thức Hybrid Score giữ nguyên trọng số cố định tay (xem mục 4) — chưa cần Learning to Rank ở quy mô dữ liệu hiện tại
- **SimilarityScore đã chốt dùng sentence embeddings** (không dùng TF-IDF thô):
  - **recommendation-service** (Python/FastAPI) chạy model `sentence-transformers` (khuyến nghị
    `paraphrase-multilingual-MiniLM-L12-v2` vì TMDB overview có thể lấy cả tiếng Việt lẫn tiếng Anh; nếu chỉ
    dùng overview tiếng Anh có thể dùng `all-MiniLM-L6-v2` nhẹ hơn) để encode `movies.overview` → vector, lưu
    vào `movies.overview_embedding` (xem `DATABASE_SCHEMA.md`)
  - Backend Node.js **không** gọi lại Python mỗi lần tính recommendation — chỉ gọi 1 lần khi có phim mới
    (job `embed-movie`, xem mục 5 Giai đoạn 4); phép cosine similarity và trung bình có trọng số (`taste_vector`)
    được tính thuần trong Node để tránh round-trip mạng và giảm độ trễ API `/recommendations`
  - Đây là phần ML **duy nhất** cần Python ở giai đoạn này; Collaborative Filtering (ALS/SVD) và Learning to
    Rank (XGBoost Ranker) là hướng mở rộng tương lai, chưa nằm trong phạm vi hiện tại
- Backend chính (Node.js) gọi sang recommendation-service qua REST API nội bộ (`/internal/...`)

### 3.6 Cache & Event Queue (phục vụ chiến lược Hybrid: Cache + Invalidate theo sự kiện)
Chiến lược cập nhật dữ liệu recommendation đã chốt: **Hybrid — Cache + Invalidate theo sự kiện** (tách theo từng thành phần điểm số: `AverageRatingScore` cập nhật theo batch định kỳ; `GenreMatchScore`/`SimilarityScore` cập nhật real-time theo sự kiện của từng user; `RecencyBoost` luôn tính real-time). Nhóm công nghệ dưới đây phục vụ trực tiếp cho chiến lược này:
- **Redis** — 2 vai trò:
  - Lưu **cache kết quả recommendation** theo user (key: `recommend:{user_id}`, TTL ~15–30 phút)
  - Làm **backend cho hàng đợi (queue)** xử lý sự kiện
- **BullMQ** (chạy trên Node.js, dùng Redis làm broker) — quản lý hàng đợi job:
  - Job `recalculate-user-profile`: kích hoạt khi user rate phim / xem phim mới / thêm watchlist
  - Job `embed-movie`: kích hoạt khi có phim **mới** được cache từ TMDB — gọi `recommendation-service` sinh
    `overview_embedding` (xem mục 3.5)
  - Job `invalidate-recommendation-cache`: xóa cache cũ của user đó ngay sau khi profile được tính lại
- **node-cron** (hoặc `node-schedule`) — chạy các job batch định kỳ:
  - Cập nhật `AverageRatingScore` cho toàn bộ phim (mỗi 1–6 giờ)
  - Tính lại ma trận similarity giữa các phim (chạy khi có phim mới hoặc theo lịch mỗi đêm)
- recommendation-service expose 2 endpoint nội bộ: `POST /internal/user-profile/{user_id}/recalculate` và
  `POST /internal/movies/{id}/embed`, để Node.js gọi mỗi khi có sự kiện tương ứng

### 3.7 Triển khai (Deployment)
- **Docker + docker-compose** cho local dev (frontend, backend, database, **Redis**)
- Frontend: **Vercel**
- Backend + DB + Redis: **Render / Railway / AWS EC2 + RDS + ElastiCache**
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
- **SimilarityScore**: cosine similarity giữa vector đặc trưng (sentence embedding từ `overview`, xem mục 3.5) của phim ứng viên và `taste_vector` (trung bình có trọng số theo thời gian) của user
- **AverageRatingScore**: rating trung bình chuẩn hóa (0–1) của phim trên TMDB hoặc rating nội bộ
- **RecencyBoost**: tăng điểm nếu phim ứng viên liên quan đến phim xem trong 7–14 ngày gần nhất

## 5. Các bước triển khai theo giai đoạn

### Giai đoạn 0 — Chuẩn bị (1 tuần)
1. Khởi tạo repo (monorepo hoặc 2 repo frontend/backend)
2. Setup Docker, môi trường dev, biến môi trường (`.env`)
3. Thêm **Redis** vào `docker-compose.yml` (dùng chung cho cache + queue)
4. Đăng ký TMDB API key
5. Thiết kế schema database (xem file `DATABASE_SCHEMA.md`)

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

### Giai đoạn 4 — Recommendation Engine (3–4 tuần)
**4.1 Logic tính điểm & embedding phim (tuần đầu)**
1. Setup `recommendation-service` (FastAPI) với `MovieEmbedder` (`sentence-transformers`) và route
   `POST /internal/movies/{id}/embed`
2. Xây dựng job `embed-movie`: `movieEmbedding.queue.ts` + `movieEmbedding.worker.ts`, gắn vào
   `movie.service.ts` (enqueue mỗi khi cache phim mới từ TMDB)
3. Xây dựng logic tính GenreMatchScore, SimilarityScore (cosine similarity thuần Node trên
   `taste_vector`/`overview_embedding`), AverageRatingScore, RecencyBoost

**4.2 Cơ chế Hybrid: Cache + Invalidate theo sự kiện (tuần 2–3)**
4. Setup **BullMQ** trên backend Node.js (kết nối Redis đã có từ Giai đoạn 0)
5. Bắn sự kiện `recalculate-user-profile` mỗi khi user rate phim / xem phim mới / thêm watchlist (gắn vào API `history`, `watchlist`, `rating` sẵn có)
6. Worker `userProfile.worker.ts` xử lý job: tính lại GenreMatchScore & `taste_vector` (trung bình có trọng số
   theo thời gian của `overview_embedding` các phim đã xem) cho riêng user đó
7. Sau khi tính xong → xóa cache Redis cũ của user (`recommend:{user_id}`) để lần gọi API tiếp theo tính lại và cache mới
8. Setup **node-cron** chạy batch job định kỳ: cập nhật `AverageRatingScore` toàn hệ thống + ma trận similarity giữa các phim
9. API `/recommendations`: kiểm tra Redis cache trước — có thì trả ngay, không có thì tính real-time rồi lưu cache (TTL ~15–30 phút)

**4.3 Giao diện (tuần cuối)**
10. Giao diện trang "Gợi ý cho bạn", "Phim tương tự", hiển thị nhãn lý do gợi ý

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

**Tổng thời gian ước tính: ~9–12 tuần** (Giai đoạn 4 cần thêm thời gian setup Redis/BullMQ/cron cho cơ chế Hybrid Cache + Invalidate, cùng với job embedding phim; tùy quy mô team và mức độ hoàn thiện tính năng tùy chọn).

## 6. Tài liệu liên quan
- `LUONG_NGUOI_DUNG.md` — mô tả chi tiết luồng người dùng (user flow)
- `CAU_TRUC_DU_AN.md` — cấu trúc thư mục/file của dự án
- `DATABASE_SCHEMA.md` — thiết kế bảng dữ liệu (User, Movie, History, Watchlist, Rating, UserProfile)
