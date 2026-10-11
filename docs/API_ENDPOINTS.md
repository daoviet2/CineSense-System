# API Endpoints Documentation — CineSense (Giai đoạn 1: Authentication)

Tài liệu đặc tả toàn bộ các API thuộc module `auth` và `users` được triển khai trong **Giai đoạn 1 (Authentication)** của hệ thống CineSense.

---

## 1. Quy ước chung (General Conventions)

* **Base URL**: `http://localhost:4001` (môi trường Local Development)
* **Quy ước đặt tên URL**: RESTful, số nhiều, **không có prefix `/api`** (Quyết định D5).
* **Cơ chế xác thực**:
  * Sử dụng **HttpOnly Cookie** mang tên `access_token` (Quyết định D1).
  * Thuộc tính Cookie: `HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` (7 ngày), gắn cờ `Secure` khi chạy môi trường `production`.
  * Token format: JWT ký thuật toán `HS256`, payload `{ sub: userId }`.
  * Không lưu trữ token trong `localStorage` hay biến JavaScript trên trình duyệt.
* **Bảo vệ dữ liệu nhạy cảm**:
  * Trường `password_hash` không bao giờ được trả ra trong bất kỳ API response nào (Quyết định D9).
* **Cấu trúc phản hồi lỗi chuẩn hóa (Quyết định D3)**:
  Tất cả các mã lỗi (4xx, 5xx) đều tuân theo một cấu trúc JSON duy nhất:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Thông điệp mô tả lỗi thân thiện hoặc cụ thể",
      "details": [
        {
          "path": ["email"],
          "message": "Must be a valid email address"
        }
      ]
    }
  }
  ```

---

## 2. Danh sách Endpoints

### 2.1 Smoke Check

#### `GET /health`
Kiểm tra trạng thái sẵn sàng của backend server.
* **Yêu cầu xác thực**: Không (Public).
* **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-10T09:00:00.000Z"
  }
  ```

---

### 2.2 Module Authentication (`/auth`)

#### `POST /auth/register`
Đăng ký tài khoản người dùng mới.
* **Yêu cầu xác thực**: Không (Public).
* **Rate Limit**: Tối đa 10 requests / 15 phút trên mỗi IP.
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "name": "Nguyen Van A",
    "email": "user@example.com",
    "password": "mySecurePassword123"
  }
  ```
  * `name`: string, 1–100 ký tự (bắt buộc).
  * `email`: string, định dạng email hợp lệ, tự động trim và lowercase (bắt buộc).
  * `password`: string, độ dài tối thiểu 8 ký tự và tối đa 72 bytes UTF-8 (Quyết định D2).
* **Response `201 Created`**:
  * **Headers**: `Set-Cookie: access_token=<jwt_token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  * **Body**:
    ```json
    {
      "user": {
        "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "name": "Nguyen Van A",
        "email": "user@example.com",
        "avatarUrl": null,
        "createdAt": "2026-10-10T09:00:00.000Z"
      }
    }
    ```
* **Lỗi có thể trả về**:
  * `400 Bad Request` — `code: "VALIDATION_ERROR"`: Thiếu trường hoặc dữ liệu sai định dạng (mật khẩu < 8 ký tự hoặc > 72 bytes).
  * `409 Conflict` — `code: "EMAIL_ALREADY_EXISTS"`: Email đã được đăng ký trước đó.
  * `429 Too Many Requests` — `code: "TOO_MANY_REQUESTS"`: Vượt quá giới hạn lượt đăng ký.

---

#### `POST /auth/login`
Đăng nhập người dùng bằng email và mật khẩu.
* **Yêu cầu xác thực**: Không (Public).
* **Rate Limit**: Tối đa 20 requests / 15 phút trên mỗi IP.
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "mySecurePassword123"
  }
  ```
* **Response `200 OK`**:
  * **Headers**: `Set-Cookie: access_token=<jwt_token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  * **Body**:
    ```json
    {
      "user": {
        "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "name": "Nguyen Van A",
        "email": "user@example.com",
        "avatarUrl": null,
        "createdAt": "2026-10-10T09:00:00.000Z"
      }
    }
    ```
* **Bảo mật chống tấn công (Quyết định D3)**:
  * Khi sai email hoặc sai mật khẩu, hệ thống **luôn trả về cùng một mã lỗi và message chung** (`401 INVALID_CREDENTIALS`).
  * Thực hiện tính toán hash giả lập (dummy hash comparison) khi email không tồn tại nhằm ngăn chặn timing attack và user enumeration.
* **Lỗi có thể trả về**:
  * `400 Bad Request` — `code: "VALIDATION_ERROR"`: Dữ liệu gửi lên không đúng định dạng.
  * `401 Unauthorized` — `code: "INVALID_CREDENTIALS"`: Sai thông tin đăng nhập (`Email hoặc mật khẩu không chính xác`).
  * `429 Too Many Requests` — `code: "TOO_MANY_REQUESTS"`: Vượt quá giới hạn đăng nhập.

---

#### `POST /auth/logout`
Đăng xuất người dùng và thu hồi phiên trên trình duyệt.
* **Yêu cầu xác thực**: Không bắt buộc (Idempotent).
* **Response `204 No Content`**:
  * **Headers**: `Set-Cookie: access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`
  * **Body**: Rỗng.

---

### 2.3 Module User Profile (`/users`)

#### `GET /users/me`
Lấy thông tin tài khoản của người dùng đang đăng nhập.
* **Yêu cầu xác thực**: **Bắt buộc** (HttpOnly Cookie `access_token`).
* **Request Headers**: `Cookie: access_token=<jwt_token>` (Trình duyệt gửi tự động với `credentials: 'include'`).
* **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Nguyen Van A",
      "email": "user@example.com",
      "avatarUrl": "https://example.com/avatar.jpg",
      "createdAt": "2026-10-10T09:00:00.000Z"
    }
  }
  ```
* **Lỗi có thể trả về**:
  * `401 Unauthorized` — `code: "UNAUTHORIZED"`: Không có cookie xác thực.
  * `401 Unauthorized` — `code: "TOKEN_EXPIRED"`: Phiên đăng nhập đã hết hạn (> 7 ngày).
  * `401 Unauthorized` — `code: "INVALID_TOKEN"`: Token bị sửa đổi, sai chữ ký hoặc thuật toán không hợp lệ.
  * `404 Not Found` — `code: "NOT_FOUND"`: Người dùng không tồn tại trong cơ sở dữ liệu.

---

#### `PATCH /users/me`
Cập nhật thông tin hồ sơ (họ tên, email, avatar URL).
* **Yêu cầu xác thực**: **Bắt buộc** (HttpOnly Cookie `access_token`).
* **Request Headers**: `Content-Type: application/json`
* **Request Body**: (Ít nhất một trong ba trường phải được cung cấp)
  ```json
  {
    "name": "Nguyen Van B",
    "email": "new_email@example.com",
    "avatarUrl": "https://example.com/my-new-avatar.png"
  }
  ```
  * `name` (tùy chọn): string, 1–100 ký tự (trim).
  * `email` (tùy chọn): string, định dạng email hợp lệ (trim + lowercase).
  * `avatarUrl` (tùy chọn): string URL bắt đầu bằng `http://` hoặc `https://`, tối đa 2048 ký tự (Quyết định D6), hoặc truyền `null` để xóa avatar hiện tại.
* **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Nguyen Van B",
      "email": "new_email@example.com",
      "avatarUrl": "https://example.com/my-new-avatar.png",
      "createdAt": "2026-10-10T09:00:00.000Z"
    }
  }
  ```
* **Lỗi có thể trả về**:
  * `400 Bad Request` — `code: "VALIDATION_ERROR"`: Body rỗng, định dạng email không hợp lệ, URL avatar không đúng `http/https`, hoặc vượt quá 2048 ký tự.
  * `401 Unauthorized` — `code: "UNAUTHORIZED"`: Chưa đăng nhập hoặc token không hợp lệ.
  * `409 Conflict` — `code: "EMAIL_ALREADY_EXISTS"`: Email mới trùng với email của tài khoản khác trong hệ thống.

---

## 3. Bảng mã lỗi tổng hợp (Error Codes Summary)

| Mã lỗi (`code`) | HTTP Status | Ý nghĩa |
|---|---|---|
| `VALIDATION_ERROR` | `400` | Dữ liệu gửi lên không vượt qua kiểm tra Zod schema |
| `INVALID_JSON` | `400` | Cú pháp JSON trong payload request bị lỗi |
| `INVALID_CREDENTIALS` | `401` | Sai email hoặc mật khẩu khi đăng nhập |
| `UNAUTHORIZED` | `401` | Thiếu cookie xác thực |
| `TOKEN_EXPIRED` | `401` | Token JWT đã hết hạn |
| `INVALID_TOKEN` | `401` | Token JWT không hợp lệ / sai chữ ký |
| `NOT_FOUND` | `404` | Không tìm thấy tài nguyên hoặc endpoint |
| `EMAIL_ALREADY_EXISTS` | `409` | Email đã tồn tại khi đăng ký hoặc đổi email |
| `TOO_MANY_REQUESTS` | `429` | Vượt quá số lượng request cho phép trong khung thời gian |
| `INTERNAL_SERVER_ERROR` | `500` | Lỗi máy chủ không xác định |
