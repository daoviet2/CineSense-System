import { getAuthErrorMessage } from '../src/lib/authErrors';
import { AuthApiError } from '../src/services/authService';

describe('authErrors', () => {
  it('maps INVALID_CREDENTIALS (401) to friendly Vietnamese message', () => {
    const error = new AuthApiError(401, 'INVALID_CREDENTIALS', 'Backend message');
    expect(getAuthErrorMessage(error, 'Mặc định')).toBe(
      'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.'
    );
  });

  it('maps EMAIL_ALREADY_EXISTS (409) to friendly message', () => {
    const error = new AuthApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email exists');
    expect(getAuthErrorMessage(error, 'Mặc định')).toBe(
      'Email này đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.'
    );
  });

  it('maps TOO_MANY_REQUESTS (429) to friendly message', () => {
    const error = new AuthApiError(429, 'TOO_MANY_REQUESTS', 'Rate limited');
    expect(getAuthErrorMessage(error, 'Mặc định')).toBe(
      'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.'
    );
  });

  it('maps network errors to connection issue message', () => {
    const error = new Error('Failed to fetch');
    expect(getAuthErrorMessage(error, 'Mặc định')).toBe(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
    );
  });

  it('returns fallback message for unknown error types', () => {
    expect(getAuthErrorMessage(null, 'Lỗi không xác định')).toBe('Lỗi không xác định');
  });
});
