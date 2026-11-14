import { getActivityErrorMessage } from '../src/lib/activityErrors';
import { ApiClientError } from '../src/services/apiClient';

describe('getActivityErrorMessage', () => {
  it.each([
    ['UNAUTHORIZED', 'đăng nhập'],
    ['NOT_FOUND', 'Không tìm thấy'],
    ['TOO_MANY_REQUESTS', 'quá nhanh'],
    ['UPSTREAM_ERROR', 'không khả dụng'],
    ['UPSTREAM_TIMEOUT', 'quá lâu'],
  ])('maps %s into a Vietnamese message', (code, phrase) => {
    expect(getActivityErrorMessage(new ApiClientError(400, code, 'server detail'))).toContain(phrase);
  });

  it('handles network errors and unknown errors', () => {
    expect(getActivityErrorMessage(new TypeError('Failed to fetch'))).toContain('kết nối');
    expect(getActivityErrorMessage(new Error('other'), 'Thử lại')).toBe('Thử lại');
  });
});
