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
│   │   │   │   ├── movie.service.ts     # Gọi TMDB API + cache DB
│   │   │   │   └── movie.routes.ts
│   │   │   ├── history/
│   │   │   │   ├── history.controller.ts
│   │   │   │   ├── history.service.ts
│   │   │   │   └── history.routes.ts
│   │   │   ├── watchlist/
│   │   │   │   ├── watchlist.controller.ts
│   │   │   │   ├── watchlist.service.ts
│   │   │   │   └── watchlist.routes.ts
│   │   │   └── recommendation/
│   │   │       ├── recommendation.controller.ts
│   │   │       ├── recommendation.service.ts  # Logic tính Hybrid Score
│   │   │       ├── scoring/
│   │   │       │   ├── genreMatch.ts
│   │   │       │   ├── similarity.ts
│   │   │       │   ├── ratingScore.ts
│   │   │       │   └── recencyBoost.ts
│   │   │       └── recommendation.routes.ts
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
│   │   └── recommendation.test.ts
│   ├── .env
│   └── package.json
│
├── recommendation-service/            # (Tùy chọn) Python microservice nâng cao
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint
│   │   ├── models/
│   │   │   └── similarity_model.py    # TF-IDF / cosine similarity
│   │   └── routers/
│   │       └── recommend.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── docs/
│   ├── KE_HOACH_DU_AN.md
│   ├── LUONG_NGUOI_DUNG.md
│   ├── CAU_TRUC_DU_AN.md
│   ├── DATABASE_SCHEMA.md
│   └── API_ENDPOINTS.md
│
├── docker-compose.yml                 # frontend + backend + postgres (+ recommendation-service)
├── .github/
│   └── workflows/
│       └── ci.yml                     # Lint, test, build, deploy
├── .gitignore
└── README.md
```

## Giải thích nhanh
- **frontend/**: giao diện người dùng, gọi API qua `services/`, quản lý trạng thái đăng nhập qua `store/`
- **backend/**: tách theo module (auth, user, movie, history, watchlist, recommendation) để dễ mở rộng và bảo trì
- **recommendation/scoring/**: mỗi file phụ trách 1 thành phần của công thức Hybrid Score (genre, similarity, rating, recency) — dễ test độc lập và tinh chỉnh trọng số
- **recommendation-service/**: microservice Python tùy chọn, chỉ cần thêm khi muốn áp dụng thuật toán ML phức tạp hơn (TF-IDF, collaborative filtering ma trận lớn)
- **docs/**: chứa toàn bộ tài liệu kế hoạch, để cả team cùng tham chiếu
- **docker-compose.yml**: chạy toàn bộ hệ thống (DB + backend + frontend) chỉ với 1 lệnh khi dev local

## Quy ước đặt tên (gợi ý)
- Route API: số nhiều, RESTful — `GET /movies`, `POST /watchlist`, `DELETE /history/:id`
- Bảng DB: số nhiều, snake_case — `users`, `movies`, `watch_history`, `watchlists`
- Biến môi trường quan trọng: `DATABASE_URL`, `JWT_SECRET`, `TMDB_API_KEY`, `RECOMMENDATION_SERVICE_URL`
