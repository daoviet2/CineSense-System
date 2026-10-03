/**
 * Public User Data Transfer Object.
 * Strictly excludes passwordHash and sensitive internals (Decision D9).
 */
export interface UserPublicDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}

/**
 * Internal user record including password hash for authentication only.
 */
export interface UserRecord extends UserPublicDto {
  passwordHash: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
}
