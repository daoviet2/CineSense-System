'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const { user, status, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll-shadow elevation
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <header
      id="navbar"
      className={`navbar-container${scrolled ? ' scrolled' : ''}`}
    >
      <Link href="/" id="nav-brand" className="navbar-brand">
        <span className="brand-badge" aria-hidden="true">C</span>
        <span className="brand-text">
          Cine<span className="brand-highlight">Sense</span>
        </span>
      </Link>

      <nav className="navbar-actions" aria-label="Main navigation">
        {status === 'loading' ? (
          <div
            id="nav-loading-skeleton"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
            aria-label="Đang tải thông tin người dùng"
            aria-busy="true"
          >
            <div className="skeleton-pulse" style={{ width: '80px', height: '36px', borderRadius: '10px' }} />
            <div className="skeleton-pulse" style={{ width: '90px', height: '36px', borderRadius: '10px' }} />
          </div>
        ) : status === 'authenticated' && user ? (
          <div className="user-profile-menu" id="nav-user-menu">
            <Link href="/history" className="activity-nav-link">
              Lịch sử
            </Link>
            <Link href="/watchlist" className="activity-nav-link">
              Watchlist
            </Link>
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
                  alt={`Ảnh đại diện của ${user.name}`}
                  id="nav-user-avatar"
                  className="user-avatar"
                />
              ) : (
                <div
                  id="nav-user-avatar-placeholder"
                  className="user-avatar-placeholder"
                  aria-hidden="true"
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
              aria-label={isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất khỏi tài khoản'}
            >
              {isLoggingOut ? (
                <>
                  <span className="btn-spinner btn-spinner-light" aria-hidden="true" />
                  Đang thoát...
                </>
              ) : (
                'Đăng xuất'
              )}
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
