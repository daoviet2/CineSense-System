import { AuthApiError } from '@/services/authService';

export function getAuthErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof AuthApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.';
      case 'EMAIL_ALREADY_EXISTS':
        return 'Email này đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.';
      case 'TOO_MANY_REQUESTS':
        return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.';
      case 'VALIDATION_ERROR':
        return error.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
      case 'UNAUTHORIZED':
      case 'INVALID_TOKEN':
      case 'TOKEN_EXPIRED':
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      default:
        if (error.statusCode === 429) {
          return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.';
        }
        if (error.statusCode === 409) {
          return 'Dữ liệu đã tồn tại trong hệ thống.';
        }
        if (error.statusCode === 401) {
          return 'Email hoặc mật khẩu không chính xác.';
        }
        return error.message || fallbackMessage;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }
    return error.message;
  }

  return fallbackMessage;
}
