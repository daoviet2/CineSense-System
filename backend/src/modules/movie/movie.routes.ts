import { Router } from 'express';
import { MovieController } from './movie.controller.js';

export function createMovieRouter(controller: MovieController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:tmdbId', controller.getByTmdbId);
  return router;
}

export function createGenreRouter(controller: MovieController): Router {
  const router = Router();
  router.get('/', controller.listGenres);
  return router;
}
