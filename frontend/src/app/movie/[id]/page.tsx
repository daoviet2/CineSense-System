'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMovie } from '@/hooks/useMovie';
import { useAuth } from '@/hooks/useAuth';
import { useRecordHistory } from '@/hooks/useHistory';
import { WatchlistButton } from '@/components/WatchlistButton';
import { getMovieOverviewText, parseMovieId, shouldRecordMovieView } from '@/lib/movieDetail';
import { getMovieErrorMessage } from '@/lib/movieErrors';
import { extractReleaseYear, formatRating } from '@/lib/movieFormat';
import { ApiClientError } from '@/services/apiClient';

export default function MovieDetailPage() {
  const params = useParams();
  const tmdbId = parseMovieId(params.id);

  // If the route parameter is not a valid positive integer, trigger Next.js not-found
  if (tmdbId === null) {
    notFound();
  }

  const { data: movie, isLoading, error, refetch } = useMovie(tmdbId);
  const [hasImageError, setHasImageError] = useState(false);
  const { isAuthenticated } = useAuth();
  const recordHistory = useRecordHistory();
  const recordedTmdbId = useRef<number | null>(null);
  const record = recordHistory.mutate;

  useEffect(() => {
    if (!shouldRecordMovieView(isAuthenticated, tmdbId, movie?.tmdbId, recordedTmdbId.current)) return;
    recordedTmdbId.current = tmdbId;
    record(tmdbId);
  }, [isAuthenticated, tmdbId, movie?.tmdbId, record]);

  // If the backend/upstream returns 404 NOT_FOUND, render notFound page
  if (error instanceof ApiClientError && (error.code === 'NOT_FOUND' || error.statusCode === 404)) {
    notFound();
  }

  // 1. Trạng thái lỗi khác (Error state)
  if (error) {
    const errorMessage = getMovieErrorMessage(error);
    return (
      <main className="movie-detail-container">
        <div className="movie-detail-nav">
          <Link href="/" className="btn btn-ghost movie-back-btn">
            <span aria-hidden="true">←</span>
            <span>Quay lại danh sách</span>
          </Link>
        </div>

        <div className="movie-detail-error-wrapper">
          <div className="movie-error-card glass-panel" role="alert">
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
            <h2 className="movie-error-title">Không thể tải thông tin phim</h2>
            <p className="movie-error-message">{errorMessage}</p>
            <div className="movie-error-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => refetch()}
              >
                Thử lại
              </button>
              <Link href="/" className="btn btn-ghost">
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Trạng thái đang tải (Loading Skeleton state)
  if (isLoading || !movie) {
    return (
      <main className="movie-detail-container" aria-busy="true" aria-label="Đang tải thông tin phim">
        <div className="movie-detail-nav">
          <div className="skeleton-box movie-skeleton-back-btn" />
        </div>

        <div className="movie-detail-layout">
          <div className="movie-detail-poster-col">
            <div className="skeleton-box movie-detail-skeleton-poster" />
          </div>

          <div className="movie-detail-info-col">
            <div className="skeleton-box movie-detail-skeleton-title" />
            <div className="movie-detail-skeleton-meta-row">
              <div className="skeleton-box movie-detail-skeleton-pill" />
              <div className="skeleton-box movie-detail-skeleton-pill" />
            </div>
            <div className="movie-detail-skeleton-genres">
              <div className="skeleton-box genre-chip-skeleton" />
              <div className="skeleton-box genre-chip-skeleton" />
              <div className="skeleton-box genre-chip-skeleton" />
            </div>
            <div className="movie-detail-skeleton-overview">
              <div className="skeleton-box movie-detail-skeleton-line" />
              <div className="skeleton-box movie-detail-skeleton-line" />
              <div className="skeleton-box movie-detail-skeleton-line short" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. Trạng thái thành công: hiển thị chi tiết phim
  const ratingText = formatRating(movie.averageRating);
  const releaseYear = extractReleaseYear(movie.releaseDate);
  const hasRating = ratingText !== 'Chưa có đánh giá';
  const overviewText = getMovieOverviewText(movie.overview);
  const showPoster = Boolean(movie.posterUrl) && !hasImageError;

  return (
    <main className="movie-detail-container">
      {/* Navigation / Back Button */}
      <nav className="movie-detail-nav" aria-label="Điều hướng quay lại">
        <Link href="/" className="btn btn-ghost movie-back-btn">
          <span aria-hidden="true" className="back-arrow">←</span>
          <span>Quay lại danh sách</span>
        </Link>
      </nav>

      {/* Main Movie Detail Card */}
      <article className="movie-detail-card glass-panel" data-testid={`movie-detail-${movie.tmdbId}`}>
        <div className="movie-detail-layout">
          {/* Cột trái: Poster */}
          <div className="movie-detail-poster-col">
            <div className="movie-detail-poster-wrapper">
              {showPoster && movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt={`Poster phim ${movie.title}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="movie-detail-poster-img"
                  onError={() => setHasImageError(true)}
                />
              ) : (
                <div className="movie-poster-fallback detail-fallback" aria-hidden="true">
                  <svg
                    className="movie-fallback-icon"
                    viewBox="0 0 24 24"
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
                  <span className="movie-fallback-title">{movie.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Thông tin phim */}
          <div className="movie-detail-info-col">
            <header className="movie-detail-header">
              <h1 className="movie-detail-title">{movie.title}</h1>

              <div className="movie-detail-meta-row">
                <span className="movie-detail-year-badge">{releaseYear}</span>

                <div
                  className={`movie-rating-badge inline-rating ${
                    hasRating ? 'rating-has-score' : 'rating-no-score'
                  }`}
                  title={`Đánh giá: ${ratingText}`}
                >
                  {hasRating && <span className="rating-star-icon" aria-hidden="true">★</span>}
                  <span className="rating-value">{ratingText}</span>
                </div>
              </div>
            </header>

            <div className="movie-detail-actions">
              <WatchlistButton tmdbId={movie.tmdbId} />
            </div>

            {/* Danh sách thể loại */}
            {movie.genres && movie.genres.length > 0 && (
              <section className="movie-detail-section" aria-label="Thể loại">
                <h2 className="movie-detail-section-label">Thể loại</h2>
                <div className="movie-detail-genres-list">
                  {movie.genres.map((genre) => (
                    <Link
                      key={genre.id}
                      href={`/?genreId=${genre.id}`}
                      className="genre-chip movie-detail-genre-chip"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Tóm tắt nội dung */}
            <section className="movie-detail-section" aria-label="Tóm tắt nội dung">
              <h2 className="movie-detail-section-label">Nội dung phim</h2>
              <p className="movie-detail-overview">{overviewText}</p>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
