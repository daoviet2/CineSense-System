import { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  historyIdParamsSchema,
  historyListQuerySchema,
  recordHistoryBodySchema,
} from './history.schema.js';
import { IHistoryService } from './history.service.js';

export class HistoryController {
  constructor(private readonly historyService: IHistoryService) {}

  record: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tmdbId } = recordHistoryBodySchema.parse(req.body);
      const userId = req.user!.id;
      const result = await this.historyService.recordView(userId, tmdbId);
      const status = result.created ? 201 : 200;
      res.status(status).json({ entry: result.entry });
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page } = historyListQuerySchema.parse(req.query);
      const userId = req.user!.id;
      const result = await this.historyService.listHistory(userId, page);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  delete: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = historyIdParamsSchema.parse(req.params);
      const userId = req.user!.id;
      await this.historyService.deleteEntry(userId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  clear: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      await this.historyService.clearHistory(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export function createHistoryController(
  historyService: IHistoryService
): HistoryController {
  return new HistoryController(historyService);
}
