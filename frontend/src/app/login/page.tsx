'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { loginValidationSchema, LoginFormData } from '@/schemas/auth.schema';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
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

    // Xóa field error khi người dùng bắt đầu sửa
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
    const validationResult = loginValidationSchema.safeParse({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });

    if (!validationResult.success) {
      const formattedErrors: { email?: string; password?: string } = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as 'email' | 'password';
        if (fieldName && !formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      }
      setFieldErrors(formattedErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });
      // Chuyển hướng sau khi đăng nhập thành công
      router.replace('/');
    } catch (err) {
      const friendlyMessage = getAuthErrorMessage(
        err,
        'Đăng nhập không thành công. Vui lòng thử lại.'
      );
      setServerError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return (
      <main id="login-page" className="auth-page-wrapper">
        <div className="auth-card" style={{ display: 'flex', justifyContent: 'center', padding: '3rem 2rem' }}>
          <div className="skeleton-pulse" style={{ width: '100%', height: '240px', borderRadius: '12px' }} />
        </div>
      </main>
    );
  }

  return (
    <main id="login-page" className="auth-page-wrapper">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">Đăng nhập</h1>
          <p className="auth-subtitle">Chào mừng bạn quay lại với CineSense</p>
        </header>

        {serverError && (
          <div
            id="login-server-error"
            className="auth-alert-error"
            role="alert"
            aria-live="polite"
          >
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        <form id="login-form" className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Địa chỉ Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ten@vidu.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="login-email-error" className="field-error-text">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Mật khẩu
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            {fieldErrors.password && (
              <span id="login-password-error" className="field-error-text">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <footer className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link href="/signup" id="login-to-signup-link" className="auth-link">
            Đăng ký ngay
          </Link>
        </footer>
      </div>
    </main>
  );
}
