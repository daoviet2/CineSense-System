import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { AppError, errorHandler } from '../../src/middlewares/errorHandler.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { UserPublicDto } from '../../src/modules/user/user.types.js';

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const validUser: UserPublicDto = {
  id: 'user-uuid-999',
  name: 'John Doe',
  email: 'john@example.com',
  avatarUrl: null,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
};

function buildApp(mockAuthService: jest.Mocked<AuthService>): express.Application {
  const controller = new AuthController(mockAuthService);
  const router = createAuthRouter(controller);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', router);
  app.use(errorHandler);
  return app;
}

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe('POST /auth/register HTTP route tests', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let app: express.Application;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    app = buildApp(mockAuthService);
  });

  it('returns 201, sets httpOnly access_token cookie, and returns public user DTO', async () => {
    mockAuthService.register.mockResolvedValue({
      user: validUser,
      accessToken: 'jwt.token.abc',
    });

    const res = await request(app).post('/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: 'user-uuid-999',
        name: 'John Doe',
        email: 'john@example.com',
        avatarUrl: null,
        createdAt: '2026-10-01T12:00:00.000Z',
      },
    });

    // D9: never expose passwordHash
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();

    // D1: httpOnly cookie must be present
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieHeader).toContain('access_token=jwt.token.abc');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Path=/');
    expect(cookieHeader).toContain('SameSite=Lax');
  });

  it('normalizes email (trim and lowercase) before passing to service (Decision D2)', async () => {
    mockAuthService.register.mockResolvedValue({
      user: validUser,
      accessToken: 'jwt.token.abc',
    });

    await request(app).post('/auth/register').send({
      name: '  John Doe  ',
      email: '  JOHN.DOE@Example.COM  ',
      password: 'password123',
    });

    expect(mockAuthService.register).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    });
  });

  it('returns 409 EMAIL_ALREADY_EXISTS when email is already registered', async () => {
    mockAuthService.register.mockRejectedValue(
      new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS')
    );

    const res = await request(app).post('/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email is already registered',
      },
    });
  });

  it('returns 400 VALIDATION_ERROR when name is empty', async () => {
    const res = await request(app).post('/auth/register').send({
      name: '   ',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when email is invalid', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'John Doe',
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password is shorter than 8 characters', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password exceeds 72 bytes', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'a'.repeat(73),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login HTTP route tests', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let app: express.Application;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    app = buildApp(mockAuthService);
  });

  it('returns 200, sets httpOnly access_token cookie, and returns public user DTO on success', async () => {
    mockAuthService.login.mockResolvedValue({
      user: validUser,
      accessToken: 'jwt.login.token',
    });

    const res = await request(app).post('/auth/login').send({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-uuid-999');
    expect(res.body.user.passwordHash).toBeUndefined();

    // D1: httpOnly cookie must be set
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieHeader).toContain('access_token=jwt.login.token');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Lax');
  });

  it('normalizes email (trim + lowercase) before calling service', async () => {
    mockAuthService.login.mockResolvedValue({
      user: validUser,
      accessToken: 'jwt.login.token',
    });

    await request(app).post('/auth/login').send({
      email: '  JOHN@EXAMPLE.COM  ',
      password: 'password123',
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'password123',
    });
  });

  it('returns 401 INVALID_CREDENTIALS when service throws it (wrong email or wrong password)', async () => {
    mockAuthService.login.mockRejectedValue(
      new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    );

    const res = await request(app).post('/auth/login').send({
      email: 'john@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });

    // D1: no cookie should be set on failure
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('returns 400 VALIDATION_ERROR when email is missing', async () => {
    const res = await request(app).post('/auth/login').send({
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when password is too short', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'john@example.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout HTTP route tests', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let app: express.Application;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    app = buildApp(mockAuthService);
  });

  it('returns 204 and clears the access_token cookie', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', 'access_token=some.existing.token');

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    // D1: cookie must be cleared (Max-Age=0 or Expires in the past)
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieHeader).toContain('access_token=');
    // Cleared cookie has Max-Age=0 or Expires set to past
    const hasMaxAgeZero = cookieHeader.includes('Max-Age=0');
    const hasExpired = cookieHeader.includes('Expires=');
    expect(hasMaxAgeZero || hasExpired).toBe(true);
  });

  it('is idempotent — returns 204 even when no cookie is present', async () => {
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(204);
  });
});
