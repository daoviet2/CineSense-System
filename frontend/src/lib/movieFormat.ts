/**
 * Movie format utilities
 * Pure functions for formatting rating, release year, and movie metadata
 */

/**
 * Formats a TMDB average rating (0-10) to 1 decimal place.
 * Returns 'Chưa có đánh giá' if the rating is 0, negative, NaN, null, or undefined.
 *
 * @param averageRating - Numeric rating from TMDB (0-10)
 * @returns Formatted rating string, e.g., '8.4', '7.0', or 'Chưa có đánh giá'
 */
export function formatRating(averageRating: number | null | undefined): string {
  if (
    averageRating === null ||
    averageRating === undefined ||
    typeof averageRating !== 'number' ||
    Number.isNaN(averageRating) ||
    averageRating <= 0
  ) {
    return 'Chưa có đánh giá';
  }

  // Round to 1 decimal place with Number.EPSILON to avoid floating-point precision issues
  const rounded = Math.round((averageRating + Number.EPSILON) * 10) / 10;
  return rounded.toFixed(1);
}

/**
 * Extracts a 4-digit release year from a release date string (YYYY-MM-DD).
 * Returns '—' if the release date is missing, empty, or not starting with 4 digits.
 *
 * @param releaseDate - TMDB release date string, e.g. '2023-11-22'
 * @returns 4-digit year string, e.g. '2023' or '—'
 */
export function extractReleaseYear(releaseDate: string | null | undefined): string {
  if (!releaseDate || typeof releaseDate !== 'string') {
    return '—';
  }

  const trimmed = releaseDate.trim();
  const match = trimmed.match(/^(\d{4})/);
  if (!match) {
    return '—';
  }

  return match[1];
}
