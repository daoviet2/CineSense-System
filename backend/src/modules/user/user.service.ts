import { AppError } from '../../middlewares/errorHandler.js';
import { createUserRepository, IUserRepository } from './user.repository.js';
import { UpdateUserInput, UserPublicDto } from './user.types.js';

export interface UserServiceDeps {
  userRepo: IUserRepository;
}

/**
 * UserService — business logic for the /users resource (Decision D4).
 *
 * Responsibilities:
 *  - Retrieve the authenticated user's public profile.
 *  - Partially update name, email, and avatarUrl.
 *
 * Service does NOT depend on Express types — pure business logic (D4).
 */
export class UserService {
  private readonly userRepo: IUserRepository;

  constructor(deps: UserServiceDeps) {
    this.userRepo = deps.userRepo;
  }

  /**
   * Returns the public DTO for the authenticated user.
   * Throws 404 if the user no longer exists (edge case: deleted account).
   */
  async getMe(userId: string): Promise<UserPublicDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  /**
   * Partially updates the authenticated user's profile.
   *
   * Email uniqueness:
   *  - Pre-check: if the new email is already taken by a *different* user → 409.
   *  - Race condition: Prisma P2002 on update → 409 (same error code).
   *
   * avatarUrl:
   *  - undefined → not updated.
   *  - null      → clears the avatar.
   *  - string    → sets a new URL (http/https validated at schema layer).
   *
   * Decisions: D4, D6, D9.
   */
  async updateMe(userId: string, input: UpdateUserInput): Promise<UserPublicDto> {
    // Email uniqueness pre-check (chống race condition handled below via P2002)
    if (input.email !== undefined) {
      const existing = await this.userRepo.findByEmail(input.email);
      if (existing && existing.id !== userId) {
        throw new AppError('Email is already in use', 409, 'EMAIL_ALREADY_EXISTS');
      }
    }

    let updated: UserPublicDto | null;
    try {
      updated = await this.userRepo.updateById(userId, input);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      // P2002 = unique constraint violation (race condition on email)
      if (e?.code === 'P2002' || e?.message?.includes('P2002')) {
        throw new AppError('Email is already in use', 409, 'EMAIL_ALREADY_EXISTS');
      }
      throw err;
    }

    if (!updated) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return updated;
  }
}

export function createUserService(overrides?: Partial<UserServiceDeps>): UserService {
  return new UserService({
    userRepo: overrides?.userRepo ?? createUserRepository(),
  });
}
