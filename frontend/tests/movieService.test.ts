import { movieService } from '../src/services/movieService';
import { ApiClientError } from '../src/services/apiClient';

describe('movieService', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    jest.clearAllMocks();
  });

  it('requests popular movies with page and includes credentials', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4001/';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
    } as unknown as Response);

    await movieService.getMovies({ page: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4001/movies?page=1',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('encodes search and genre query values without sending undefined fields', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], page: 2, totalPages: 1, totalResults: 0 }),
    } as unknown as Response);

    await movieService.getMovies({ page: 2, q: '  Dune & Co  ' });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/movies?page=2&q=Dune+%26+Co'),
      expect.any(Object)
    );

    await movieService.getMovies({ page: 1, genreId: 28 });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/movies?page=1&genreId=28'),
      expect.any(Object)
    );
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).not.toContain('undefined');
  });

  it('gives a selected genre precedence over a search term', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], page: 1, totalPages: 0, totalResults: 0 }),
    } as unknown as Response);

    await movieService.getMovies({ page: 1, q: 'Dune', genreId: 28 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/movies?page=1&genreId=28'),
      expect.any(Object)
    );
  });

  it('fetches detail and genre list endpoints', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tmdbId: 603 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [] }) }) as jest.Mock;

    await movieService.getMovie(603);
    await movieService.getGenres();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/movies/603'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/genres'),
      expect.any(Object)
    );
  });

  it('throws a typed API error using the shared D3 envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({
        error: { code: 'UPSTREAM_ERROR', message: 'Dịch vụ phim hiện không khả dụng' },
      }),
    } as unknown as Response);

    const result = movieService.getMovie(603);
    await expect(result).rejects.toBeInstanceOf(ApiClientError);
    await expect(result).rejects.toMatchObject({ statusCode: 502, code: 'UPSTREAM_ERROR' });
  });
});
