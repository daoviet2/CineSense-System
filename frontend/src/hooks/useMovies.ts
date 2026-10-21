'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MOVIE_LIST_STALE_TIME_MS } from '@/config/movie';
import { movieQueryKeys } from '@/hooks/movieQueryKeys';
import { ApiClientError } from '@/services/apiClient';
import { movieService } from '@/services/movieService';
import type { MovieQuery } from '@/types/movie';

export function useMovies(query: MovieQuery) {
  return useQuery({
    queryKey: movieQueryKeys.list(query),
    queryFn: () => movieService.getMovies(query),
    placeholderData: keepPreviousData,
    staleTime: MOVIE_LIST_STALE_TIME_MS,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
