'use client';

import { useQuery } from '@tanstack/react-query';
import { MOVIE_DETAIL_STALE_TIME_MS } from '@/config/movie';
import { movieQueryKeys } from '@/hooks/movieQueryKeys';
import { ApiClientError } from '@/services/apiClient';
import { movieService } from '@/services/movieService';

export function useMovie(tmdbId: number) {
  return useQuery({
    queryKey: movieQueryKeys.detail(tmdbId),
    queryFn: () => movieService.getMovie(tmdbId),
    enabled: Number.isSafeInteger(tmdbId) && tmdbId > 0,
    staleTime: MOVIE_DETAIL_STALE_TIME_MS,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
