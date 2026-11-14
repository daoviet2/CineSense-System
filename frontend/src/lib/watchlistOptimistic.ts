import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { activityQueryKeys } from '@/hooks/activityQueryKeys';
import type { PagedResult, WatchlistItem, WatchlistStatus } from '@/types/activity';

export interface WatchlistSnapshot {
  previousStatus?: WatchlistStatus;
  previousLists: Array<[QueryKey, PagedResult<WatchlistItem> | undefined]>;
}

export function optimisticWatchlistStatus(saved: boolean, previous?: WatchlistStatus): WatchlistStatus {
  return {
    inWatchlist: saved,
    addedAt: saved ? (previous?.addedAt ?? null) : null,
  };
}

export function removeMovieFromWatchlistPage(
  page: PagedResult<WatchlistItem> | undefined,
  tmdbId: number
): PagedResult<WatchlistItem> | undefined {
  if (!page) return undefined;
  const items = page.items.filter((item) => item.movie.tmdbId !== tmdbId);
  if (items.length === page.items.length) return page;
  return { ...page, items, totalResults: Math.max(0, page.totalResults - 1) };
}

export function applyOptimisticWatchlist(
  queryClient: QueryClient,
  tmdbId: number,
  saved: boolean
): WatchlistSnapshot {
  const statusKey = activityQueryKeys.watchlist.status(tmdbId);
  const listsKey = activityQueryKeys.watchlist.lists();
  const previousStatus = queryClient.getQueryData<WatchlistStatus>(statusKey);
  const previousLists = queryClient.getQueriesData<PagedResult<WatchlistItem>>({ queryKey: listsKey });

  queryClient.setQueryData(statusKey, optimisticWatchlistStatus(saved, previousStatus));
  if (!saved) {
    queryClient.setQueriesData<PagedResult<WatchlistItem>>(
      { queryKey: listsKey },
      (page) => removeMovieFromWatchlistPage(page, tmdbId)
    );
  }
  return { previousStatus, previousLists };
}

export function rollbackWatchlist(
  queryClient: QueryClient,
  tmdbId: number,
  snapshot: WatchlistSnapshot
): void {
  const statusKey = activityQueryKeys.watchlist.status(tmdbId);
  if (snapshot.previousStatus === undefined) {
    queryClient.removeQueries({ queryKey: statusKey, exact: true });
  } else {
    queryClient.setQueryData(statusKey, snapshot.previousStatus);
  }
  for (const [key, page] of snapshot.previousLists) {
    queryClient.setQueryData(key, page);
  }
}
