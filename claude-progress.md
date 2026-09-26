# Session Progress Log — Movie Recommendation App

## Current State

**Last Updated:** 2026-09-26
**Session ID:** session-002
**Active Feature:** feat-002 — Setup Docker & docker-compose

## Status

### What's Done

- [x] Xác nhận kiến trúc & kế hoạch dự án (4 file docs: KE_HOACH_DU_AN, CAU_TRUC_DU_AN, DATABASE_SCHEMA, LUONG_NGUOI_DUNG)
- [x] Tạo bộ file harness cho Giai đoạn 0
- [x] feat-001 — Khởi tạo cấu trúc monorepo
  - Tạo `frontend/` và `backend/`; `docs/` đã có đủ 4 tài liệu chuẩn
  - Thêm `README.md`, `.gitignore` và chạy `git init`
  - Xác thực cấu trúc và quy tắc ignore secret thành công

### What's In Progress

- [ ] Không có; feat-001 đã hoàn tất

### What's Next

1. feat-002: Dockerfile (frontend, backend) + `docker-compose.yml` (postgres + backend + frontend)
2. feat-003: Đăng ký TMDB API key, tạo `.env.example` (cả 2 phía) + `.env`/`.env.local` thật (gitignored)
3. feat-004: `backend/prisma/schema.prisma` theo đúng `docs/DATABASE_SCHEMA.md`, chạy migration đầu tiên
4. feat-005: `./init.sh` chạy sạch, cập nhật README, đóng Giai đoạn 0

## Blockers / Risks

- [ ] **TMDB API key**: chưa đăng ký — cần user tự tạo tài khoản trên developer.themoviedb.org (agent không tự đăng ký thay được)
- [x] Docker có sẵn trên máy hiện tại; chưa xác nhận môi trường CI
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

## Files Modified This Session

- `frontend/`, `backend/` — scaffold monorepo
- `.gitignore`, `README.md` — quy tắc ignore và giới thiệu dự án
- `feature_list.json` — đánh dấu feat-001 hoàn tất, ghi bằng chứng
- `claude-progress.md` — đồng bộ trạng thái phiên; đổi tên từ `progress.md` để khớp artifact bắt buộc

## Evidence of Completion

- [x] Structural check: `test -d frontend && test -d backend && test -d docs`
- [x] Secret ignore check: real env files ignored; env example files not ignored
- [x] Git Bash `./init.sh` exited successfully; warnings remain only for pending features
- [ ] Type check clean: _(chưa áp dụng)_
- [x] Manual verification: đối chiếu scaffold với `docs/CAU_TRUC_DU_AN.md` và bốn tài liệu dự án

## Notes for Next Session

- Bắt đầu với `feat-002`, theo dependencies trong `feature_list.json`.
- Không tự ý tạo file trong `backend/src/modules/auth/...` hay bất kỳ module nghiệp vụ nào — đó là Giai đoạn 1.
- Khi đăng ký TMDB key xong, nhắc user xác nhận key hoạt động (test 1 request `GET /movie/popular`) trước khi
  đánh dấu feat-003 done.
