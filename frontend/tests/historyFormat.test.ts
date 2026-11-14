import { formatWatchedAt } from '../src/lib/historyFormat';

describe('formatWatchedAt', () => {
  it('formats UTC timestamps in vi-VN using the supplied time zone', () => {
    const formatted = formatWatchedAt('2026-11-14T10:05:00.000Z', 'Asia/Ho_Chi_Minh');
    expect(formatted).toContain('14/11/2026');
    expect(formatted).toContain('17:05');
  });

  it('returns a readable fallback for invalid timestamps', () => {
    expect(formatWatchedAt('invalid')).toBe('Không rõ thời gian');
  });
});
