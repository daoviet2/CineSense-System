export const TMDB_POSTER_SIZE = 'w500';
export const TMDB_MAX_PAGE = 500;
export const MOVIES_PAGE_SIZE = 20;
export const TMDB_FALLBACK_LANGUAGE = 'en-US';

export interface TmdbClientConfig {
  apiKey: string;
  baseUrl: string;
  language: string;
  timeoutMs: number;
}
