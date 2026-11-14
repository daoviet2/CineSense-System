import { QueryClient } from '@tanstack/react-query';
import { activityQueryKeys } from '../src/hooks/activityQueryKeys';
import { applyOptimisticWatchlist, optimisticWatchlistStatus, removeMovieFromWatchlistPage, rollbackWatchlist } from '../src/lib/watchlistOptimistic';
import type { PagedResult, WatchlistItem } from '../src/types/activity';

const page: PagedResult<WatchlistItem> = {
  items: [
    { addedAt: '2026-11-14T00:00:00Z', movie: { tmdbId: 603, title: 'Matrix', posterUrl: null, releaseDate: null, averageRating: 8, genreIds: [28] } },
    { addedAt: '2026-11-14T00:00:00Z', movie: { tmdbId: 604, title: 'Other', posterUrl: null, releaseDate: null, averageRating: 7, genreIds: [18] } },
  ],
  page: 1,
  totalPages: 1,
  totalResults: 2,
};

describe('watchlist optimistic helpers', () => {
  it('computes optimistic status without mutating the previous status', () => {
    const previous = { inWatchlist: true, addedAt: '2026-11-14T00:00:00Z' };
    expect(optimisticWatchlistStatus(false, previous)).toEqual({ inWatchlist: false, addedAt: null });
    expect(optimisticWatchlistStatus(true)).toEqual({ inWatchlist: true, addedAt: null });
    expect(previous.inWatchlist).toBe(true);
  });

  it('removes only the matching movie from an optimistic list', () => {
    const updated = removeMovieFromWatchlistPage(page, 603);
    expect(updated?.items.map((item) => item.movie.tmdbId)).toEqual([604]);
    expect(updated?.totalResults).toBe(1);
    expect(page.items).toHaveLength(2);
    expect(removeMovieFromWatchlistPage(page, 999)).toBe(page);
  });

  it('restores status and paged lists after a failed remove', () => {
    const client = new QueryClient();
    const statusKey = activityQueryKeys.watchlist.status(603);
    const listKey = activityQueryKeys.watchlist.list(1);
    const previousStatus = { inWatchlist: true, addedAt: page.items[0].addedAt };
    client.setQueryData(statusKey, previousStatus);
    client.setQueryData(listKey, page);

    const snapshot = applyOptimisticWatchlist(client, 603, false);
    expect(client.getQueryData(statusKey)).toEqual({ inWatchlist: false, addedAt: null });
    expect((client.getQueryData(listKey) as typeof page).items).toHaveLength(1);
    rollbackWatchlist(client, 603, snapshot);

    expect(client.getQueryData(statusKey)).toEqual(previousStatus);
    expect(client.getQueryData(listKey)).toEqual(page);
    client.clear();
  });

  it('removes an optimistic status that had no previous cache on rollback', () => {
    const client = new QueryClient();
    const key = activityQueryKeys.watchlist.status(603);
    const snapshot = applyOptimisticWatchlist(client, 603, true);
    expect(client.getQueryData(key)).toEqual({ inWatchlist: true, addedAt: null });
    rollbackWatchlist(client, 603, snapshot);
    expect(client.getQueryData(key)).toBeUndefined();
    client.clear();
  });
});
