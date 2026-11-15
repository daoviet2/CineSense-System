/**
 * Pure helper functions for Movie Detail page (/movie/[id])
 */

/**
 * Validates and parses the [id] route parameter into a positive TMDB integer ID.
 * Returns null if the parameter is missing, non-numeric, zero, negative, or exceeds int32.
 */
export function parseMovieId(param: string | string[] | undefined): number | null {
  if (!param) {
    return null;
  }

  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const id = Number(trimmed);
  // TMDB ID must be a positive integer within standard 32-bit integer range
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2_147_483_647) {
    return null;
  }

  return id;
}

/**
 * Returns the overview text or a friendly fallback message if missing or blank.
 */
export function getMovieOverviewText(overview: string | null | undefined): string {
  if (!overview || typeof overview !== 'string' || !overview.trim()) {
    return 'Chưa có phần tóm tắt nội dung cho bộ phim này.';
  }

  return overview.trim();
}

export function shouldRecordMovieView(
  authenticated: boolean,
  requestedTmdbId: number,
  loadedTmdbId: number | undefined,
  recordedTmdbId: number | null
): boolean {
  return authenticated && loadedTmdbId === requestedTmdbId && recordedTmdbId !== requestedTmdbId;
}
