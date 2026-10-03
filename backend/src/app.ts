import cookieParser from 'cookie-parser';
import express, { Application, Request, Response, NextFunction } from 'express';
import { errorHandler, AppError } from './middlewares/errorHandler.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Auth routes (Decision D5)
  app.use('/auth', createAuthRouter());

  // 404 handler for unknown routes
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Resource not found', 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
