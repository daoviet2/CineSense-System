/**
 * Express Request type augmentation.
 *
 * Adds `user` property populated by the `requireAuth` middleware (feat-014).
 * Only `id` is carried in the token payload (Decision D1: payload { sub: userId }).
 * Downstream handlers can access req.user.id without hitting the database.
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by requireAuth middleware when a valid access_token cookie is present.
       * Undefined on unauthenticated routes.
       */
      user?: {
        id: string;
      };
    }
  }
}

// This file must be a module for the augmentation to merge correctly.
export {};
