import {
  DEFAULT_MOVIE_PAGE,
  MAX_MOVIE_PAGE,
} from '@/config/movie';
import type { MovieQuery } from '@/types/movie';

type SearchParamsReader = Pick<URLSearchParams, 'get'>;

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) {
    return DEFAULT_MOVIE_PAGE;
  }

  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < DEFAULT_MOVIE_PAGE) {
    return DEFAULT_MOVIE_PAGE;
  }

  return Math.min(page, MAX_MOVIE_PAGE);
}

function parseGenreId(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const genreId = Number(value);
  return Number.isSafeInteger(genreId) && genreId > 0 ? genreId : undefined;
}

export function parseMovieQuery(params: SearchParamsReader): MovieQuery {
  const page = parsePage(params.get('page'));
  const genreId = parseGenreId(params.get('genreId'));

  // Genre selection takes precedence so the UI never creates an invalid q+genre request.
  if (genreId !== undefined) {
    return { page, genreId };
  }

  const q = params.get('q')?.trim();
  return q ? { page, q } : { page };
}

export function serializeMovieQuery(query: MovieQuery): URLSearchParams {
  const params = new URLSearchParams();
  const page = Number.isSafeInteger(query.page) && query.page >= DEFAULT_MOVIE_PAGE
    ? Math.min(query.page, MAX_MOVIE_PAGE)
    : DEFAULT_MOVIE_PAGE;

  if (page !== DEFAULT_MOVIE_PAGE) {
    params.set('page', String(page));
  }

  if (Number.isSafeInteger(query.genreId) && query.genreId! > 0) {
    params.set('genreId', String(query.genreId));
    return params;
  }

  const q = query.q?.trim();
  if (q) {
    params.set('q', q);
  }

  return params;
}
