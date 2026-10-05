import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { createUserController, UserController } from './user.controller.js';

interface UserRouterDeps {
  controller?: UserController;
}

/**
 * Creates the /users router (Decision D5: plural, no /api prefix).
 *
 * All routes require authentication via requireAuth middleware.
 * The middleware is applied per-route (not router-level) for clarity
 * and to allow future public endpoints in the same module.
 */
export function createUserRouter({ controller = createUserController() }: UserRouterDeps = {}): Router {
  const router = Router();

  // GET /users/me — returns the authenticated user's public profile
  router.get('/me', requireAuth, controller.getMe);

  // PATCH /users/me — partially updates name, email, and/or avatarUrl
  router.patch('/me', requireAuth, controller.updateMe);

  return router;
}
