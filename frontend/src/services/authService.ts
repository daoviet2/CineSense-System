import {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  User,
  ApiErrorResponse,
} from '@/types/auth';

export class AuthApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AuthApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
    // D1: Must include credentials for httpOnly cookie authentication
    credentials: 'include',
  };

  const response = await fetch(url, config);

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;
    const errorCode = errorData?.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
    const errorDetails = errorData?.error?.details;

    throw new AuthApiError(response.status, errorCode, errorMessage, errorDetails);
  }

  return data as T;
}

export const authService = {
  /**
   * Fetch current authenticated user via GET /users/me
   * Relies on httpOnly cookie access_token sent automatically
   */
  async getMe(): Promise<User> {
    const res = await request<AuthResponse>('/users/me', {
      method: 'GET',
    });
    return res.user;
  },

  /**
   * Log in user with email & password via POST /auth/login
   * Backend sets httpOnly cookie on success
   */
  async login(input: LoginInput): Promise<User> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.user;
  },

  /**
   * Register new user via POST /auth/register
   * Backend sets httpOnly cookie on success
   */
  async register(input: RegisterInput): Promise<User> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.user;
  },

  /**
   * Log out user via POST /auth/logout
   * Backend clears the access_token httpOnly cookie
   */
  async logout(): Promise<void> {
    await request<void>('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Update profile via PATCH /users/me
   */
  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const res = await request<AuthResponse>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.user;
  },
};
