import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { z, ZodError } from 'zod';
import { AppError, errorHandler } from '../../src/middlewares/errorHandler.js';

describe('AppError & errorHandler middleware', () => {
  it('instantiates AppError with correct defaults and properties', () => {
    const defaultErr = new AppError('Default error');
    expect(defaultErr.message).toBe('Default error');
    expect(defaultErr.statusCode).toBe(500);
    expect(defaultErr.code).toBe('INTERNAL_SERVER_ERROR');
    expect(defaultErr.details).toBeUndefined();

    const customErr = new AppError('Bad request', 400, 'BAD_REQUEST', { field: 'email' });
    expect(customErr.statusCode).toBe(400);
    expect(customErr.code).toBe('BAD_REQUEST');
    expect(customErr.details).toEqual({ field: 'email' });
  });

  it('formats AppError properly following Decision D3', async () => {
    const testApp = express();
    testApp.get('/test-app-error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError('Unauthorized access', 401, 'UNAUTHORIZED'));
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-app-error');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
      },
    });
  });

  it('formats ZodError properly as VALIDATION_ERROR with details', async () => {
    const testApp = express();
    testApp.get('/test-zod-error', (_req: Request, _res: Response, next: NextFunction) => {
      const schema = z.object({ id: z.number() });
      try {
        schema.parse({ id: 'not-a-number' });
      } catch (err) {
        return next(err as ZodError);
      }
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-zod-error');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('formats unknown errors as generic 500 INTERNAL_SERVER_ERROR', async () => {
    const testApp = express();
    testApp.get('/test-unknown-error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('Unexpected database failure'));
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/test-unknown-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  });
});
