import { getMovieErrorMessage } from '../src/lib/movieErrors';
import { ApiClientError } from '../src/services/apiClient';

describe('getMovieErrorMessage', () => {
  it.each([
    ['UPSTREAM_ERROR', 'Dịch vụ phim hiện không khả dụng. Vui lòng thử lại sau.'],
    ['UPSTREAM_TIMEOUT', 'Dịch vụ phim phản hồi quá lâu. Vui lòng thử lại sau.'],
    ['NOT_FOUND', 'Không tìm thấy phim này.'],
    ['TOO_MANY_REQUESTS', 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'],
    ['VALIDATION_ERROR', 'Thông tin tìm kiếm không hợp lệ. Vui lòng kiểm tra lại.'],
  ])('maps %s to a localized message', (code, expected) => {
    expect(getMovieErrorMessage(new ApiClientError(400, code, 'backend message'))).toBe(expected);
  });

  it('maps network errors to a connection message', () => {
    expect(getMovieErrorMessage(new TypeError('Failed to fetch'))).toContain('kết nối');
  });

  it('uses a caller fallback for unknown errors without exposing their message', () => {
    expect(getMovieErrorMessage(new ApiClientError(500, 'INTERNAL_SERVER_ERROR', 'private'), 'Thử lại'))
      .toBe('Thử lại');
  });
});
