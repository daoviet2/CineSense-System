import { extractReleaseYear, formatRating } from '../src/lib/movieFormat';

describe('movieFormat', () => {
  describe('formatRating', () => {
    it('formats positive float rating to 1 decimal place', () => {
      expect(formatRating(8.42)).toBe('8.4');
      expect(formatRating(7)).toBe('7.0');
      expect(formatRating(9.99)).toBe('10.0');
      expect(formatRating(6.55)).toBe('6.6');
    });

    it('returns "Chưa có đánh giá" when rating is 0 or negative', () => {
      expect(formatRating(0)).toBe('Chưa có đánh giá');
      expect(formatRating(-1)).toBe('Chưa có đánh giá');
    });

    it('returns "Chưa có đánh giá" when rating is null, undefined, or NaN', () => {
      expect(formatRating(null)).toBe('Chưa có đánh giá');
      expect(formatRating(undefined)).toBe('Chưa có đánh giá');
      expect(formatRating(Number.NaN)).toBe('Chưa có đánh giá');
    });
  });

  describe('extractReleaseYear', () => {
    it('extracts 4-digit year from ISO date strings', () => {
      expect(extractReleaseYear('2023-11-22')).toBe('2023');
      expect(extractReleaseYear('1999-03-31')).toBe('1999');
      expect(extractReleaseYear('2000')).toBe('2000');
    });

    it('returns "—" for missing, empty, or invalid date strings', () => {
      expect(extractReleaseYear(null)).toBe('—');
      expect(extractReleaseYear(undefined)).toBe('—');
      expect(extractReleaseYear('')).toBe('—');
      expect(extractReleaseYear('   ')).toBe('—');
      expect(extractReleaseYear('invalid-date')).toBe('—');
      expect(extractReleaseYear('N/A')).toBe('—');
    });
  });
});
