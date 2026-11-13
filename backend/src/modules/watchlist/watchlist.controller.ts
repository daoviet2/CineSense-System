import { NextFunction, Request, RequestHandler, Response } from 'express';
import { IWatchlistService } from './watchlist.service.js';
import {
  addWatchlistBodySchema,
  watchlistListQuerySchema,
  watchlistTmdbIdParamsSchema,
} from './watchlist.schema.js';

export class WatchlistController {
  constructor(private readonly watchlistService: IWatchlistService) {}

  add: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tmdbId } = addWatchlistBodySchema.parse(req.body);
      const result = await this.watchlistService.add(req.user!.id, tmdbId);
      res.status(result.created ? 201 : 200).json({ item: result.item });
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page } = watchlistListQuerySchema.parse(req.query);
      res.status(200).json(await this.watchlistService.list(req.user!.id, page));
    } catch (error) {
      next(error);
    }
  };

  status: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tmdbId } = watchlistTmdbIdParamsSchema.parse(req.params);
      res.status(200).json(await this.watchlistService.getStatus(req.user!.id, tmdbId));
    } catch (error) {
      next(error);
    }
  };

  remove: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tmdbId } = watchlistTmdbIdParamsSchema.parse(req.params);
      await this.watchlistService.remove(req.user!.id, tmdbId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export function createWatchlistController(
  watchlistService: IWatchlistService
): WatchlistController {
  return new WatchlistController(watchlistService);
}
