import { NextFunction, Request, Response } from 'express';
import { setAccessTokenCookie } from '../../utils/cookie.js';
import { registerSchema } from './auth.schema.js';
import { AuthService, createAuthService } from './auth.service.js';

export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService = createAuthService()) {
    this.authService = authService;
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse & validate with Zod at boundary (Decision D4)
      const parsedBody = registerSchema.parse(req.body);

      const { user, accessToken } = await this.authService.register(parsedBody);

      // Set httpOnly access_token cookie (Decision D1)
      setAccessTokenCookie(res, accessToken);

      // Return public user DTO (Decision D9 - no passwordHash)
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  };
}

export function createAuthController(authService?: AuthService): AuthController {
  return new AuthController(authService);
}
