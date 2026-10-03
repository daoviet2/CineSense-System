import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { errorHandler, AppError } from '../../src/middlewares/errorHandler.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { UserPublicDto } from '../../src/modules/user/user.types.js';

describe('POST /auth/register HTTP route tests', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let app: express.Application;

  const validUser: UserPublicDto = {
    id: 'user-uuid-999',
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
  };

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const controller = new AuthController(mockAuthService);
    const router = createAuthRouter(controller);

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', router);
    app.use(errorHandler);
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

    // Ensure password_hash is never exposed (Decision D9)
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();

    // Verify Set-Cookie header contains access_token and HttpOnly (Decision D1)
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
