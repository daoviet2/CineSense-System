'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const { user, status, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header id="navbar" className="navbar-container">
      <Link href="/" id="nav-brand" className="navbar-brand">
        <span className="brand-badge">C</span>
        <span className="brand-text">
          Cine<span className="brand-highlight">Sense</span>
        </span>
      </Link>

      <nav className="navbar-actions" aria-label="Main navigation">
        {status === 'loading' ? (
          <div
            id="nav-loading-skeleton"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <div
              className="skeleton-pulse"
              style={{ width: '80px', height: '36px' }}
            />
            <div
              className="skeleton-pulse"
              style={{ width: '90px', height: '36px' }}
            />
          </div>
        ) : status === 'authenticated' && user ? (
          <div className="user-profile-menu" id="nav-user-menu">
            <Link
              href="/profile"
              id="nav-profile-link"
              className="user-link"
              title="Trang cá nhân"
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  id="nav-user-avatar"
                  className="user-avatar"
                />
              ) : (
                <div
                  id="nav-user-avatar-placeholder"
                  className="user-avatar-placeholder"
                >
                  {getInitials(user.name)}
                </div>
              )}
              <span id="nav-user-name" className="user-name">
                {user.name}
              </span>
            </Link>

            <button
              id="nav-logout-btn"
              type="button"
              className="btn btn-danger-outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
            </button>
          </div>
        ) : (
          <div
            id="nav-guest-actions"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <Link href="/login" id="nav-login-btn" className="btn btn-ghost">
              Đăng nhập
            </Link>
            <Link href="/signup" id="nav-register-btn" className="btn btn-primary">
              Đăng ký
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
