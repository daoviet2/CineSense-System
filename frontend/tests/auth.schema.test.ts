import {
  loginValidationSchema,
  signupValidationSchema,
  profileValidationSchema,
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

  describe('profileValidationSchema', () => {
    it('accepts valid profile update input with avatarUrl', () => {
      const result = profileValidationSchema.safeParse({
        name: 'Nguyen Van B',
        email: 'UserB@Example.com',
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('userb@example.com');
        expect(result.data.name).toBe('Nguyen Van B');
        expect(result.data.avatarUrl).toBe('https://example.com/avatar.png');
      }
    });

    it('accepts valid profile with empty/missing avatarUrl (clearing avatar)', () => {
      const resultEmpty = profileValidationSchema.safeParse({
        name: 'Nguyen Van C',
        email: 'c@example.com',
        avatarUrl: '',
      });
      expect(resultEmpty.success).toBe(true);

      const resultUndefined = profileValidationSchema.safeParse({
        name: 'Nguyen Van C',
        email: 'c@example.com',
      });
      expect(resultUndefined.success).toBe(true);
    });

    it('rejects empty name or name exceeding 100 characters', () => {
      const emptyResult = profileValidationSchema.safeParse({
        name: '   ',
        email: 'valid@example.com',
      });
      expect(emptyResult.success).toBe(false);

      const longResult = profileValidationSchema.safeParse({
        name: 'a'.repeat(101),
        email: 'valid@example.com',
      });
      expect(longResult.success).toBe(false);
    });

    it('rejects invalid email address', () => {
      const result = profileValidationSchema.safeParse({
        name: 'Valid Name',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-http/https or invalid avatarUrl', () => {
      const ftpResult = profileValidationSchema.safeParse({
        name: 'Valid Name',
        email: 'valid@example.com',
        avatarUrl: 'ftp://example.com/avatar.png',
      });
      expect(ftpResult.success).toBe(false);

      const malformedResult = profileValidationSchema.safeParse({
        name: 'Valid Name',
        email: 'valid@example.com',
        avatarUrl: 'not-a-valid-url',
      });
      expect(malformedResult.success).toBe(false);
    });

    it('rejects avatarUrl exceeding 2048 characters (D6 constraint)', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2040);
      const result = profileValidationSchema.safeParse({
        name: 'Valid Name',
        email: 'valid@example.com',
        avatarUrl: longUrl,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2048 ký tự');
      }
    });
  });
});
