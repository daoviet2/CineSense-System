# Cấu Trúc Dự Án — Movie Recommendation App

Mô hình **2 thư mục riêng biệt** (frontend / backend) trong cùng 1 monorepo, dễ deploy độc lập.

```
movie-recommendation-app/
│
├── frontend/                          # Next.js 15 App Router
│   ├── public/                        # Ảnh tĩnh, favicon
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx         # Trang đăng nhập
│   │   │   ├── signup/page.tsx        # Trang đăng ký
│   │   │   ├── profile/page.tsx       # Trang thông tin tài khoản
│   │   │   ├── movie/[id]/page.tsx    # Trang chi tiết phim (Giai đoạn 2, [id] = tmdbId)
│   │   │   ├── watchlist/page.tsx     # Trang danh sách theo dõi (Giai đoạn 3)
│   │   │   ├── history/page.tsx       # Trang lịch sử xem (Giai đoạn 3)
│   │   │   ├── recommendations/page.tsx # Trang gợi ý phim (Giai đoạn 4)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx               # Trang chủ: danh sách phim nổi bật, tìm kiếm, lọc thể loại, phân trang (D21)
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Thanh điều hướng với auth state
│   │   │   ├── MovieCard.tsx          # Card phim (Giai đoạn 2)
│   │   │   ├── MovieGrid.tsx          # Grid phim, loading skeleton & error state (Giai đoạn 2)
│   │   │   ├── SearchBar.tsx          # Thanh tìm kiếm phim có debounce (Giai đoạn 2)
│   │   │   ├── GenreFilter.tsx        # Bộ lọc thể loại phim dạng chips (Giai đoạn 2)
│   │   │   ├── Pagination.tsx         # Phân trang trang chủ (Giai đoạn 2)
│   │   │   ├── WatchlistButton.tsx    # Nút thêm watchlist (Giai đoạn 3)
│   │   │   ├── RecommendationSection.tsx # Khối gợi ý (Giai đoạn 4)
│   │   │   └── providers/
│   │   │       └── QueryProvider.tsx  # TanStack React Query Provider
│   │   ├── hooks/
│   │   │   ├── useAuth.ts             # Hook quản lý auth & session
│   │   │   ├── useMovies.ts           # Hook query danh sách phim phân trang
│   │   │   ├── useMovie.ts            # Hook query chi tiết phim
│   │   │   ├── useGenres.ts           # Hook query danh sách thể loại phim
│   │   │   ├── useWatchlist.ts
│   │   │   └── useRecommendations.ts
│   │   ├── lib/
│   │   │   ├── authErrors.ts          # Mapping mã lỗi D3 Auth sang tiếng Việt
│   │   │   ├── movieErrors.ts         # Mapping mã lỗi D3 Movie sang tiếng Việt
│   │   │   ├── movieFormat.ts         # Hàm thuần định dạng điểm số, năm phát hành
│   │   │   ├── moviePagination.ts     # Hàm thuần tính toán trạng thái phân trang
│   │   │   ├── movieHome.ts           # Hàm thuần tiêu đề và thông điệp trang chủ
│   │   │   ├── movieDetail.ts         # Hàm thuần parse ID và fallback overview
│   │   │   └── movieQuery.ts          # Hàm thuần parse & serialize URL search params (D16)
│   │   ├── schemas/
│   │   │   └── auth.schema.ts         # Zod schemas validation client-side
│   │   ├── services/                  # Gọi API backend (credentials: include)
│   │   │   ├── apiClient.ts           # Helper request HTTP dùng chung và xử lý lỗi D3
│   │   │   ├── authService.ts         # Service xác thực & profile
│   │   │   ├── movieService.ts        # Service lấy danh sách phim, chi tiết, thể loại (Giai đoạn 2)
│   │   │   ├── historyService.ts
│   │   │   └── watchlistService.ts
│   │   ├── store/                     # Zustand state management
│   │   │   └── authStore.ts           # Store user & auth status (không lưu token trong JS)
│   │   ├── styles/
│   │   │   └── globals.css            # Dark cinema theme & glassmorphism
│   │   ├── types/
│   │   │   ├── auth.ts                # TypeScript definitions cho Auth/User
│   │   │   └── movie.ts               # DTO definitions cho Movie, Genre, Pagination
│   │   └── middleware.ts              # Route Guard kiểm tra cookie access_token (D11)
│   ├── tests/                         # 11 test suites / 78 unit tests
│   │   ├── auth.schema.test.ts
│   │   ├── authErrors.test.ts
│   │   ├── authService.test.ts
│   │   ├── authStore.test.ts
│   │   ├── movieDetail.test.ts
│   │   ├── movieErrors.test.ts
│   │   ├── movieFormat.test.ts
│   │   ├── movieHome.test.ts
│   │   ├── moviePagination.test.ts
│   │   ├── movieQuery.test.ts
│   │   └── movieService.test.ts
│   ├── .env.local
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # Node.js + Express (TypeScript)
│   ├── prisma/                        # Prisma ORM
│   │   ├── schema.prisma              # Database schema
│   │   └── migrations/                # Database migration history
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                  # PrismaClient singleton
│   │   │   ├── env.ts                 # Biến môi trường Zod fail-fast (JWT, TMDB, CORS, Redis)
│   │   │   ├── security.ts            # Hằng số bảo mật (bcrypt rounds, cookie, token)
│   │   │   └── tmdb.ts                # Cấu hình TMDB (timeouts, image base URL, limits D22)
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # Middleware requireAuth xác thực JWT
│   │   │   ├── errorHandler.ts        # AppError & xử lý lỗi chuẩn hóa D3 (bao gồm 502/504)
│   │   │   └── rateLimiter.ts         # In-memory rate limiting cho auth và movies
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts # Controller xử lý HTTP request/response
│   │   │   │   ├── auth.service.ts    # Nghiệp vụ xác thực & factory DI
│   │   │   │   ├── auth.routes.ts     # Route mapping (/auth/register, /auth/login, /auth/logout)
│   │   │   │   └── auth.schema.ts     # Zod schema validation
│   │   │   ├── user/
│   │   │   │   ├── user.controller.ts # Controller xử lý profile
│   │   │   │   ├── user.service.ts    # Nghiệp vụ user & factory DI
│   │   │   │   ├── user.repository.ts # Repository interface & Prisma implementation (D4/D9)
│   │   │   │   ├── user.routes.ts     # Route mapping (/users/me)
│   │   │   │   ├── user.schema.ts     # Zod schema updateUser
│   │   │   │   └── user.types.ts      # Data transfer objects (UserPublicDto)
│   │   │   ├── movie/                 # Giai đoạn 2 (Tích hợp dữ liệu phim)
│   │   │   │   ├── movie.controller.ts # Controller xử lý /movies, /movies/:tmdbId, /genres
│   │   │   │   ├── movie.service.ts   # Cache-aside phim, proxy danh sách, genres, seam publisher (D15/D16/D20)
│   │   │   │   ├── movie.repository.ts # Repository interface & Prisma implementation (transaction, race-safe D15)
│   │   │   │   ├── movie.routes.ts    # Route mapping (/movies, /movies/:tmdbId)
│   │   │   │   ├── genre.routes.ts    # Route mapping (/genres)
│   │   │   │   ├── movie.schema.ts    # Zod schema validation query & params
│   │   │   │   ├── movie.types.ts     # DTO definitions (MovieSummaryDto, MovieDetailDto, GenreDto)
│   │   │   │   ├── movie.events.ts    # Seam MovieEventPublisher & NoopMovieEventPublisher (D20)
│   │   │   │   ├── tmdb.client.ts     # TMDB Client Adapter (ITmdbClient, timeout, key handling D13)
│   │   │   │   ├── tmdb.mapper.ts     # Hàm thuần mapping TMDB payload -> DB / DTO (D19)
│   │   │   │   └── tmdb.schema.ts     # Zod schema parse payload từ TMDB API (D13)
│   │   │   ├── history/               # Giai đoạn 3
│   │   │   │   ├── history.controller.ts
│   │   │   │   ├── history.service.ts # Ghi history -> enqueue recalculate-user-profile
│   │   │   │   └── history.routes.ts
│   │   │   ├── watchlist/             # Giai đoạn 3
│   │   │   │   ├── watchlist.controller.ts
│   │   │   │   ├── watchlist.service.ts # Thêm/xóa watchlist -> enqueue recalculate-user-profile
│   │   │   │   └── watchlist.routes.ts
│   │   │   ├── rating/                # Giai đoạn 3
│   │   │   │   ├── rating.controller.ts
│   │   │   │   ├── rating.service.ts  # Đánh giá phim -> enqueue recalculate-user-profile
│   │   │   │   └── rating.routes.ts
│   │   │   └── recommendation/        # Giai đoạn 4
│   │   │       ├── recommendation.controller.ts
│   │   │       ├── recommendation.service.ts # Đọc Redis cache, fallback hybrid scoring
│   │   │       ├── scoring/
│   │   │       │   ├── genreMatch.ts
│   │   │       │   ├── similarity.ts
│   │   │       │   ├── ratingScore.ts
│   │   │       │   └── recencyBoost.ts
│   │   │       ├── cache/
│   │   │       │   └── recommendationCache.ts
│   │   │       └── recommendation.routes.ts
│   │   ├── jobs/                      # BullMQ: hàng đợi & worker (Giai đoạn 2-4)
│   │   │   ├── queues/
│   │   │   │   ├── userProfile.queue.ts
│   │   │   │   └── movieEmbedding.queue.ts
│   │   │   ├── workers/
│   │   │   │   ├── userProfile.worker.ts
│   │   │   │   └── movieEmbedding.worker.ts
│   │   │   └── cron/
│   │   │       ├── updateAverageRating.cron.ts
│   │   │       └── rebuildSimilarityMatrix.cron.ts
│   │   ├── utils/
│   │   │   ├── hash.ts                # Bcrypt helper (cost 12, max 72 bytes)
│   │   │   ├── jwt.ts                 # JWT helper (HS256 pinned)
│   │   │   └── cookie.ts              # Quản lý HttpOnly cookie
│   │   ├── app.ts                     # Express createApp factory (injectable dependencies)
│   │   └── server.ts                  # HTTP server & graceful shutdown
│   ├── tests/
│   │   ├── unit/                      # 17 test suites / 140 tests (auth, user, movie, tmdb)
│   │   └── integration/               # 3 test suites / 21 tests (auth, movie, movie.repository trên cinesense_test)
│   ├── .env
│   ├── tsconfig.json
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

## Quy ước đặt tên
- Route API: số nhiều, RESTful — `GET /movies`, `POST /watchlist`, `DELETE /history/:id`
- Bảng DB: số nhiều, snake_case — `users`, `movies`, `watch_history`, `watchlists`, `ratings`
- Tên queue/job: kebab-case, mô tả hành động — `recalculate-user-profile`, `embed-movie`, `rebuild-similarity-matrix`
- Cache key Redis: `recommend:{user_id}` (TTL ~15–30 phút)
- Biến môi trường quan trọng: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `TMDB_API_KEY`, `RECOMMENDATION_SERVICE_URL`
