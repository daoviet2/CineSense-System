import { RequestHandler, Router } from 'express';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { createGenreRepository } from '../movie/genre.repository.js';
import { createMovieRepository } from '../movie/movie.repository.js';
import { createMovieResolver } from '../movie/movie.resolver.js';
import { createMovieService } from '../movie/movie.service.js';
import { createTmdbClient } from '../movie/tmdb.client.js';
import { createHistoryController, HistoryController } from './history.controller.js';
import { createHistoryRepository } from './history.repository.js';
import { createHistoryService } from './history.service.js';

export interface HistoryRouterDependencies {
  controller?: HistoryController;
  writeRateLimiter?: RequestHandler;
}

function createDefaultController(): HistoryController {
  const movieRepo = createMovieRepository();
  const genreRepo = createGenreRepository();
  const tmdbClient = createTmdbClient({
    config: {
      apiKey: env.TMDB_API_KEY,
      baseUrl: env.TMDB_BASE_URL,
      language: env.TMDB_LANGUAGE,
      timeoutMs: env.TMDB_TIMEOUT_MS,
    },
  });
  const movieService = createMovieService({
    tmdbClient,
    movieRepo,
    genreRepo,
    imageBaseUrl: env.TMDB_IMAGE_BASE_URL,
    language: env.TMDB_LANGUAGE,
  });
  const movieResolver = createMovieResolver({ movieService, movieRepo });
  const historyRepo = createHistoryRepository();
  const historyService = createHistoryService({ historyRepo, movieResolver });
  return createHistoryController(historyService);
}

/**
 * Factory for creating the /history router (Decision D26).
 *
 * Route specifications:
 * - POST /history: records a movie view (rate-limited via D34).
 * - GET /history: returns paged history entries (ordered watchedAt DESC).
 * - DELETE /history: clears all history entries for the authenticated user.
 * - DELETE /history/:id: deletes a single entry scoped to the user (Decision D30).
 *
 * All endpoints require valid JWT authentication via requireAuth middleware.
 */
export function createHistoryRouter({
  controller,
  writeRateLimiter,
}: HistoryRouterDependencies = {}): Router {
  const router = Router();
  const ctrl = controller ?? createDefaultController();

  router.use(requireAuth);

  if (writeRateLimiter) {
    router.post('/', writeRateLimiter, ctrl.record);
  } else {
    router.post('/', ctrl.record);
  }

  router.get('/', ctrl.list);
  router.delete('/', ctrl.clear);
  router.delete('/:id', ctrl.delete);

  return router;
}
