'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { activityQueryKeys } from '@/hooks/activityQueryKeys';
import { applyOptimisticWatchlist, rollbackWatchlist } from '@/lib/watchlistOptimistic';
import { watchlistService } from '@/services/watchlistService';

export function useWatchlistList(page: number) {
  return useQuery({
    queryKey: activityQueryKeys.watchlist.list(page),
    queryFn: () => watchlistService.list(page),
    placeholderData: keepPreviousData,
  });
}

export function useWatchlistStatus(tmdbId: number, enabled = true) {
  return useQuery({
    queryKey: activityQueryKeys.watchlist.status(tmdbId),
    queryFn: () => watchlistService.getStatus(tmdbId),
    enabled: enabled && Number.isInteger(tmdbId) && tmdbId > 0,
  });
}

export function useToggleWatchlist(tmdbId: number) {
  const queryClient = useQueryClient();
  const statusKey = activityQueryKeys.watchlist.status(tmdbId);
  const listsKey = activityQueryKeys.watchlist.lists();

  return useMutation({
    // saved is the desired state, not the previous state.
    mutationFn: async (saved: boolean): Promise<void> => {
      if (saved) {
        await watchlistService.add(tmdbId);
      } else {
        await watchlistService.remove(tmdbId);
      }
    },
    onMutate: async (saved) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: statusKey }),
        queryClient.cancelQueries({ queryKey: listsKey }),
      ]);
      return applyOptimisticWatchlist(queryClient, tmdbId, saved);
    },
    onError: (_error, _saved, context) => {
      if (!context) return;
      rollbackWatchlist(queryClient, tmdbId, context);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: statusKey }),
        queryClient.invalidateQueries({ queryKey: listsKey }),
      ]);
    },
  });
}
