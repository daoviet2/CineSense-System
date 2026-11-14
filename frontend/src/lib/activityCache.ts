import type { QueryClient } from '@tanstack/react-query';
import { activityQueryKeys } from '@/hooks/activityQueryKeys';

export async function clearActivityQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: activityQueryKeys.history.all }),
    queryClient.cancelQueries({ queryKey: activityQueryKeys.watchlist.all }),
  ]);
  queryClient.removeQueries({ queryKey: activityQueryKeys.history.all });
  queryClient.removeQueries({ queryKey: activityQueryKeys.watchlist.all });
}
