import { IMovieRepository } from './movie.repository.js';
import { IMovieService } from './movie.service.js';
import { IMovieResolver } from './movie.types.js';

export interface MovieResolverDependencies {
  movieService: Pick<IMovieService, 'getMovieDetail'>;
  movieRepo: Pick<IMovieRepository, 'findByTmdbId'>;
}

/**
 * Factory for creating an IMovieResolver instance.
 * Implements architectural decision D25:
 * - resolveForWrite: uses getMovieDetail to get-or-cache (miss -> TMDB -> DB), returning DB UUID.
 * - findCachedId: reads only from local DB cache via movieRepo, never invoking TMDB.
 */
export function createMovieResolver({
  movieService,
  movieRepo,
}: MovieResolverDependencies): IMovieResolver {
  return {
    async resolveForWrite(tmdbId: number): Promise<{ id: string }> {
      const detail = await movieService.getMovieDetail(tmdbId);
      return { id: detail.id };
    },

    async findCachedId(tmdbId: number): Promise<string | null> {
      const cached = await movieRepo.findByTmdbId(tmdbId);
      return cached ? cached.id : null;
    },
  };
}
