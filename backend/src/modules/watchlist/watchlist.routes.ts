import { RequestHandler, Router } from 'express';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { createActivityWriteRateLimiter } from '../../middlewares/rateLimiter.js';
import { createGenreRepository } from '../movie/genre.repository.js';
import { createMovieRepository } from '../movie/movie.repository.js';
import { createMovieResolver } from '../movie/movie.resolver.js';
import { createMovieService } from '../movie/movie.service.js';
import { createTmdbClient } from '../movie/tmdb.client.js';
import { createWatchlistController, WatchlistController } from './watchlist.controller.js';
import { createWatchlistRepository } from './watchlist.repository.js';
import { createWatchlistService } from './watchlist.service.js';

export interface WatchlistRouterDependencies {
  controller?: WatchlistController;
  writeRateLimiter?: RequestHandler;
}

function createDefaultController(): WatchlistController {
  const movieRepo = createMovieRepository();
  const movieService = createMovieService({
    tmdbClient: createTmdbClient({
      config: {
        apiKey: env.TMDB_API_KEY,
        baseUrl: env.TMDB_BASE_URL,
        language: env.TMDB_LANGUAGE,
        timeoutMs: env.TMDB_TIMEOUT_MS,
      },
    }),
    movieRepo,
    genreRepo: createGenreRepository(),
    imageBaseUrl: env.TMDB_IMAGE_BASE_URL,
    language: env.TMDB_LANGUAGE,
  });
  return createWatchlistController(
    createWatchlistService({
      watchlistRepo: createWatchlistRepository(),
      movieResolver: createMovieResolver({ movieService, movieRepo }),
    })
  );
}

export function createWatchlistRouter({
  controller,
  writeRateLimiter,
}: WatchlistRouterDependencies = {}): Router {
  const router = Router();
  const ctrl = controller ?? createDefaultController();
  router.use(requireAuth);
  router.post('/', writeRateLimiter ?? createActivityWriteRateLimiter(), ctrl.add);
  router.get('/', ctrl.list);
  router.get('/:tmdbId', ctrl.status);
  router.delete('/:tmdbId', ctrl.remove);
  return router;
}
