'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { extractReleaseYear, formatRating } from '@/lib/movieFormat';
import type { MovieSummary } from '@/types/movie';

export interface MovieCardProps {
  movie: MovieSummary;
}

export function MovieCard({ movie }: MovieCardProps) {
  const [hasImageError, setHasImageError] = useState(false);

  const ratingText = formatRating(movie.averageRating);
  const releaseYear = extractReleaseYear(movie.releaseDate);
  const hasRating = ratingText !== 'Chưa có đánh giá';
  const showPoster = Boolean(movie.posterUrl) && !hasImageError;

  return (
    <article className="movie-card glass-panel" data-testid={`movie-card-${movie.tmdbId}`}>
      <Link
        href={`/movie/${movie.tmdbId}`}
        className="movie-card-link"
        aria-label={`${movie.title} (${releaseYear})`}
      >
        <div className="movie-poster-wrapper">
          {showPoster && movie.posterUrl ? (
            <Image
              src={movie.posterUrl}
              alt={`Poster phim ${movie.title}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="movie-poster-img"
              onError={() => setHasImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="movie-poster-fallback" aria-hidden="true">
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

          <div
            className={`movie-rating-badge ${hasRating ? 'rating-has-score' : 'rating-no-score'}`}
            title={`Đánh giá: ${ratingText}`}
          >
            {hasRating && <span className="rating-star-icon" aria-hidden="true">★</span>}
            <span className="rating-value">{ratingText}</span>
          </div>
        </div>

        <div className="movie-card-content">
          <h3 className="movie-card-title" title={movie.title}>
            {movie.title}
          </h3>
          <div className="movie-card-meta">
            <span className="movie-card-year">{releaseYear}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
