import { AppError } from '../../src/middlewares/errorHandler.js';
import { TmdbClientConfig } from '../../src/config/tmdb.js';
import { createTmdbClient } from '../../src/modules/movie/tmdb.client.js';

const config: TmdbClientConfig = {
  apiKey: 'unit-test-tmdb-key-not-secret',
  baseUrl: 'https://api.themoviedb.org/3',
  language: 'vi-VN',
  timeoutMs: 5000,
};

const detailPayload = {
  id: 603,
  title: 'The Matrix',
  overview: 'A computer hacker learns about reality.',
  poster_path: '/poster.jpg',
  release_date: '1999-03-30',
  vote_average: 8.7,
  genres: [{ id: 28, name: 'Action' }],
};

const pagePayload = {
  page: 1,
  results: [
    {
      id: 603,
      title: 'The Matrix',
      overview: 'A computer hacker learns about reality.',
      poster_path: '/poster.jpg',
      release_date: '1999-03-30',
      vote_average: 8.7,
      genre_ids: [28],
    },
  ],
  total_pages: 1,
  total_results: 1,
};

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });

interface FetchCall {
  input: RequestInfo | URL;
  init?: RequestInit;
}

const createFetch = (results: Array<Response | Error>) => {
  const calls: FetchCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    const result = results[calls.length - 1];
    if (result instanceof Error) throw result;
    if (!result) throw new Error('Unexpected fetch call');
    return result;
  };

  return { fetchImpl, calls };
};

const urlFor = (call: FetchCall): URL => new URL(call.input.toString());

describe('TMDB client request construction', () => {
  it('uses the expected paths, localized query parameters, and encoded search text', async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse(detailPayload),
      jsonResponse(pagePayload),
      jsonResponse(pagePayload),
      jsonResponse(pagePayload),
      jsonResponse({ genres: [{ id: 28, name: 'Action' }] }),
    ]);
    const client = createTmdbClient({ config, fetchImpl });

    await client.getMovieDetails(603, 'en-US');
    await client.getPopularMovies(2);
    await client.searchMovies('Dune & Part Two', 3);
    await client.discoverMoviesByGenre(28, 4);
    await client.getGenres();

    const urls = calls.map(urlFor);
    expect(urls.map((url) => url.pathname)).toEqual([
      '/3/movie/603',
      '/3/movie/popular',
      '/3/search/movie',
      '/3/discover/movie',
      '/3/genre/movie/list',
    ]);
    expect(urls[0].searchParams.get('language')).toBe('en-US');
    expect(urls[1].searchParams.get('language')).toBe('vi-VN');
    expect(urls[1].searchParams.get('page')).toBe('2');
    expect(urls[2].searchParams.get('query')).toBe('Dune & Part Two');
    expect(urls[2].search).toContain('Dune+%26+Part+Two');
    expect(urls[2].searchParams.get('page')).toBe('3');
    expect(urls[3].searchParams.get('with_genres')).toBe('28');
    expect(urls[3].searchParams.get('sort_by')).toBe('popularity.desc');
    expect(urls[3].searchParams.get('page')).toBe('4');
    expect(urls.every((url) => url.searchParams.get('api_key') === config.apiKey)).toBe(true);
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('preserves a base URL path and strips trailing slashes', async () => {
    const { fetchImpl, calls } = createFetch([jsonResponse({ genres: [] })]);
    const client = createTmdbClient({
      config: { ...config, baseUrl: 'https://example.test/api/v3///' },
      fetchImpl,
    });

    await client.getGenres();

    expect(urlFor(calls[0]).pathname).toBe('/api/v3/genre/movie/list');
  });
});

describe('TMDB client response and error mapping', () => {
  it('returns parsed details, movie pages, and genre lists', async () => {
    const { fetchImpl } = createFetch([
      jsonResponse(detailPayload),
      jsonResponse(pagePayload),
      jsonResponse({ genres: [{ id: 28, name: 'Action' }] }),
    ]);
    const client = createTmdbClient({ config, fetchImpl });

    await expect(client.getMovieDetails(603)).resolves.toMatchObject({ id: 603, title: 'The Matrix' });
    await expect(client.getPopularMovies(1)).resolves.toMatchObject({ results: [{ genre_ids: [28] }] });
    await expect(client.getGenres()).resolves.toEqual({ genres: [{ id: 28, name: 'Action' }] });
  });

  it('maps an upstream 404 to NOT_FOUND', async () => {
    const { fetchImpl } = createFetch([jsonResponse({ status_message: 'upstream details' }, 404)]);
    const client = createTmdbClient({ config, fetchImpl });

    await expect(client.getMovieDetails(999)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Movie resource not found',
    });
  });

  it.each([401, 403, 429, 500])('maps upstream status %i to a generic UPSTREAM_ERROR', async (status) => {
    const { fetchImpl } = createFetch([jsonResponse({ status_message: 'private upstream detail' }, status)]);
    const client = createTmdbClient({ config, fetchImpl });

    await expect(client.getPopularMovies(1)).rejects.toMatchObject({
      statusCode: 502,
      code: 'UPSTREAM_ERROR',
      message: 'Unable to retrieve movie data',
    });
  });

  it('maps aborts and timeouts to UPSTREAM_TIMEOUT', async () => {
    const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' });
    const { fetchImpl, calls } = createFetch([abortError]);
    const client = createTmdbClient({ config, fetchImpl });

    await expect(client.getPopularMovies(1)).rejects.toMatchObject({
      statusCode: 504,
      code: 'UPSTREAM_TIMEOUT',
    });
    expect(calls).toHaveLength(1);
  });

  it('maps network failures, malformed JSON, and invalid payloads to UPSTREAM_ERROR', async () => {
    const invalidJsonResponse = {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('body parse failure');
      },
    } as unknown as Response;
    const { fetchImpl } = createFetch([
      new TypeError('socket disconnected'),
      invalidJsonResponse,
      jsonResponse({ page: 1, results: 'invalid', total_pages: 1, total_results: 1 }),
    ]);
    const client = createTmdbClient({ config, fetchImpl });

    await expect(client.getPopularMovies(1)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', statusCode: 502 });
    await expect(client.getPopularMovies(1)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', statusCode: 502 });
    await expect(client.getPopularMovies(1)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', statusCode: 502 });
  });

  it('does not expose the API key or upstream error details and never retries', async () => {
    const fetchError = new Error(`network failure for ${config.apiKey}`);
    const { fetchImpl, calls } = createFetch([fetchError]);
    const client = createTmdbClient({ config, fetchImpl });
    let caught: unknown;

    try {
      await client.getPopularMovies(1);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(calls).toHaveLength(1);
    if (caught instanceof AppError) {
      expect(caught.message).not.toContain(config.apiKey);
      expect(caught.stack).not.toContain(config.apiKey);
      expect(caught.details).toBeUndefined();
      expect('cause' in caught).toBe(false);
    }
  });
});
