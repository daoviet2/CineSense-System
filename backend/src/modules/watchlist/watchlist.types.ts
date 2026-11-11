import { MovieSummaryDto, PagedResult } from '../movie/movie.types.js';

/**
 * Internal watchlist item record representation.
 */
export interface WatchlistItemRecord {
  id: string;
  userId: string;
  movieId: string;
  addedAt: Date;
}

/**
 * Public Watchlist Item Data Transfer Object.
 * Strictly excludes userId and internal database UUIDs (Decisions D9, D30, D31).
 */
export interface WatchlistItemDto {
  addedAt: Date;
  movie: MovieSummaryDto;
}

/**
 * Result of adding a movie to a user's watchlist.
 * created = true if newly inserted.
 * created = false if already existed (idempotent, Decision D28).
 */
export interface AddWatchlistResult {
  item: WatchlistItemDto;
  created: boolean;
}

/**
 * Watchlist status of a movie for a specific user (Decision D26).
 */
export interface WatchlistStatusDto {
  inWatchlist: boolean;
  addedAt: Date | null;
}

export type PagedWatchlistResult = PagedResult<WatchlistItemDto>;
