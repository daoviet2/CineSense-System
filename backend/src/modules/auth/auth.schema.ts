import { z } from 'zod';
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from '../../config/security.js';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format'),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(
      (val) => Buffer.byteLength(val, 'utf8') <= MAX_PASSWORD_BYTES,
      `Password must not exceed ${MAX_PASSWORD_BYTES} bytes`
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
