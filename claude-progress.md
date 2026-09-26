# Session Progress Log — Movie Recommendation App

## Current State

**Last Updated:** 2026-09-26
**Session ID:** session-003
**Active Feature:** feat-003 — Cấu hình biến môi trường & TMDB API key

## Status

### What's Done

- [x] Xác nhận kiến trúc & kế hoạch dự án (4 file docs: KE_HOACH_DU_AN, CAU_TRUC_DU_AN, DATABASE_SCHEMA, LUONG_NGUOI_DUNG)
- [x] Tạo bộ file harness cho Giai đoạn 0
- [x] feat-001 — Khởi tạo cấu trúc monorepo
  - Tạo `frontend/` và `backend/`; `docs/` đã có đủ 4 tài liệu chuẩn
  - Thêm `README.md`, `.gitignore` và chạy `git init`
  - Xác thực cấu trúc và quy tắc ignore secret thành công
- [x] feat-002 — Setup Docker & docker-compose
  - Thêm Dockerfile dev, package manifests/lockfiles và app entrypoint tối thiểu cho Next.js + Express
  - Thêm Compose Postgres/backend/frontend, network nội bộ, healthchecks, volume dữ liệu và service recommendation tùy chọn ở trạng thái comment
  - Khắc phục findings dependency frontend; `npm audit` sạch cho cả hai app
  - `docker compose config`, Next.js build, backend health và frontend HTTP smoke test đều pass

### What's In Progress

- [ ] Không có; feat-002 đã hoàn tất

### What's Next

1. feat-003: Đăng ký TMDB API key, tạo `.env.example` (cả 2 phía) + `.env`/`.env.local` thật (gitignored)
2. feat-004: `backend/prisma/schema.prisma` theo đúng `docs/DATABASE_SCHEMA.md`, chạy migration đầu tiên
3. feat-005: `./init.sh` chạy sạch, cập nhật README, đóng Giai đoạn 0

## Blockers / Risks

- [ ] **TMDB API key**: chưa đăng ký — cần user tự tạo tài khoản trên developer.themoviedb.org (agent không tự đăng ký thay được)
- [x] Docker CLI có sẵn; Docker Engine/daemon hiện không chạy nên chưa build image hoặc `docker compose up`
- [ ] Trên Windows, gọi `init.sh` qua Git Bash (`C:\Program Files\Git\bin\bash.exe`) để Node.js Windows hiện trong PATH; WSL Bash không nhìn thấy Node.js này

## Decisions Made

- **Cấu trúc thư mục**: theo đúng `docs/CAU_TRUC_DU_AN.md` (monorepo 2 thư mục frontend/backend + recommendation-service optional)
  - Context: đã được chốt từ trước, không đổi sang 2 repo riêng
  - Alternatives considered: 2 repo tách biệt — không chọn vì tăng chi phí đồng bộ version cho team nhỏ
- **ORM**: Prisma trên PostgreSQL
  - Context: theo `docs/KE_HOACH_DU_AN.md` mục 3.3, khớp với ERD trong `docs/DATABASE_SCHEMA.md`
  - Alternatives considered: MongoDB — không chọn vì dữ liệu có tính quan hệ cao (User–History–Watchlist–Movie–Rating)
- **Phạm vi Giai đoạn 0**: chỉ scaffold + hạ tầng, KHÔNG viết logic nghiệp vụ (auth, movie, recommendation)
  - Context: tránh scope creep, đúng nguyên tắc "one feature at a time" trong AGENTS.md
- **Backend host port**: map host `4001` vào container `4000` vì Windows service đang chiếm port `4000`; frontend dev URL theo mapping này

## Files Modified This Session

- `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` — local dev containers
- `backend/package.json`, `backend/package-lock.json`, `backend/src/server.js` — Express health entrypoint
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/app/` — Next.js bootable app shell
- `backend/.dockerignore`, `frontend/.dockerignore` — loại dependency cache và env files khỏi build context
- `feature_list.json`, `claude-progress.md` — trạng thái và bằng chứng feat-002

## Evidence of Completion

- [x] Structural check: `test -d frontend && test -d backend && test -d docs`
- [x] Secret ignore check: real env files ignored; env example files not ignored
- [x] Git Bash `./init.sh` exited successfully; warnings remain only for pending features
- [x] `docker compose config` / `docker compose config --quiet`
- [x] `npm ci` và `npm audit` pass ở frontend/backend; audit báo 0 vulnerabilities
- [x] `npx next build`, `node --check backend/src/server.js`, HTTP smoke test frontend/backend
- [ ] `docker compose build` / `docker compose up`: chưa chạy được vì Docker Engine không hoạt động
- [ ] Type check clean: _(chưa áp dụng)_
- [x] Manual verification: đối chiếu scaffold với `docs/CAU_TRUC_DU_AN.md` và bốn tài liệu dự án

## Notes for Next Session

- Bắt đầu với `feat-003`, theo dependencies trong `feature_list.json`; cần người dùng tự đăng ký/cung cấp TMDB API key thật, không ghi key vào Git.
- Không tự ý tạo file trong `backend/src/modules/auth/...` hay bất kỳ module nghiệp vụ nào — đó là Giai đoạn 1.
- Khi đăng ký TMDB key xong, nhắc user xác nhận key hoạt động (test 1 request `GET /movie/popular`) trước khi
  đánh dấu feat-003 done.
