'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activityQueryKeys } from '@/hooks/activityQueryKeys';
import { historyService } from '@/services/historyService';

export function useHistoryList(page: number) {
  return useQuery({
    queryKey: activityQueryKeys.history.list(page),
    queryFn: () => historyService.list(page),
    placeholderData: keepPreviousData,
  });
}

export function useRecordHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tmdbId: number) => historyService.record(tmdbId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityQueryKeys.history.lists() }),
  });
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => historyService.remove(entryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityQueryKeys.history.lists() }),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => historyService.clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activityQueryKeys.history.lists() }),
  });
}
