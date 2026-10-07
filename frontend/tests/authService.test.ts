import { authService, AuthApiError } from '../src/services/authService';

describe('authService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'usr_123',
    name: 'Alice',
    email: 'alice@example.com',
    avatarUrl: null,
    createdAt: '2026-10-07T00:00:00.000Z',
  };

  it('getMe: sends GET request with credentials include and returns user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: mockUser }),
    } as unknown as Response);

    const user = await authService.getMe();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/me'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      })
    );
    expect(user).toEqual(mockUser);
  });

  it('login: sends POST request with credentials include and returns user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: mockUser }),
    } as unknown as Response);

    const user = await authService.login({
      email: 'alice@example.com',
      password: 'Password123',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alice@example.com', password: 'Password123' }),
      })
    );
    expect(user).toEqual(mockUser);
  });

  it('register: sends POST request with credentials include and returns user', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user: mockUser }),
    } as unknown as Response);

    const user = await authService.register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password123',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          name: 'Alice',
          email: 'alice@example.com',
          password: 'Password123',
        }),
      })
    );
    expect(user).toEqual(mockUser);
  });

  it('logout: sends POST request with credentials include and handles 204 No Content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    } as unknown as Response);

    await expect(authService.logout()).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('throws AuthApiError with D3 error payload when backend returns 401', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không chính xác',
        },
      }),
    } as unknown as Response);

    await expect(
      authService.login({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toMatchObject({
      name: 'AuthApiError',
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email hoặc mật khẩu không chính xác',
    });
  });

  it('throws AuthApiError with 409 when email already exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email đã được đăng ký',
        },
      }),
    } as unknown as Response);

    await expect(
      authService.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password123',
      })
    ).rejects.toMatchObject({
      name: 'AuthApiError',
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Email đã được đăng ký',
    });
  });
});
