import { RequestHandler, Router } from 'express';
import { AuthController, createAuthController } from './auth.controller.js';

interface AuthRouterDeps {
  controller?: AuthController;
  /** Rate limiter applied to POST /register (Decision D10) */
  registerRateLimiter?: RequestHandler;
  /** Rate limiter applied to POST /login (Decision D10) */
  loginRateLimiter?: RequestHandler;
}

export function createAuthRouter({
  controller = createAuthController(),
  registerRateLimiter,
  loginRateLimiter,
}: AuthRouterDeps = {}): Router {
  const router = Router();

  // Register: rate-limited to prevent account-creation spam (D10)
  const registerChain: RequestHandler[] = [];
  if (registerRateLimiter) registerChain.push(registerRateLimiter);
  registerChain.push(controller.register);
  router.post('/register', ...registerChain);

  // Login: rate-limited to prevent brute-force attacks (D10)
  const loginChain: RequestHandler[] = [];
  if (loginRateLimiter) loginChain.push(loginRateLimiter);
  loginChain.push(controller.login);
  router.post('/login', ...loginChain);

  // Logout: stateless, idempotent — no rate limit needed
  router.post('/logout', controller.logout);

  return router;
}
