'use client';

import React from 'react';
import { MovieCard } from '@/components/MovieCard';
import { getMovieErrorMessage } from '@/lib/movieErrors';
import type { MovieSummary } from '@/types/movie';

export interface MovieGridProps {
  movies?: MovieSummary[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  skeletonCount?: number;
}

export function MovieGrid({
  movies = [],
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage = 'Không tìm thấy bộ phim nào phù hợp.',
  skeletonCount = 20,
}: MovieGridProps) {
  // Trạng thái lỗi (Error state)
  if (error) {
    const message = getMovieErrorMessage(error);
    return (
      <div className="movie-grid-status-container" role="alert" data-testid="movie-grid-error">
        <div className="movie-error-card glass-panel">
          <div className="movie-error-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="movie-error-title">Đã xảy ra lỗi</h3>
          <p className="movie-error-message">{message}</p>
          {onRetry && (
            <button
              type="button"
              className="btn btn-primary movie-retry-btn"
              onClick={onRetry}
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  // Trạng thái tải dữ liệu (Loading / Skeleton state)
  if (isLoading) {
    const count = Math.max(1, skeletonCount);
    return (
      <div className="movie-grid" aria-busy="true" aria-label="Đang tải danh sách phim" data-testid="movie-grid-loading">
        {Array.from({ length: count }).map((_, index) => (
          <div key={`skeleton-${index}`} className="movie-skeleton-card glass-panel" aria-hidden="true">
            <div className="skeleton-box movie-skeleton-poster" />
            <div className="movie-skeleton-content">
              <div className="skeleton-box movie-skeleton-title" />
              <div className="skeleton-box movie-skeleton-meta" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Trạng thái rỗng (Empty state)
  if (!movies || movies.length === 0) {
    return (
      <div className="movie-grid-status-container" data-testid="movie-grid-empty">
        <div className="movie-empty-card glass-panel">
          <div className="movie-empty-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="54"
              height="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <h3 className="movie-empty-title">{emptyMessage}</h3>
          <p className="movie-empty-subtitle">
            Hãy thử tìm kiếm với từ khóa khác hoặc duyệt danh mục thể loại khác.
          </p>
        </div>
      </div>
    );
  }

  // Trạng thái thành công: hiển thị danh sách phim
  return (
    <div className="movie-grid" data-testid="movie-grid-list">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdbId} movie={movie} />
      ))}
    </div>
  );
}
