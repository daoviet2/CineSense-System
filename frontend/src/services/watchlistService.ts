import { request } from '@/services/apiClient';
import type { PagedResult, WatchlistItem, WatchlistStatus } from '@/types/activity';

export const watchlistService = {
  list(page = 1): Promise<PagedResult<WatchlistItem>> {
    return request<PagedResult<WatchlistItem>>(`/watchlist?page=${page}`);
  },

  getStatus(tmdbId: number): Promise<WatchlistStatus> {
    return request<WatchlistStatus>(`/watchlist/${tmdbId}`);
  },

  async add(tmdbId: number): Promise<WatchlistItem> {
    const response = await request<{ item: WatchlistItem }>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ tmdbId }),
    });
    return response.item;
  },

  remove(tmdbId: number): Promise<void> {
    return request<void>(`/watchlist/${tmdbId}`, { method: 'DELETE' });
  },
};
