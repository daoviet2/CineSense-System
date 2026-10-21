export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  user: User;
}
