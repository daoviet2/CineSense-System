import { ApiClientError } from '@/services/apiClient';

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Bạn cần đăng nhập để xem thông tin này.',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_TOKEN: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  NOT_FOUND: 'Không tìm thấy mục này.',
  TOO_MANY_REQUESTS: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  UPSTREAM_ERROR: 'Dịch vụ phim hiện không khả dụng. Vui lòng thử lại sau.',
  UPSTREAM_TIMEOUT: 'Dịch vụ phim phản hồi quá lâu. Vui lòng thử lại sau.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
};

export function getActivityErrorMessage(
  error: unknown,
  fallback = 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
): string {
  if (error instanceof ApiClientError) {
    return ERROR_MESSAGES[error.code] ?? fallback;
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error && /Failed to fetch|NetworkError/i.test(error.message))
  ) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }
  return fallback;
}
