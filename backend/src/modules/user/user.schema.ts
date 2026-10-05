import { z } from 'zod';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_BYTES } from '../../config/security.js';

// Maximum URL length — same as avatar_url column constraint (D6)
const MAX_AVATAR_URL_LENGTH = 2048;

/**
 * Zod schema for PATCH /users/me (Decision D4, D6).
 *
 * Rules:
 *  - At least one field must be provided (enforced by .refine).
 *  - name: 1–100 chars (trimmed).
 *  - email: trimmed + lowercased; must be a valid email address.
 *  - avatarUrl: http or https URL, max 2048 chars, OR null to clear (D6).
 *    If avatarUrl is undefined, it is not updated.
 *  - Changing password is OUT of scope for Phase 1 (D6 comment).
 */
export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name must be at least 1 character')
      .max(100, 'Name must be at most 100 characters')
      .optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Must be a valid email address')
      .optional(),

    avatarUrl: z
      .string()
      .url('avatarUrl must be a valid http or https URL')
      .max(MAX_AVATAR_URL_LENGTH, `avatarUrl must be at most ${MAX_AVATAR_URL_LENGTH} characters`)
      .refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        'avatarUrl must use http or https scheme'
      )
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.avatarUrl !== undefined,
    {
      message: 'At least one field (name, email, or avatarUrl) must be provided',
      path: ['_body'],
    }
  );

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Re-export password length constants so controller can reference them if needed
export { MIN_PASSWORD_LENGTH, MAX_PASSWORD_BYTES };
