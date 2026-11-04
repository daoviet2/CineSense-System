import { MovieSummaryDto, PagedResult } from '../movie/movie.types.js';

/**
 * Internal history entry record.
 */
export interface HistoryEntryRecord {
  id: string;
  userId: string;
  movieId: string;
  watchedAt: Date;
}

/**
 * Public History Entry Data Transfer Object.
 * Strictly excludes userId and internal database details (Decisions D9, D30, D31).
 */
export interface HistoryEntryDto {
  id: string;
  watchedAt: Date;
  movie: MovieSummaryDto;
}

/**
 * Result of recording a view in history.
 * created = true if a new row was inserted.
 * created = false if re-viewed within the dedupe window (Decision D27).
 */
export interface RecordHistoryResult {
  entry: HistoryEntryDto;
  created: boolean;
}

export type PagedHistoryResult = PagedResult<HistoryEntryDto>;

