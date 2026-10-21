import type { MovieQuery } from '@/types/movie';

export const movieQueryKeys = {
  all: ['movies'] as const,
  lists: () => [...movieQueryKeys.all, 'list'] as const,
  list: (query: MovieQuery) => [...movieQueryKeys.lists(), query] as const,
  details: () => [...movieQueryKeys.all, 'detail'] as const,
  detail: (tmdbId: number) => [...movieQueryKeys.details(), tmdbId] as const,
  genres: () => ['genres'] as const,
};
