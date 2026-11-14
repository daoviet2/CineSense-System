import { ApiClientError } from '../src/services/apiClient';
import { historyService } from '../src/services/historyService';
import { watchlistService } from '../src/services/watchlistService';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('activity services', () => {
  it('uses shared client credentials and correct history paths/methods', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ items: [], page: 2, totalPages: 0, totalResults: 0 }))
      .mockResolvedValueOnce(response({ entry: { id: 'entry-1' } }, 201))
      .mockResolvedValueOnce(response(null, 204))
      .mockResolvedValueOnce(response(null, 204));

    expect((await historyService.list(2)).page).toBe(2);
    expect((await historyService.record(603)).id).toBe('entry-1');
    await historyService.remove('entry-1');
    await historyService.clear();

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://localhost:4001/history?page=2', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://localhost:4001/history', expect.objectContaining({ method: 'POST', credentials: 'include', body: '{"tmdbId":603}' }));
    expect(global.fetch).toHaveBeenNthCalledWith(3, 'http://localhost:4001/history/entry-1', expect.objectContaining({ method: 'DELETE', credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(4, 'http://localhost:4001/history', expect.objectContaining({ method: 'DELETE', credentials: 'include' }));
  });

  it('uses shared client credentials and correct watchlist paths/methods', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ items: [], page: 3, totalPages: 0, totalResults: 0 }))
      .mockResolvedValueOnce(response({ inWatchlist: false, addedAt: null }))
      .mockResolvedValueOnce(response({ item: { addedAt: '2026-11-14T00:00:00.000Z' } }, 201))
      .mockResolvedValueOnce(response(null, 204));

    expect((await watchlistService.list(3)).page).toBe(3);
    expect((await watchlistService.getStatus(603)).inWatchlist).toBe(false);
    expect((await watchlistService.add(603)).addedAt).toBe('2026-11-14T00:00:00.000Z');
    await watchlistService.remove(603);

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://localhost:4001/watchlist?page=3', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://localhost:4001/watchlist/603', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(3, 'http://localhost:4001/watchlist', expect.objectContaining({ method: 'POST', credentials: 'include', body: '{"tmdbId":603}' }));
    expect(global.fetch).toHaveBeenNthCalledWith(4, 'http://localhost:4001/watchlist/603', expect.objectContaining({ method: 'DELETE', credentials: 'include' }));
  });

  it('passes D3 errors through the shared API client', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ error: { code: 'TOO_MANY_REQUESTS', message: 'Slow down' } }, 429));
    await expect(watchlistService.add(603)).rejects.toMatchObject({
      name: 'ApiClientError', statusCode: 429, code: 'TOO_MANY_REQUESTS', message: 'Slow down',
    });
    await expect(historyService.record(603)).rejects.toBeInstanceOf(ApiClientError);
  });
});
