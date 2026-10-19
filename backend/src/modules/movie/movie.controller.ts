import { NextFunction, Request, RequestHandler, Response } from 'express';
import { movieListQuerySchema, movieTmdbIdParamsSchema } from './movie.schema.js';
import { IMovieService } from './movie.service.js';

export class MovieController {
  constructor(private readonly movieService: IMovieService) {}

  list: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = movieListQuerySchema.parse(req.query);
      const result = await this.movieService.listMovies(filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getByTmdbId: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tmdbId } = movieTmdbIdParamsSchema.parse(req.params);
      const result = await this.movieService.getMovieDetail(tmdbId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  listGenres: RequestHandler = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const genres = await this.movieService.listGenres();
      res.status(200).json({ items: genres });
    } catch (error) {
      next(error);
    }
  };
}

export function createMovieController(movieService: IMovieService): MovieController {
  return new MovieController(movieService);
}
