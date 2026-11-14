import type { MovieSummary } from '@/types/movie';

export interface PagedResult<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface HistoryEntry {
  id: string;
  watchedAt: string;
  movie: MovieSummary;
}

export interface WatchlistItem {
  addedAt: string;
  movie: MovieSummary;
}

export interface WatchlistStatus {
  inWatchlist: boolean;
  addedAt: string | null;
}
