import { AppError } from '../../src/middlewares/errorHandler.js';
import { AuthService, IHasher, ITokenSigner } from '../../src/modules/auth/auth.service.js';
import { IUserRepository } from '../../src/modules/user/user.repository.js';
import { UserPublicDto, UserRecord } from '../../src/modules/user/user.types.js';

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

  const createdUser: UserPublicDto = {
    id: 'user-uuid-1234',
    name: 'Alice Wonder',
    email: 'alice@example.com',
    avatarUrl: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
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
    const existingUserRecord: UserRecord = {
      ...createdUser,
      passwordHash: '$2b$12$existinghash',
    };
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
