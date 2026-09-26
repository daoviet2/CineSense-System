# AGENTS.md — Movie Recommendation App

Ứng dụng web gợi ý phim theo **Hybrid Recommendation** (GenreMatch + Similarity + AverageRating + RecencyBoost).
Monorepo gồm `frontend/` (Next.js), `backend/` (Node.js/Express, chia module theo domain), tùy chọn
`recommendation-service/` (Python FastAPI), CSDL **PostgreSQL + Prisma**, nguồn dữ liệu phim từ **TMDB API**.

Tài liệu gốc: `docs/KE_HOACH_DU_AN.md`, `docs/CAU_TRUC_DU_AN.md`, `docs/DATABASE_SCHEMA.md`, `docs/LUONG_NGUOI_DUNG.md`.
Agent **không được suy diễn kiến trúc khác** với 4 file này — nếu có mâu thuẫn, hỏi lại user thay vì tự quyết.

## Giai đoạn hiện tại: Giai đoạn 0 — Chuẩn bị

Phạm vi **chỉ gồm 4 việc** (không code tính năng, không đụng vào auth/movie/recommendation logic):

1. Khởi tạo cấu trúc monorepo (`frontend/`, `backend/`, `recommendation-service/` optional, `docs/`)
2. Setup Docker + docker-compose (Postgres, backend, frontend) và biến môi trường (`.env`)
3. Đăng ký TMDB API key và lưu vào `.env` (không commit key thật)
4. Thiết kế schema Prisma (`backend/prisma/schema.prisma`) đúng theo `docs/DATABASE_SCHEMA.md`

Chi tiết theo dõi từng việc nằm trong `feature_list.json` (feat-001 → feat-005). **Không tự ý bắt đầu
Giai đoạn 1 (Authentication)** dù có thời gian rảnh trong phiên — cập nhật `claude-progress.md` và dừng lại.

## Startup Workflow

Trước khi viết bất kỳ dòng code nào:

1. **Xác nhận thư mục làm việc** bằng `pwd`
2. **Đọc file này (AGENTS.md) toàn bộ**
3. **Đọc docs dự án** trong `docs/` (4 file KE_HOACH / CAU_TRUC / DATABASE_SCHEMA / LUONG_NGUOI_DUNG)
4. **Chạy `./init.sh`** để xác nhận môi trường lành mạnh
5. **Đọc `feature_list.json`** để biết feature nào đang dang dở
6. **Xem lịch sử commit gần nhất** với `git log --oneline -5`

Nếu `./init.sh` fail, ưu tiên sửa lỗi đó trước, không thêm scope mới.

## Working Rules

- **Mỗi lần chỉ làm 1 feature** chưa xong trong `feature_list.json`, đúng thứ tự `dependencies`
- **Bắt buộc verify**: không được báo "done" nếu chưa thực sự chạy lệnh kiểm tra tương ứng
- **Cập nhật artifact**: trước khi kết thúc phiên phải cập nhật `claude-progress.md` và `feature_list.json`
- **Giữ đúng phạm vi**: không sửa file không liên quan đến feature đang làm (đặc biệt không tạo trước code
  của Giai đoạn 1 trở đi)
- **Không commit secret thật**: `.env` chỉ chứa placeholder/`.env.example` được commit, `.env` thật nằm trong
  `.gitignore`
- **Để lại trạng thái sạch**: phiên sau phải chạy được `./init.sh` ngay lập tức

## Required Artifacts

- `feature_list.json` — nguồn sự thật (source of truth) về trạng thái feature
- `claude-progress.md` — nhật ký liên tục giữa các phiên
- `init.sh` — đường dẫn khởi động & xác thực chuẩn
- `session-handoff.md` — tùy chọn, dùng cho phiên lớn cần bàn giao chi tiết

## Definition of Done (cho mỗi feature của Giai đoạn 0)

Một feature chỉ được coi là done khi TẤT CẢ đúng:

- [ ] Hành vi mục tiêu đã được triển khai (ví dụ: `docker compose config` hợp lệ, `prisma validate` pass)
- [ ] Lệnh xác thực tương ứng đã thực sự chạy (không suy đoán)
- [ ] Bằng chứng được ghi vào `feature_list.json.evidence` hoặc `claude-progress.md`
- [ ] Repo vẫn khởi động lại được từ `./init.sh`

## End of Session

1. Cập nhật `claude-progress.md` với trạng thái hiện tại
2. Cập nhật `feature_list.json` với status mới
3. Ghi lại risk/blocker chưa giải quyết (vd: chưa có TMDB key thật, Docker chưa cài trên máy CI...)
4. Commit với message rõ ràng (theo Conventional Commits, ví dụ `chore(scaffold): init monorepo structure`)
5. Để repo đủ sạch cho phiên sau chạy `./init.sh` ngay

## Verification Commands

```bash
# Full verification cho Giai đoạn 0
./init.sh
```

Các check bắt buộc theo từng feature:
- feat-001: `test -d frontend && test -d backend && test -d docs`
- feat-002: `docker compose config` (không lỗi cú pháp)
- feat-003: `.env.example` tồn tại ở cả `frontend/` và `backend/`; các key bắt buộc
  (`DATABASE_URL`, `JWT_SECRET`, `TMDB_API_KEY`, `RECOMMENDATION_SERVICE_URL`) có mặt (giá trị có thể là placeholder)
- feat-004: `npx prisma validate` (chạy trong `backend/`)
- feat-005: `./init.sh` chạy sạch từ đầu đến cuối trên checkout mới

## Escalation

- **Quyết định kiến trúc**: tham khảo `docs/CAU_TRUC_DU_AN.md` / `docs/DATABASE_SCHEMA.md` trước, nếu vẫn
  chưa rõ thì hỏi user — không tự bịa cấu trúc mới
- **Schema chưa rõ**: đối chiếu `docs/DATABASE_SCHEMA.md` mục 2 (chi tiết từng bảng), không tự thêm/bớt cột
- **Test lặp lại fail**: cập nhật `claude-progress.md`, đánh dấu blocker, không lặp vô hạn việc sửa cùng 1 lỗi
- **Ngoài phạm vi Giai đoạn 0** (vd: cần viết API auth): dừng lại, ghi vào `claude-progress.md` mục "Notes for
  Next Session", không tự triển khai trước
