import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

/**
 * Calculates UTF-8 byte length safely in browser and node environments
 */
export function getUtf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(str, 'utf8');
  }
  // Fallback utf-8 byte calculation
  return encodeURI(str).split(/%..|./).length - 1;
}

export const loginValidationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email')
    .toLowerCase()
    .email('Định dạng email không hợp lệ'),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`)
    .refine(
      (val) => getUtf8ByteLength(val) <= MAX_PASSWORD_BYTES,
      `Mật khẩu không được vượt quá ${MAX_PASSWORD_BYTES} byte`
    ),
});

export type LoginFormData = z.infer<typeof loginValidationSchema>;

export const signupValidationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Họ và tên không được để trống')
      .max(100, 'Họ và tên không được vượt quá 100 ký tự'),
    email: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập email')
      .toLowerCase()
      .email('Định dạng email không hợp lệ'),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`)
      .refine(
        (val) => getUtf8ByteLength(val) <= MAX_PASSWORD_BYTES,
        `Mật khẩu không được vượt quá ${MAX_PASSWORD_BYTES} byte`
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupValidationSchema>;
