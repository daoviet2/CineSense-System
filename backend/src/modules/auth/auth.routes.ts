import { Router } from 'express';
import { AuthController, createAuthController } from './auth.controller.js';

export function createAuthRouter(controller: AuthController = createAuthController()): Router {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/logout', controller.logout);

  return router;
}
