import { ApiClientError } from '@/services/apiClient';

const MOVIE_ERROR_MESSAGES: Record<string, string> = {
  UPSTREAM_ERROR: 'Dịch vụ phim hiện không khả dụng. Vui lòng thử lại sau.',
  UPSTREAM_TIMEOUT: 'Dịch vụ phim phản hồi quá lâu. Vui lòng thử lại sau.',
  NOT_FOUND: 'Không tìm thấy phim này.',
  TOO_MANY_REQUESTS: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
  VALIDATION_ERROR: 'Thông tin tìm kiếm không hợp lệ. Vui lòng kiểm tra lại.',
};

export function getMovieErrorMessage(
  error: unknown,
  fallbackMessage = 'Không thể tải dữ liệu phim. Vui lòng thử lại.'
): string {
  if (error instanceof ApiClientError) {
    return MOVIE_ERROR_MESSAGES[error.code] || fallbackMessage;
  }

  if (
    error instanceof TypeError ||
    (error instanceof Error &&
      (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')))
  ) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  return fallbackMessage;
}
