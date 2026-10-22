import type { Genre, MovieQuery } from '@/types/movie';

/**
 * Derives the section heading text based on active search/genre query parameters.
 */
export function getHomeSectionTitle(query: MovieQuery, genres: Genre[] = []): string {
  if (query.genreId !== undefined) {
    const found = genres.find((g) => g.id === query.genreId);
    return found ? `Thể loại: ${found.name}` : 'Danh mục thể loại';
  }

  if (query.q) {
    return `Kết quả tìm kiếm cho: "${query.q}"`;
  }

  return 'Phim nổi bật';
}

/**
 * Derives the contextual empty state message when a query returns 0 results.
 */
export function getHomeEmptyMessage(query: MovieQuery): string {
  if (query.genreId !== undefined) {
    return 'Không có bộ phim nào thuộc thể loại này.';
  }

  if (query.q) {
    return `Không tìm thấy kết quả phù hợp cho từ khóa "${query.q}".`;
  }

  return 'Hiện không có bộ phim nào để hiển thị.';
}
