'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signupValidationSchema, SignupFormData } from '@/schemas/auth.schema';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // D11: Chuyển hướng nếu người dùng đã đăng nhập
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Xóa field error khi người dùng sửa trường đó
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return; // Chặn submit đôi

    setServerError(null);
    setFieldErrors({});

    // Client-side validation theo chuẩn D2
    const validationResult = signupValidationSchema.safeParse({
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (!validationResult.success) {
      const formattedErrors: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
      } = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as
          | 'name'
          | 'email'
          | 'password'
          | 'confirmPassword';
        if (fieldName && !formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      }
      setFieldErrors(formattedErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: validationResult.data.name,
        email: validationResult.data.email,
        password: validationResult.data.password,
      });
      // Chuyển hướng sau khi đăng ký thành công
      router.replace('/');
    } catch (err) {
      const friendlyMessage = getAuthErrorMessage(
        err,
        'Đăng ký không thành công. Vui lòng thử lại.'
      );
      setServerError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return (
      <main id="signup-page" className="auth-page-wrapper">
        <div className="auth-card" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 2rem' }}>
          <div className="skeleton-pulse" style={{ width: '100%', height: '320px', borderRadius: '12px' }} />
        </div>
      </main>
    );
  }

  return (
    <main id="signup-page" className="auth-page-wrapper">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">Đăng ký tài khoản</h1>
          <p className="auth-subtitle">Trở thành thành viên của CineSense ngay hôm nay</p>
        </header>

        {serverError && (
          <div
            id="signup-server-error"
            className="auth-alert-error"
            role="alert"
            aria-live="polite"
          >
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        <form id="signup-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="signup-name" className="form-label">
              Họ và tên
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
            />
            {fieldErrors.name && (
              <span id="signup-name-error" className="field-error-text">
                {fieldErrors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-email" className="form-label">
              Địa chỉ Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ten@vidu.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="signup-email-error" className="field-error-text">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-password" className="form-label">
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
            />
            {fieldErrors.password && (
              <span id="signup-password-error" className="field-error-text">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm-password" className="form-label">
              Xác nhận mật khẩu
            </label>
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={
                fieldErrors.confirmPassword ? 'signup-confirm-password-error' : undefined
              }
            />
            {fieldErrors.confirmPassword && (
              <span id="signup-confirm-password-error" className="field-error-text">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              'Đăng ký tài khoản'
            )}
          </button>
        </form>

        <footer className="auth-footer">
          Đã có tài khoản?{' '}
          <Link href="/login" id="signup-to-login-link" className="auth-link">
            Đăng nhập
          </Link>
        </footer>
      </div>
    </main>
  );
}
