'use client';

import { useQuery } from '@tanstack/react-query';
import { GENRES_STALE_TIME_MS } from '@/config/movie';
import { movieQueryKeys } from '@/hooks/movieQueryKeys';
import { ApiClientError } from '@/services/apiClient';
import { movieService } from '@/services/movieService';

export function useGenres() {
  return useQuery({
    queryKey: movieQueryKeys.genres(),
    queryFn: movieService.getGenres,
    staleTime: GENRES_STALE_TIME_MS,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
