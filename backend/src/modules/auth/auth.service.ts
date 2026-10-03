import { AppError } from '../../middlewares/errorHandler.js';
import { DUMMY_HASH } from '../../config/security.js';
import { hashPassword, verifyPassword } from '../../utils/hash.js';
import { signAccessToken } from '../../utils/jwt.js';
import { createUserRepository, IUserRepository } from '../user/user.repository.js';
import { UserPublicDto } from '../user/user.types.js';
import { LoginInput, RegisterInput } from './auth.schema.js';

export interface IHasher {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

export interface ITokenSigner {
  signAccessToken(userId: string): string;
}

export interface AuthServiceDeps {
  userRepo: IUserRepository;
  hasher: IHasher;
  tokenSigner: ITokenSigner;
}

export class AuthService {
  private readonly userRepo: IUserRepository;
  private readonly hasher: IHasher;
  private readonly tokenSigner: ITokenSigner;

  constructor(deps: AuthServiceDeps) {
    this.userRepo = deps.userRepo;
    this.hasher = deps.hasher;
    this.tokenSigner = deps.tokenSigner;
  }

  async register(input: RegisterInput): Promise<{ user: UserPublicDto; accessToken: string }> {
    // 1. Check if email already registered (pre-check)
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // 2. Hash password (bcrypt cost 12)
    const passwordHash = await this.hasher.hashPassword(input.password);

    // 3. Create user in database; catch Prisma P2002 for race conditions
    let user: UserPublicDto;
    try {
      user = await this.userRepo.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
    } catch (err: unknown) {
      const errorWithCode = err as { code?: string; message?: string };
      if (errorWithCode?.code === 'P2002' || errorWithCode?.message?.includes('P2002')) {
        throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
      }
      throw err;
    }

    // 4. Generate JWT access token with payload { sub: user.id }
    const accessToken = this.tokenSigner.signAccessToken(user.id);

    return { user, accessToken };
  }

  /**
   * Authenticates a user by email and password.
   *
   * Security requirements (Decision D3):
   * - Always runs bcrypt.compare, even when the user does not exist (dummy hash),
   *   so response time is indistinguishable between "wrong email" and "wrong password".
   * - Returns the same generic 401 message regardless of the failure reason,
   *   preventing user enumeration.
   */
  async login(input: LoginInput): Promise<{ user: UserPublicDto; accessToken: string }> {
    // 1. Look up user by normalized email
    const userRecord = await this.userRepo.findByEmail(input.email);

    // 2. Always run hash comparison to prevent timing attacks (Decision D3).
    //    Use a pre-computed DUMMY_HASH when the user is not found so that
    //    the bcrypt work factor is always applied.
    const hashToVerify = userRecord?.passwordHash ?? DUMMY_HASH;
    const passwordMatches = await this.hasher.verifyPassword(input.password, hashToVerify);

    // 3. Reject with uniform 401 — never reveal which condition failed (D3)
    if (!userRecord || !passwordMatches) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // 4. Build public DTO (D9 — never expose passwordHash)
    const user: UserPublicDto = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      avatarUrl: userRecord.avatarUrl,
      createdAt: userRecord.createdAt,
    };

    // 5. Sign and return access token
    const accessToken = this.tokenSigner.signAccessToken(user.id);

    return { user, accessToken };
  }
}

export function createAuthService(overrides?: Partial<AuthServiceDeps>): AuthService {
  return new AuthService({
    userRepo: overrides?.userRepo ?? createUserRepository(),
    hasher: overrides?.hasher ?? { hashPassword, verifyPassword },
    tokenSigner: overrides?.tokenSigner ?? { signAccessToken },
  });
}
