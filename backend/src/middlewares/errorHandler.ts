import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.issues,
      },
    });
    return;
  }

  const isSyntaxOrParseError =
    err instanceof SyntaxError ||
    (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'SyntaxError');
  const isBodyParser400 =
    typeof err === 'object' &&
    err !== null &&
    (('status' in err && (err as { status?: unknown }).status === 400) ||
      ('statusCode' in err && (err as { statusCode?: unknown }).statusCode === 400) ||
      ('type' in err && (err as { type?: unknown }).type === 'entity.parse.failed'));

  if (isSyntaxOrParseError && isBodyParser400) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON payload',
      },
    });
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
}
