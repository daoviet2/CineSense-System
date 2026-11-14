export const activityQueryKeys = {
  history: {
    all: ['activity', 'history'] as const,
    lists: () => [...activityQueryKeys.history.all, 'list'] as const,
    list: (page: number) => [...activityQueryKeys.history.lists(), page] as const,
  },
  watchlist: {
    all: ['activity', 'watchlist'] as const,
    lists: () => [...activityQueryKeys.watchlist.all, 'list'] as const,
    list: (page: number) => [...activityQueryKeys.watchlist.lists(), page] as const,
    statuses: () => [...activityQueryKeys.watchlist.all, 'status'] as const,
    status: (tmdbId: number) => [...activityQueryKeys.watchlist.statuses(), tmdbId] as const,
  },
};
