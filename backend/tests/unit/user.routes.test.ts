/**
 * feat-016: User routes HTTP tests
 *
 * Tests the full HTTP layer: auth middleware → controller → response mapping.
 * UserService is fully mocked so no real DB or JWT signing needed.
 */
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { signAccessToken } from '../../src/utils/jwt.js';
import { AppError, errorHandler } from '../../src/middlewares/errorHandler.js';
import { UserController } from '../../src/modules/user/user.controller.js';
import { createUserRouter } from '../../src/modules/user/user.routes.js';
import { UserService } from '../../src/modules/user/user.service.js';
import { UserPublicDto } from '../../src/modules/user/user.types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const publicUser: UserPublicDto = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** Build app with mocked service, real requireAuth middleware, and error handler */
function buildApp(mockService: jest.Mocked<UserService>): express.Application {
  const controller = new UserController(mockService);
  const router = createUserRouter({ controller });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/users', router);
  app.use(errorHandler);
  return app;
}

function makeMockService(): jest.Mocked<UserService> {
  return {
    getMe: jest.fn(),
    updateMe: jest.fn(),
  } as unknown as jest.Mocked<UserService>;
}

/** A valid JWT access token for user-1 (uses real signAccessToken with test env) */
function validCookie(): string {
  const token = signAccessToken('user-1');
  return `access_token=${token}`;
}

// ---------------------------------------------------------------------------
// GET /users/me
// ---------------------------------------------------------------------------

describe('GET /users/me', () => {
  let service: jest.Mocked<UserService>;
  let app: express.Application;

  beforeEach(() => {
    service = makeMockService();
    app = buildApp(service);
  });

  it('returns 401 UNAUTHORIZED when no cookie is present', async () => {
    const res = await request(app).get('/users/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(service.getMe).not.toHaveBeenCalled();
  });

  it('returns 200 with public user DTO when authenticated', async () => {
    service.getMe.mockResolvedValue(publicUser);

    const res = await request(app)
      .get('/users/me')
      .set('Cookie', validCookie());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        avatarUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    // D9: must never return passwordHash
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns 404 when service throws USER_NOT_FOUND', async () => {
    service.getMe.mockRejectedValue(
      new AppError('User not found', 404, 'USER_NOT_FOUND')
    );

    const res = await request(app)
      .get('/users/me')
      .set('Cookie', validCookie());

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /users/me
// ---------------------------------------------------------------------------

describe('PATCH /users/me', () => {
  let service: jest.Mocked<UserService>;
  let app: express.Application;

  beforeEach(() => {
    service = makeMockService();
    app = buildApp(service);
  });

  it('returns 401 UNAUTHORIZED when no cookie is present', async () => {
    const res = await request(app).patch('/users/me').send({ name: 'New Name' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 and updated user DTO on valid name update', async () => {
    const updated: UserPublicDto = { ...publicUser, name: 'Alice Updated' };
    service.updateMe.mockResolvedValue(updated);

    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ name: 'Alice Updated' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Alice Updated');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('normalizes email (trim + lowercase) before passing to service', async () => {
    service.updateMe.mockResolvedValue(publicUser);

    await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ email: '  ALICE@EXAMPLE.COM  ' });

    expect(service.updateMe).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ email: 'alice@example.com' })
    );
  });

  it('returns 400 VALIDATION_ERROR when body is empty (no fields provided)', async () => {
    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(service.updateMe).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR for invalid email', async () => {
    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when avatarUrl uses non-http/https scheme', async () => {
    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ avatarUrl: 'ftp://example.com/avatar.jpg' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 when avatarUrl is null (clears avatar, D6)', async () => {
    const cleared: UserPublicDto = { ...publicUser, avatarUrl: null };
    service.updateMe.mockResolvedValue(cleared);

    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ avatarUrl: null });

    expect(res.status).toBe(200);
    expect(res.body.user.avatarUrl).toBeNull();
  });

  it('returns 409 EMAIL_ALREADY_EXISTS when service throws it', async () => {
    service.updateMe.mockRejectedValue(
      new AppError('Email is already in use', 409, 'EMAIL_ALREADY_EXISTS')
    );

    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns 400 VALIDATION_ERROR when avatarUrl exceeds 2048 characters', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2040);

    const res = await request(app)
      .patch('/users/me')
      .set('Cookie', validCookie())
      .send({ avatarUrl: longUrl });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
