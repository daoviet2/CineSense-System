import express, { Application, Request, Response, NextFunction } from 'express';
import { errorHandler, AppError } from './middlewares/errorHandler.js';

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // 404 handler for unknown routes
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Resource not found', 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
