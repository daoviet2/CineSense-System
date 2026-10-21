import {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  User,
} from '@/types/auth';
import { ApiClientError, request } from '@/services/apiClient';

export class AuthApiError extends ApiClientError {
  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(statusCode, code, message, details);
    this.name = 'AuthApiError';
  }
}

export const authService = {
  /**
   * Fetch current authenticated user via GET /users/me
   * Relies on httpOnly cookie access_token sent automatically
   */
  async getMe(): Promise<User> {
    const res = await request<AuthResponse>('/users/me', {
      method: 'GET',
    }, AuthApiError);
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
    }, AuthApiError);
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
    }, AuthApiError);
    return res.user;
  },

  /**
   * Log out user via POST /auth/logout
   * Backend clears the access_token httpOnly cookie
   */
  async logout(): Promise<void> {
    await request<void>('/auth/logout', {
      method: 'POST',
    }, AuthApiError);
  },

  /**
   * Update profile via PATCH /users/me
   */
  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const res = await request<AuthResponse>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }, AuthApiError);
    return res.user;
  },
};
