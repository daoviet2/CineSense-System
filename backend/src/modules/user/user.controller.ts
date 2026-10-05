import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middlewares/errorHandler.js';
import { updateUserSchema } from './user.schema.js';
import { createUserService, UserService } from './user.service.js';

/**
 * UserController — thin HTTP adapter (Decision D4).
 *
 * Responsibilities: parse request, validate (Zod), call service, map to HTTP response.
 * No business logic lives here.
 */
export class UserController {
  private readonly service: UserService;

  constructor(service: UserService) {
    this.service = service;
  }

  /**
   * GET /users/me
   * Returns the authenticated user's public profile DTO.
   * requireAuth middleware guarantees req.user.id is set.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // requireAuth guarantees req.user exists — assert for type safety
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      }

      const user = await this.service.getMe(userId);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /users/me
   * Partially updates name, email, and/or avatarUrl.
   * At least one field must be provided (enforced by Zod schema).
   */
  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      }

      // Validate and normalize at the boundary (D4)
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new AppError('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues)
        );
      }

      const user = await this.service.updateMe(userId, parsed.data);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  };
}

export function createUserController(service?: UserService): UserController {
  return new UserController(service ?? createUserService());
}
