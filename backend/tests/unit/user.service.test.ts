/**
 * feat-016: UserService unit tests
 *
 * All DB calls are mocked via IUserRepository mock — no real DB needed.
 */
import { IUserRepository } from '../../src/modules/user/user.repository.js';
import { UserService } from '../../src/modules/user/user.service.js';
import { UserPublicDto, UserRecord } from '../../src/modules/user/user.types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const publicUser: UserPublicDto = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const userRecord: UserRecord = {
  ...publicUser,
  passwordHash: '$2b$12$hash',
};

function makeRepo(overrides: Partial<IUserRepository> = {}): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(publicUser),
    updateById: jest.fn().mockResolvedValue(publicUser),
    ...overrides,
  } as jest.Mocked<IUserRepository>;
}

// ---------------------------------------------------------------------------
// getMe
// ---------------------------------------------------------------------------

describe('UserService.getMe', () => {
  it('returns the public DTO for an existing user', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(publicUser) });
    const service = new UserService({ userRepo: repo });

    const result = await service.getMe('user-1');

    expect(result).toEqual(publicUser);
    expect(repo.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws 404 USER_NOT_FOUND when user does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new UserService({ userRepo: repo });

    await expect(service.getMe('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// updateMe
// ---------------------------------------------------------------------------

describe('UserService.updateMe', () => {
  it('updates name only and returns updated DTO', async () => {
    const updated: UserPublicDto = { ...publicUser, name: 'Alice Updated' };
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockResolvedValue(updated),
    });
    const service = new UserService({ userRepo: repo });

    const result = await service.updateMe('user-1', { name: 'Alice Updated' });

    expect(result.name).toBe('Alice Updated');
    expect(repo.updateById).toHaveBeenCalledWith('user-1', { name: 'Alice Updated' });
  });

  it('updates email when new email is not taken', async () => {
    const updated: UserPublicDto = { ...publicUser, email: 'new@example.com' };
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockResolvedValue(updated),
    });
    const service = new UserService({ userRepo: repo });

    const result = await service.updateMe('user-1', { email: 'new@example.com' });

    expect(result.email).toBe('new@example.com');
  });

  it('allows updating email to the same email the user already has (no-op change)', async () => {
    // findByEmail returns the same user — not a conflict
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(userRecord), // same userId
      updateById: jest.fn().mockResolvedValue(publicUser),
    });
    const service = new UserService({ userRepo: repo });

    // Should NOT throw — existing user has same id
    await expect(
      service.updateMe('user-1', { email: 'alice@example.com' })
    ).resolves.toEqual(publicUser);
  });

  it('throws 409 EMAIL_ALREADY_EXISTS when new email belongs to a different user (pre-check)', async () => {
    const otherUser: UserRecord = { ...userRecord, id: 'user-2', email: 'taken@example.com' };
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(otherUser),
    });
    const service = new UserService({ userRepo: repo });

    await expect(
      service.updateMe('user-1', { email: 'taken@example.com' })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
    // updateById must NOT have been called
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('throws 409 EMAIL_ALREADY_EXISTS on Prisma P2002 race condition', async () => {
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null), // pre-check passes
      updateById: jest.fn().mockRejectedValue({ code: 'P2002' }), // race condition
    });
    const service = new UserService({ userRepo: repo });

    await expect(
      service.updateMe('user-1', { email: 'raced@example.com' })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  it('sets avatarUrl to a valid URL', async () => {
    const updated: UserPublicDto = { ...publicUser, avatarUrl: 'https://example.com/avatar.jpg' };
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockResolvedValue(updated),
    });
    const service = new UserService({ userRepo: repo });

    const result = await service.updateMe('user-1', {
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
  });

  it('clears avatarUrl when null is passed', async () => {
    const updated: UserPublicDto = { ...publicUser, avatarUrl: null };
    const repo = makeRepo({
      updateById: jest.fn().mockResolvedValue(updated),
    });
    const service = new UserService({ userRepo: repo });

    const result = await service.updateMe('user-1', { avatarUrl: null });

    expect(result.avatarUrl).toBeNull();
    expect(repo.updateById).toHaveBeenCalledWith('user-1', { avatarUrl: null });
  });

  it('throws 404 USER_NOT_FOUND when updateById returns null (user deleted)', async () => {
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockResolvedValue(null),
    });
    const service = new UserService({ userRepo: repo });

    await expect(
      service.updateMe('deleted-user', { name: 'New Name' })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  it('re-throws unexpected DB errors', async () => {
    const dbError = new Error('Connection timeout');
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockRejectedValue(dbError),
    });
    const service = new UserService({ userRepo: repo });

    await expect(
      service.updateMe('user-1', { name: 'Fail' })
    ).rejects.toThrow('Connection timeout');
  });
});
