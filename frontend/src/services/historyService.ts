import { request } from '@/services/apiClient';
import type { HistoryEntry, PagedResult } from '@/types/activity';

export const historyService = {
  list(page = 1): Promise<PagedResult<HistoryEntry>> {
    return request<PagedResult<HistoryEntry>>(`/history?page=${page}`);
  },

  async record(tmdbId: number): Promise<HistoryEntry> {
    const response = await request<{ entry: HistoryEntry }>('/history', {
      method: 'POST',
      body: JSON.stringify({ tmdbId }),
    });
    return response.entry;
  },

  remove(entryId: string): Promise<void> {
    return request<void>(`/history/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
  },

  clear(): Promise<void> {
    return request<void>('/history', { method: 'DELETE' });
  },
};
