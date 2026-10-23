import { getMovieOverviewText, parseMovieId } from '../src/lib/movieDetail';

describe('movieDetail helpers', () => {
  describe('parseMovieId', () => {
    it('parses valid positive integer string', () => {
      expect(parseMovieId('603')).toBe(603);
      expect(parseMovieId('1')).toBe(1);
      expect(parseMovieId('12345678')).toBe(12345678);
    });

    it('handles string array parameter from Next.js route params', () => {
      expect(parseMovieId(['603'])).toBe(603);
      expect(parseMovieId(['550', 'other'])).toBe(550);
    });

    it('returns null for zero and negative numbers', () => {
      expect(parseMovieId('0')).toBeNull();
      expect(parseMovieId('-1')).toBeNull();
      expect(parseMovieId('-603')).toBeNull();
    });

    it('returns null for non-numeric, decimal, or invalid strings', () => {
      expect(parseMovieId('abc')).toBeNull();
      expect(parseMovieId('603abc')).toBeNull();
      expect(parseMovieId('12.34')).toBeNull();
      expect(parseMovieId('')).toBeNull();
      expect(parseMovieId('   ')).toBeNull();
    });

    it('returns null for undefined, null, or exceeding int32 values', () => {
      expect(parseMovieId(undefined)).toBeNull();
      expect(parseMovieId('99999999999999999999999')).toBeNull();
      expect(parseMovieId('2147483648')).toBeNull();
    });
  });

  describe('getMovieOverviewText', () => {
    it('returns trimmed overview when non-empty string is provided', () => {
      expect(getMovieOverviewText('Phim kể về hành trình giải cứu thế giới.')).toBe(
        'Phim kể về hành trình giải cứu thế giới.'
      );
      expect(getMovieOverviewText('   Tóm tắt có khoảng trắng thừa.   ')).toBe(
        'Tóm tắt có khoảng trắng thừa.'
      );
    });

    it('returns friendly fallback when overview is null, undefined, or empty', () => {
      const fallback = 'Chưa có phần tóm tắt nội dung cho bộ phim này.';
      expect(getMovieOverviewText(null)).toBe(fallback);
      expect(getMovieOverviewText(undefined)).toBe(fallback);
      expect(getMovieOverviewText('')).toBe(fallback);
      expect(getMovieOverviewText('   ')).toBe(fallback);
    });
  });
});
