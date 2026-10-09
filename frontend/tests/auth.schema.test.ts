import {
  loginValidationSchema,
  signupValidationSchema,
  getUtf8ByteLength,
} from '../src/schemas/auth.schema';

describe('auth.schema', () => {
  describe('getUtf8ByteLength', () => {
    it('calculates ASCII byte length correctly', () => {
      expect(getUtf8ByteLength('password')).toBe(8);
    });

    it('calculates multi-byte UTF-8 characters correctly', () => {
      // 'mật khẩu' contains accents taking multi-bytes
      expect(getUtf8ByteLength('phim')).toBe(4);
      expect(getUtf8ByteLength('mật khẩu')).toBe(12);
    });
  });

  describe('loginValidationSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginValidationSchema.safeParse({
        email: 'User@Example.com',
        password: 'validPassword123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('rejects empty or invalid email', () => {
      const emptyResult = loginValidationSchema.safeParse({
        email: '',
        password: 'validPassword123',
      });
      expect(emptyResult.success).toBe(false);

      const invalidResult = loginValidationSchema.safeParse({
        email: 'invalid-email',
        password: 'validPassword123',
      });
      expect(invalidResult.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = loginValidationSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8 ký tự');
      }
    });

    it('rejects password exceeding 72 bytes (D2 bcrypt truncation boundary)', () => {
      const over72Bytes = 'a'.repeat(73);
      const result = loginValidationSchema.safeParse({
        email: 'user@example.com',
        password: over72Bytes,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('72 byte');
      }
    });
  });

  describe('signupValidationSchema', () => {
    it('accepts valid registration input', () => {
      const result = signupValidationSchema.safeParse({
        name: 'Nguyen Van A',
        email: 'nguyen@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name or name exceeding 100 characters', () => {
      const emptyName = signupValidationSchema.safeParse({
        name: '',
        email: 'nguyen@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(emptyName.success).toBe(false);

      const tooLongName = signupValidationSchema.safeParse({
        name: 'a'.repeat(101),
        email: 'nguyen@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(tooLongName.success).toBe(false);
    });

    it('rejects when confirmPassword does not match password', () => {
      const result = signupValidationSchema.safeParse({
        name: 'Nguyen Van A',
        email: 'nguyen@example.com',
        password: 'password123',
        confirmPassword: 'differentPassword',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmIssue = result.error.issues.find(
          (issue) => issue.path[0] === 'confirmPassword'
        );
        expect(confirmIssue).toBeDefined();
        expect(confirmIssue?.message).toContain('không trùng khớp');
      }
    });
  });
});
