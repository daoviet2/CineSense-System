import { AppError } from '../../src/middlewares/errorHandler.js';
import { AuthService, IHasher, ITokenSigner } from '../../src/modules/auth/auth.service.js';
import { IUserRepository } from '../../src/modules/user/user.repository.js';
import { UserPublicDto, UserRecord } from '../../src/modules/user/user.types.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const createdUser: UserPublicDto = {
  id: 'user-uuid-1234',
  name: 'Alice Wonder',
  email: 'alice@example.com',
  avatarUrl: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
};

const existingUserRecord: UserRecord = {
  ...createdUser,
  passwordHash: '$2b$12$existinghash',
};

// ---------------------------------------------------------------------------
// AuthService.register
// ---------------------------------------------------------------------------

describe('AuthService.register unit tests', () => {
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockHasher: jest.Mocked<IHasher>;
  let mockTokenSigner: jest.Mocked<ITokenSigner>;
  let authService: AuthService;

  const validRegisterInput = {
    name: 'Alice Wonder',
    email: 'alice@example.com',
    password: 'password123',
  };

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
    };

    mockHasher = {
      hashPassword: jest.fn().mockResolvedValue('$2b$12$mockedhashedpassword1234567890'),
      verifyPassword: jest.fn(),
    };

    mockTokenSigner = {
      signAccessToken: jest.fn().mockReturnValue('mocked.jwt.token'),
    };

    authService = new AuthService({
      userRepo: mockUserRepo,
      hasher: mockHasher,
      tokenSigner: mockTokenSigner,
    });
  });

  it('registers a new user successfully and returns public DTO and accessToken', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue(createdUser);

    const result = await authService.register(validRegisterInput);

    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('alice@example.com');
    expect(mockHasher.hashPassword).toHaveBeenCalledWith('password123');
    expect(mockUserRepo.create).toHaveBeenCalledWith({
      name: 'Alice Wonder',
      email: 'alice@example.com',
      passwordHash: '$2b$12$mockedhashedpassword1234567890',
    });
    expect(mockTokenSigner.signAccessToken).toHaveBeenCalledWith('user-uuid-1234');

    expect(result).toEqual({
      user: createdUser,
      accessToken: 'mocked.jwt.token',
    });
    expect((result.user as any).passwordHash).toBeUndefined();
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('throws AppError 409 EMAIL_ALREADY_EXISTS when email already exists (pre-check)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(existingUserRecord);

    await expect(authService.register(validRegisterInput)).rejects.toThrow(AppError);

    try {
      await authService.register(validRegisterInput);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(409);
      expect(appErr.code).toBe('EMAIL_ALREADY_EXISTS');
    }

    expect(mockHasher.hashPassword).not.toHaveBeenCalled();
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });

  it('catches Prisma P2002 unique constraint error and throws AppError 409 (race condition)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    const prismaP2002Error = new Error('Unique constraint failed on the fields: (`email`)') as any;
    prismaP2002Error.code = 'P2002';
    mockUserRepo.create.mockRejectedValue(prismaP2002Error);

    await expect(authService.register(validRegisterInput)).rejects.toThrow(AppError);

    try {
      await authService.register(validRegisterInput);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(409);
      expect(appErr.code).toBe('EMAIL_ALREADY_EXISTS');
    }
  });

  it('re-throws unexpected errors during user creation', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    const dbError = new Error('Database connection failed');
    mockUserRepo.create.mockRejectedValue(dbError);

    await expect(authService.register(validRegisterInput)).rejects.toThrow('Database connection failed');
  });
});

// ---------------------------------------------------------------------------
// AuthService.login
// ---------------------------------------------------------------------------

describe('AuthService.login unit tests', () => {
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockHasher: jest.Mocked<IHasher>;
  let mockTokenSigner: jest.Mocked<ITokenSigner>;
  let authService: AuthService;

  const validLoginInput = {
    email: 'alice@example.com',
    password: 'password123',
  };

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
    };

    mockHasher = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };

    mockTokenSigner = {
      signAccessToken: jest.fn().mockReturnValue('mocked.jwt.token'),
    };

    authService = new AuthService({
      userRepo: mockUserRepo,
      hasher: mockHasher,
      tokenSigner: mockTokenSigner,
    });
  });

  it('logs in successfully with correct credentials and returns public DTO + accessToken', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(existingUserRecord);
    mockHasher.verifyPassword.mockResolvedValue(true);

    const result = await authService.login(validLoginInput);

    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('alice@example.com');
    expect(mockHasher.verifyPassword).toHaveBeenCalledWith('password123', existingUserRecord.passwordHash);
    expect(mockTokenSigner.signAccessToken).toHaveBeenCalledWith('user-uuid-1234');

    expect(result.user).toEqual(createdUser);
    expect(result.accessToken).toBe('mocked.jwt.token');
    // D9: passwordHash must never appear in the result
    expect((result.user as any).passwordHash).toBeUndefined();
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('throws AppError 401 INVALID_CREDENTIALS when password is wrong', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(existingUserRecord);
    mockHasher.verifyPassword.mockResolvedValue(false);

    await expect(authService.login(validLoginInput)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });

    // verifyPassword must still be called (not short-circuited) to prevent timing attack
    expect(mockHasher.verifyPassword).toHaveBeenCalledTimes(1);
  });

  it('throws AppError 401 INVALID_CREDENTIALS when email does not exist — uses dummy hash (timing attack prevention)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    // verifyPassword will be called with DUMMY_HASH; mock it to return false
    mockHasher.verifyPassword.mockResolvedValue(false);

    await expect(authService.login(validLoginInput)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });

    // CRITICAL: verifyPassword must always be called even when user does not exist (D3)
    expect(mockHasher.verifyPassword).toHaveBeenCalledTimes(1);
    // The second argument should NOT be the real user hash (user doesn't exist)
    const [, hashArg] = mockHasher.verifyPassword.mock.calls[0];
    expect(hashArg).not.toBe(existingUserRecord.passwordHash);
  });

  it('returns the same error shape for wrong email and wrong password (anti-enumeration D3)', async () => {
    // Wrong email scenario
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockHasher.verifyPassword.mockResolvedValue(false);

    let wrongEmailError: AppError | undefined;
    try {
      await authService.login(validLoginInput);
    } catch (err) {
      wrongEmailError = err as AppError;
    }

    // Wrong password scenario
    mockUserRepo.findByEmail.mockResolvedValue(existingUserRecord);
    mockHasher.verifyPassword.mockResolvedValue(false);

    let wrongPasswordError: AppError | undefined;
    try {
      await authService.login(validLoginInput);
    } catch (err) {
      wrongPasswordError = err as AppError;
    }

    expect(wrongEmailError?.statusCode).toBe(wrongPasswordError?.statusCode);
    expect(wrongEmailError?.code).toBe(wrongPasswordError?.code);
    expect(wrongEmailError?.message).toBe(wrongPasswordError?.message);
  });

  it('re-throws unexpected database errors during login', async () => {
    mockUserRepo.findByEmail.mockRejectedValue(new Error('DB connection lost'));

    await expect(authService.login(validLoginInput)).rejects.toThrow('DB connection lost');
  });
});
