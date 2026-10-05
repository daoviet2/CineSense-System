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

/**
 * Input for PATCH /users/me — at least one field must be provided.
 * Validation enforced at the schema layer (user.schema.ts).
 * avatarUrl accepts null to clear the existing avatar (D6).
 */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}
