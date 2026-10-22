import { getHomeEmptyMessage, getHomeSectionTitle } from '../src/lib/movieHome';
import type { Genre } from '../src/types/movie';

describe('movieHome helpers', () => {
  const sampleGenres: Genre[] = [
    { id: 28, name: 'Hành động' },
    { id: 12, name: 'Phiêu lưu' },
    { id: 878, name: 'Khoa học viễn tưởng' },
  ];

  describe('getHomeSectionTitle', () => {
    it('returns "Phim nổi bật" when neither genreId nor q is specified', () => {
      expect(getHomeSectionTitle({ page: 1 }, sampleGenres)).toBe('Phim nổi bật');
      expect(getHomeSectionTitle({ page: 3 }, sampleGenres)).toBe('Phim nổi bật');
    });

    it('returns "Thể loại: <name>" when genreId is found', () => {
      expect(getHomeSectionTitle({ page: 1, genreId: 28 }, sampleGenres)).toBe('Thể loại: Hành động');
      expect(getHomeSectionTitle({ page: 2, genreId: 878 }, sampleGenres)).toBe('Thể loại: Khoa học viễn tưởng');
    });

    it('falls back to "Danh mục thể loại" when genreId is not found in genres list', () => {
      expect(getHomeSectionTitle({ page: 1, genreId: 9999 }, sampleGenres)).toBe('Danh mục thể loại');
      expect(getHomeSectionTitle({ page: 1, genreId: 28 }, [])).toBe('Danh mục thể loại');
    });

    it('returns "Kết quả tìm kiếm cho: \"<q>\"" when search query is specified', () => {
      expect(getHomeSectionTitle({ page: 1, q: 'Avatar' }, sampleGenres)).toBe('Kết quả tìm kiếm cho: "Avatar"');
      expect(getHomeSectionTitle({ page: 1, q: 'The Matrix' }, sampleGenres)).toBe('Kết quả tìm kiếm cho: "The Matrix"');
    });

    it('gives genreId precedence over q if both are present in query object', () => {
      expect(getHomeSectionTitle({ page: 1, genreId: 12, q: 'test' }, sampleGenres)).toBe('Thể loại: Phiêu lưu');
    });
  });

  describe('getHomeEmptyMessage', () => {
    it('returns genre empty message when genreId is present', () => {
      expect(getHomeEmptyMessage({ page: 1, genreId: 28 })).toBe('Không có bộ phim nào thuộc thể loại này.');
    });

    it('returns search empty message with query string when q is present', () => {
      expect(getHomeEmptyMessage({ page: 1, q: 'matrix999' })).toBe(
        'Không tìm thấy kết quả phù hợp cho từ khóa "matrix999".'
      );
    });

    it('returns general empty message when neither filter is present', () => {
      expect(getHomeEmptyMessage({ page: 1 })).toBe('Hiện không có bộ phim nào để hiển thị.');
    });
  });
});
