# Luồng Người Dùng (User Flow) — Movie Recommendation App

## 1. Luồng đăng ký / đăng nhập

```mermaid
flowchart TD
    A[Truy cập trang chủ] --> B{Đã đăng nhập?}
    B -- Chưa --> C[Trang Login/Signup]
    C --> D[Nhập thông tin đăng ký]
    D --> E[Backend hash mật khẩu, tạo user]
    E --> F[Tạo JWT, trả về client]
    F --> G[Lưu token, chuyển vào Trang chủ đã đăng nhập]
    C --> H[Nhập email/mật khẩu để login]
    H --> I{Đúng thông tin?}
    I -- Đúng --> F
    I -- Sai --> J[Thông báo lỗi]
    B -- Rồi --> G
```

**Chi tiết bước:**
1. Người dùng mới bấm "Đăng ký" → nhập tên, email, mật khẩu
2. Backend hash mật khẩu (bcrypt), lưu vào DB
3. Hệ thống sinh JWT (hoặc session) → lưu ở client (httpOnly cookie hoặc localStorage)
4. Người dùng cũ bấm "Đăng nhập" → xác thực email/mật khẩu → nhận JWT
5. (Tùy chọn) "Quên mật khẩu" → gửi email chứa link reset kèm token có hạn (ví dụ 15 phút)
6. Sau đăng nhập, người dùng có thể vào trang **Profile** để cập nhật tên/avatar

## 2. Luồng xem phim & lưu lịch sử

```mermaid
flowchart TD
    A[Trang danh sách phim / tìm kiếm] --> B[Click vào 1 phim]
    B --> C[Trang chi tiết phim]
    C --> D[Backend ghi log vào bảng History user_id + movie_id + timestamp]
    C --> E[Hiển thị nút Thêm vào Watchlist]
    C --> F[Hiển thị danh sách Phim tương tự đề xuất]
```

**Chi tiết bước:**
1. Người dùng duyệt danh sách phim (trang chủ, tìm kiếm, theo thể loại)
2. Click vào 1 phim → điều hướng đến trang chi tiết
3. Ngay khi trang chi tiết load, gọi API `POST /history` để lưu (nếu đã đăng nhập)
4. Trang chi tiết hiển thị: thông tin phim, rating, nút "Thêm vào Watchlist", danh sách phim tương tự
5. Người dùng có thể vào trang **Lịch sử xem** để xem lại, xóa từng mục hoặc "Xóa tất cả"

## 3. Luồng Watchlist

```mermaid
flowchart TD
    A[Trang chi tiết phim / danh sách phim] --> B[Bấm Thêm vào Watchlist]
    B --> C[API POST /watchlist]
    C --> D[Cập nhật UI: đổi icon thành đã thêm]
    E[Trang Watchlist] --> F[Danh sách phim đã lưu]
    F --> G[Bấm Xóa khỏi Watchlist]
    G --> H[API DELETE /watchlist/:movieId]
    H --> I[Cập nhật lại danh sách]
```

**Chi tiết bước:**
1. Từ bất kỳ đâu hiển thị phim (danh sách, chi tiết, gợi ý) đều có nút thêm/xóa watchlist
2. Trang "Watchlist của tôi" hiển thị toàn bộ phim đã lưu, sắp xếp theo thời gian thêm mới nhất
3. Có thể xóa từng phim trực tiếp từ trang này

## 4. Luồng nhận gợi ý phim (Recommendation)

```mermaid
flowchart TD
    A[Người dùng vào trang Trang chủ / Gợi ý cho bạn] --> B[Frontend gọi API GET /recommendations]
    B --> C[Backend lấy dữ liệu: lịch sử xem, rating, watchlist của user]
    C --> D[Tính GenreMatchScore]
    C --> E[Tính SimilarityScore phim tương tự]
    C --> F[Tính AverageRatingScore]
    C --> G[Tính RecencyBoost]
    D --> H[Tổng hợp Hybrid Score]
    E --> H
    F --> H
    G --> H
    H --> I[Sắp xếp giảm dần theo điểm, trả về top N phim]
    I --> J[Hiển thị danh sách gợi ý trên UI]
```

**Chi tiết bước:**
1. Khi người dùng đăng nhập và vào trang chủ / mục "Gợi ý cho bạn"
2. Frontend gọi API `/recommendations`, backend tổng hợp dữ liệu hành vi user
3. Hệ thống tính điểm hybrid cho từng phim ứng viên (loại trừ phim đã xem)
4. Trả về danh sách top N phim, kèm nhãn lý do gợi ý (vd: "Vì bạn thích thể loại Hành động", "Tương tự phim bạn vừa xem")
5. Nếu user mới chưa có lịch sử → fallback về "Phim nổi bật" (trending/top rated) để tránh cold-start

## 5. Luồng người dùng mới (cold-start)

```mermaid
flowchart TD
    A[User mới đăng ký, chưa có lịch sử] --> B[Hiển thị Phim nổi bật/trending]
    B --> C[User xem/thêm watchlist một vài phim]
    C --> D[Hệ thống bắt đầu có đủ dữ liệu]
    D --> E[Chuyển sang gợi ý Hybrid cá nhân hóa]
```

## 6. Tổng quan các trang chính (screens)
| Trang | Yêu cầu đăng nhập | Mô tả |
|---|---|---|
| Trang chủ | Không bắt buộc | Phim nổi bật + gợi ý cá nhân hóa (nếu đã login) |
| Đăng ký/Đăng nhập | Không | Form auth |
| Chi tiết phim | Không bắt buộc | Thông tin phim, nút watchlist, phim tương tự |
| Lịch sử xem | Có | Danh sách phim đã xem, xóa từng mục/toàn bộ |
| Watchlist | Có | Danh sách phim muốn xem sau |
| Gợi ý cho bạn | Có (fallback cho khách) | Danh sách hybrid recommendation |
| Profile | Có | Xem/cập nhật tên, email, avatar |
