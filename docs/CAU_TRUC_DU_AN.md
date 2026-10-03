# Cấu Trúc Dự Án — Movie Recommendation App

Đề xuất theo mô hình **2 thư mục riêng biệt** (frontend / backend) trong cùng 1 monorepo, dễ deploy độc lập.

```
movie-recommendation-app/
│
├── frontend/                          # Next.js app
│   ├── public/                        # Ảnh tĩnh, favicon
│   ├── src/
│   │   ├── app/  (hoặc pages/)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── movie/[id]/page.tsx    # Trang chi tiết phim
│   │   │   ├── watchlist/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── recommendations/page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── MovieCard.tsx
│   │   │   ├── MovieGrid.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── WatchlistButton.tsx
│   │   │   └── RecommendationSection.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useWatchlist.ts
│   │   │   └── useRecommendations.ts
│   │   ├── services/                  # Gọi API backend
│   │   │   ├── authService.ts
│   │   │   ├── movieService.ts
│   │   │   ├── historyService.ts
│   │   │   └── watchlistService.ts
│   │   ├── store/                     # Zustand/Redux
│   │   │   └── authStore.ts
│   │   └── styles/
│   ├── .env.local
│   ├── next.config.js
│   └── package.json
│
├── backend/                           # Node.js + Express (hoặc NestJS)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── env.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.middleware.ts   # Xác thực JWT
│   │   │   ├── user/
│   │   │   │   ├── user.controller.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   └── user.routes.ts
│   │   │   ├── movie/
│   │   │   │   ├── movie.controller.ts
│   │   │   │   ├── movie.service.ts     # Gọi TMDB API + cache DB. Sau khi cache phim MỚI -> enqueue job embed-movie
│   │   │   │   └── movie.routes.ts
│   │   │   ├── history/
│   │   │   │   ├── history.controller.ts
│   │   │   │   ├── history.service.ts   # Sau khi ghi history -> enqueue job recalculate-user-profile
│   │   │   │   └── history.routes.ts
│   │   │   ├── watchlist/
│   │   │   │   ├── watchlist.controller.ts
│   │   │   │   ├── watchlist.service.ts # Sau khi thêm/xóa -> enqueue job recalculate-user-profile
│   │   │   │   └── watchlist.routes.ts
│   │   │   ├── rating/
│   │   │   │   ├── rating.controller.ts
│   │   │   │   ├── rating.service.ts    # Sau khi rate -> enqueue job recalculate-user-profile
│   │   │   │   └── rating.routes.ts
│   │   │   └── recommendation/
│   │   │       ├── recommendation.controller.ts
│   │   │       ├── recommendation.service.ts  # Đọc cache Redis trước, fallback tính real-time
│   │   │       ├── scoring/
│   │   │       │   ├── genreMatch.ts     # Cập nhật qua job recalculate-user-profile
│   │   │       │   ├── similarity.ts     # Cosine similarity trên embedding (taste_vector vs overview_embedding); cập nhật qua job recalculate-user-profile
│   │   │       │   ├── ratingScore.ts    # Cập nhật qua cron batch (xem jobs/cron/)
│   │   │       │   └── recencyBoost.ts   # Luôn tính real-time
│   │   │       ├── cache/
│   │   │       │   └── recommendationCache.ts  # get/set/invalidate key recommend:{user_id}
│   │   │       └── recommendation.routes.ts
│   │   ├── jobs/                        # BullMQ: hàng đợi sự kiện + worker
│   │   │   ├── queues/
│   │   │   │   ├── userProfile.queue.ts       # Định nghĩa queue "recalculate-user-profile"
│   │   │   │   └── movieEmbedding.queue.ts    # Định nghĩa queue "embed-movie"
│   │   │   ├── workers/
│   │   │   │   ├── userProfile.worker.ts      # Xử lý job: tính lại genre/taste_vector cho 1 user + xóa cache
│   │   │   │   └── movieEmbedding.worker.ts   # Xử lý job: gọi recommendation-service sinh embedding từ overview, ghi vào movies.overview_embedding
│   │   │   └── cron/
│   │   │       ├── updateAverageRating.cron.ts  # node-cron: cập nhật AverageRatingScore (mỗi 1–6h)
│   │   │       └── rebuildSimilarityMatrix.cron.ts # node-cron: tính lại ma trận similarity phim-phim
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   ├── redis.ts                 # Kết nối Redis dùng chung cho cache & BullMQ
│   │   │   └── env.ts
│   │   ├── prisma/                     # Nếu dùng Prisma ORM
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── middlewares/
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── utils/
│   │   │   ├── hash.ts                 # bcrypt helper
│   │   │   └── jwt.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── auth.test.ts
│   │   ├── watchlist.test.ts
│   │   ├── recommendation.test.ts
│   │   ├── userProfile.worker.test.ts
│   │   └── movieEmbedding.worker.test.ts
│   ├── .env
│   └── package.json
│
├── recommendation-service/            # (Tùy chọn) Python microservice nâng cao
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint
│   │   ├── models/
│   │   │   ├── similarity_model.py    # (Legacy/tùy chọn) TF-IDF / cosine similarity
│   │   │   └── embedding_model.py     # MovieEmbedder: sentence-transformers, sinh vector từ overview (load model 1 lần, singleton)
│   │   └── routers/
│   │       ├── recommend.py
│   │       └── internal.py            # POST /internal/user-profile/{user_id}/recalculate (gọi bởi userProfile.worker.ts)
│   │                                  # POST /internal/movies/{id}/embed (gọi bởi movieEmbedding.worker.ts)
│   ├── requirements.txt               # gồm sentence-transformers
│   └── Dockerfile
│
├── docs/
│   ├── KE_HOACH_DU_AN.md
│   ├── LUONG_NGUOI_DUNG.md
│   ├── CAU_TRUC_DU_AN.md
│   ├── DATABASE_SCHEMA.md
│   └── API_ENDPOINTS.md
│
├── docker-compose.yml                 # frontend + backend + postgres + redis (+ recommendation-service)
├── .github/
│   └── workflows/
│       └── ci.yml                     # Lint, test, build, deploy
├── .gitignore
└── README.md
```

## Giải thích nhanh
- **frontend/**: giao diện người dùng, gọi API qua `services/`, quản lý trạng thái đăng nhập qua `store/`
- **backend/**: tách theo module (auth, user, movie, history, watchlist, rating, recommendation) để dễ mở rộng và bảo trì
- **recommendation/scoring/**: mỗi file phụ trách 1 thành phần của công thức Hybrid Score (genre, similarity, rating, recency) — dễ test độc lập và tinh chỉnh trọng số. `similarity.ts` chỉ làm phép toán vector thuần (cosine similarity), KHÔNG gọi ML model trực tiếp — vector đã được sinh sẵn từ trước bởi `movieEmbedding.worker.ts` (phim) và `userProfile.worker.ts` (user)
- **recommendation/cache/**: quản lý đọc/ghi/xóa cache Redis theo key `recommend:{user_id}`, dùng chung bởi API `/recommendations` và worker
- **jobs/queues/ & jobs/workers/**: hiện thực phần "Invalidate theo sự kiện":
  - `userProfile.queue.ts` + `userProfile.worker.ts`: khi `history`, `watchlist`, `rating` service ghi dữ liệu mới, enqueue job `recalculate-user-profile` → worker tính lại `favorite_genres` + `taste_vector` (trung bình có trọng số theo thời gian của các `overview_embedding` phim đã xem) cho đúng 1 user rồi xóa cache cũ của user đó
  - `movieEmbedding.queue.ts` + `movieEmbedding.worker.ts`: khi `movie.service.ts` cache 1 phim **mới** từ TMDB, enqueue job `embed-movie` → worker gọi sang `recommendation-service` để sinh vector từ `overview`, ghi vào `movies.overview_embedding`. Việc sinh embedding **không được chạy đồng bộ** trong lúc trả response cho trang chi tiết phim, tránh chặn người dùng
- **jobs/cron/**: hiện thực phần "Batch định kỳ" — cập nhật `AverageRatingScore` toàn hệ thống và ma trận similarity phim-phim theo lịch, không phụ thuộc vào 1 user cụ thể
- **config/redis.ts**: 1 kết nối Redis dùng chung cho cả cache (recommendation) và queue (BullMQ), tránh tạo nhiều connection thừa
- **recommendation-service/**: microservice Python tùy chọn, chỉ cần thêm khi muốn áp dụng thuật toán ML phức tạp hơn. `embedding_model.py` (`MovieEmbedder`) là thành phần ML **duy nhất** trong pipeline SimilarityScore — chịu trách nhiệm encode text → vector; mọi phép toán vector còn lại (trung bình có trọng số, cosine similarity) nằm ở phía Node để tránh round-trip mạng không cần thiết mỗi lần tính recommendation
- **docs/**: chứa toàn bộ tài liệu kế hoạch, để cả team cùng tham chiếu
- **docker-compose.yml**: chạy toàn bộ hệ thống (DB + Redis + backend + frontend) chỉ với 1 lệnh khi dev local

## Quy ước đặt tên (gợi ý)
- Route API: số nhiều, RESTful — `GET /movies`, `POST /watchlist`, `DELETE /history/:id`
- Bảng DB: số nhiều, snake_case — `users`, `movies`, `watch_history`, `watchlists`, `ratings`
- Tên queue/job: kebab-case, mô tả hành động — `recalculate-user-profile`, `embed-movie`, `rebuild-similarity-matrix`
- Cache key Redis: `recommend:{user_id}` (TTL ~15–30 phút)
- Biến môi trường quan trọng: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `TMDB_API_KEY`, `RECOMMENDATION_SERVICE_URL`
