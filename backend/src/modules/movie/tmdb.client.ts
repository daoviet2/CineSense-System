import { AppError } from '../../middlewares/errorHandler.js';
import {
  TmdbClientConfig,
} from '../../config/tmdb.js';
import {
  tmdbGenreListSchema,
  tmdbMovieDetailsSchema,
  tmdbMoviePageSchema,
  TmdbGenreList,
  TmdbMovieDetails,
  TmdbMoviePage,
} from './tmdb.types.js';

const UPSTREAM_ERROR_MESSAGE = 'Unable to retrieve movie data';
const UPSTREAM_TIMEOUT_MESSAGE = 'Movie data request timed out';
const NOT_FOUND_MESSAGE = 'Movie resource not found';

export interface ITmdbClient {
  getMovieDetails(tmdbId: number, language?: string): Promise<TmdbMovieDetails>;
  getPopularMovies(page: number): Promise<TmdbMoviePage>;
  searchMovies(query: string, page: number): Promise<TmdbMoviePage>;
  discoverMoviesByGenre(genreId: number, page: number): Promise<TmdbMoviePage>;
  getGenres(): Promise<TmdbGenreList>;
}

export interface TmdbClientOptions {
  config: TmdbClientConfig;
  fetchImpl?: typeof fetch;
}

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  ((error as { name?: unknown }).name === 'AbortError' ||
    (error as { name?: unknown }).name === 'TimeoutError');

const createUpstreamError = (): AppError =>
  new AppError(UPSTREAM_ERROR_MESSAGE, 502, 'UPSTREAM_ERROR');

const createTimeoutError = (): AppError =>
  new AppError(UPSTREAM_TIMEOUT_MESSAGE, 504, 'UPSTREAM_TIMEOUT');

export function createTmdbClient({ config, fetchImpl = fetch }: TmdbClientOptions): ITmdbClient {
  const baseUrl = new URL(config.baseUrl);
  const basePath = baseUrl.pathname.replace(/\/+$/, '');

  const request = async <T>(
    path: string,
    query: URLSearchParams,
    parse: (payload: unknown) => T
  ): Promise<T> => {
    const url = new URL(baseUrl);
    url.pathname = `${basePath}/${path}`;
    query.set('api_key', config.apiKey);
    url.search = query.toString();

    let response: Response;
    try {
      // No automatic retries: keep quota use bounded and let the caller own retry policy.
      response = await fetchImpl(url, {
        method: 'GET',
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      if (isAbortError(error)) throw createTimeoutError();
      throw createUpstreamError();
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError(NOT_FOUND_MESSAGE, 404, 'NOT_FOUND');
      }
      throw createUpstreamError();
    }

    let payload: unknown;
    try {
      payload = await response.json();
      return parse(payload);
    } catch {
      throw createUpstreamError();
    }
  };

  const localizedQuery = (language = config.language): URLSearchParams =>
    new URLSearchParams({ language });

  return {
    getMovieDetails(tmdbId, language) {
      return request(
        `movie/${tmdbId}`,
        localizedQuery(language),
        (payload) => tmdbMovieDetailsSchema.parse(payload)
      );
    },

    getPopularMovies(page) {
      const query = localizedQuery();
      query.set('page', String(page));
      return request('movie/popular', query, (payload) => tmdbMoviePageSchema.parse(payload));
    },

    searchMovies(searchQuery, page) {
      const query = localizedQuery();
      query.set('query', searchQuery);
      query.set('page', String(page));
      return request('search/movie', query, (payload) => tmdbMoviePageSchema.parse(payload));
    },

    discoverMoviesByGenre(genreId, page) {
      const query = localizedQuery();
      query.set('with_genres', String(genreId));
      query.set('sort_by', 'popularity.desc');
      query.set('page', String(page));
      return request('discover/movie', query, (payload) => tmdbMoviePageSchema.parse(payload));
    },

    getGenres() {
      return request('genre/movie/list', localizedQuery(), (payload) =>
        tmdbGenreListSchema.parse(payload)
      );
    },
  };
}
