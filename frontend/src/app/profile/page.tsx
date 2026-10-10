'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  profileValidationSchema,
  ProfileFormData,
} from '@/schemas/auth.schema';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function ProfilePage() {
  const router = useRouter();
  const { user, status, isLoading, updateProfile, logout } = useAuth();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    avatarUrl: '',
  });
  const [initialData, setInitialData] = useState<ProfileFormData>({
    name: '',
    email: '',
    avatarUrl: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  // Sync user data to form state when loaded
  useEffect(() => {
    if (user) {
      const data: ProfileFormData = {
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
      };
      setFormData(data);
      setInitialData(data);
      setImgLoadError(false);
    }
  }, [user]);

  // Route guard: redirect unauthenticated users to /login (D11)
  useEffect(() => {
    if (!isLoading && status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [isLoading, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'avatarUrl') {
      setImgLoadError(false);
    }

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (serverError) setServerError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleReset = useCallback(() => {
    setFormData(initialData);
    setFieldErrors({});
    setServerError(null);
    setSuccessMessage(null);
    setImgLoadError(false);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    setServerError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Client-side schema validation
    const result = profileValidationSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as string;
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    // Check if any change actually occurred
    const trimmedName = result.data.name.trim();
    const trimmedEmail = result.data.email.trim().toLowerCase();
    const trimmedAvatar = result.data.avatarUrl ? result.data.avatarUrl.trim() : null;

    const hasChanged =
      trimmedName !== initialData.name ||
      trimmedEmail !== initialData.email ||
      (trimmedAvatar || '') !== (initialData.avatarUrl || '');

    if (!hasChanged) {
      setSuccessMessage('Thông tin không có sự thay đổi.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        avatarUrl: trimmedAvatar || null,
      });

      setSuccessMessage('Cập nhật thông tin hồ sơ thành công!');
      setInitialData({
        name: trimmedName,
        email: trimmedEmail,
        avatarUrl: trimmedAvatar || '',
      });
    } catch (error) {
      const message = getAuthErrorMessage(
        error,
        'Không thể cập nhật hồ sơ. Vui lòng thử lại.'
      );
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-container">
          <div className="profile-card glass-panel">
            <div className="profile-skeleton-header skeleton-pulse" />
            <div className="profile-skeleton-body">
              <div className="skeleton-pulse" style={{ height: '48px', marginBottom: '1rem' }} />
              <div className="skeleton-pulse" style={{ height: '48px', marginBottom: '1rem' }} />
              <div className="skeleton-pulse" style={{ height: '48px', marginBottom: '1rem' }} />
              <div className="skeleton-pulse" style={{ height: '44px', width: '160px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const avatarDisplayUrl = formData.avatarUrl?.trim();
  const showCustomAvatar = avatarDisplayUrl && !imgLoadError;

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">
        {/* Header Title */}
        <div className="profile-page-header">
          <h1 className="profile-main-title">Hồ Sơ Cá Nhân</h1>
          <p className="profile-main-subtitle">
            Quản lý thông tin tài khoản và tùy chỉnh trải nghiệm xem phim của bạn
          </p>
        </div>

        <div className="profile-grid">
          {/* User Card Summary */}
          <div className="profile-sidebar-card glass-panel">
            <div className="avatar-wrapper">
              {showCustomAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarDisplayUrl}
                  alt={user.name}
                  className="profile-avatar-large"
                  onError={() => setImgLoadError(true)}
                />
              ) : (
                <div className="profile-avatar-large-placeholder">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <h2 className="profile-user-name">{user.name}</h2>
            <p className="profile-user-email">{user.email}</p>

            <div className="profile-badge-row">
              <span className="profile-role-badge">Cinephile Member</span>
            </div>

            {memberSince && (
              <div className="profile-meta-info">
                <span className="meta-label">Thành viên từ:</span>
                <span className="meta-value">{memberSince}</span>
              </div>
            )}

            <div className="profile-sidebar-actions">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn btn-danger-outline btn-full-width"
                id="profile-logout-btn"
              >
                {isLoggingOut ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Đang đăng xuất...</span>
                  </>
                ) : (
                  <span>Đăng xuất</span>
                )}
              </button>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="profile-main-card glass-panel">
            <div className="card-section-header">
              <h3 className="section-title">Chỉnh sửa thông tin</h3>
              <p className="section-subtitle">
                Cập nhật họ tên, địa chỉ email và ảnh đại diện của bạn
              </p>
            </div>

            {serverError && (
              <div className="auth-alert-error" role="alert">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {successMessage && (
              <div className="profile-alert-success" role="status">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="profile-form" noValidate>
              {/* Họ và tên */}
              <div className="form-group">
                <label htmlFor="profile-name" className="form-label">
                  Họ và tên <span className="text-required">*</span>
                </label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                  maxLength={100}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  required
                />
                {fieldErrors.name && (
                  <p id="name-error" className="field-error-text" role="alert">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="profile-email" className="form-label">
                  Địa chỉ Email <span className="text-required">*</span>
                </label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  required
                />
                {fieldErrors.email && (
                  <p id="email-error" className="field-error-text" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Avatar URL */}
              <div className="form-group">
                <label htmlFor="profile-avatarUrl" className="form-label">
                  Đường dẫn ảnh đại diện (Avatar URL)
                </label>
                <input
                  id="profile-avatarUrl"
                  name="avatarUrl"
                  type="url"
                  value={formData.avatarUrl || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  className={`form-input ${fieldErrors.avatarUrl ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                  maxLength={2048}
                  aria-invalid={Boolean(fieldErrors.avatarUrl)}
                  aria-describedby={fieldErrors.avatarUrl ? 'avatarUrl-error' : undefined}
                />
                <span className="field-helper-text">
                  Nhập URL ảnh trực tiếp (bắt đầu bằng http:// hoặc https://). Để trống nếu muốn xóa avatar.
                </span>
                {fieldErrors.avatarUrl && (
                  <p id="avatarUrl-error" className="field-error-text" role="alert">
                    {fieldErrors.avatarUrl}
                  </p>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="profile-form-actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  id="save-profile-btn"
                >
                  {isSubmitting ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="btn btn-ghost"
                  id="reset-profile-btn"
                >
                  Khôi phục
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
