'use client';

import React from 'react';
import { useGenres } from '@/hooks/useGenres';

export interface GenreFilterProps {
  selectedGenreId?: number;
  onSelectGenre: (genreId?: number) => void;
  disabled?: boolean;
}

export function GenreFilter({
  selectedGenreId,
  onSelectGenre,
  disabled = false,
}: GenreFilterProps) {
  const { data: genres = [], isLoading } = useGenres();

  const handleSelect = (genreId?: number) => {
    if (disabled) return;
    // Bấm vào chip đang chọn hoặc 'Tất cả' -> genreId = undefined
    if (genreId === selectedGenreId) {
      onSelectGenre(undefined);
    } else {
      onSelectGenre(genreId);
    }
  };

  return (
    <div
      className="genre-filter-container"
      role="group"
      aria-label="Lọc theo thể loại"
      data-testid="genre-filter"
    >
      <div className="genre-chips-scroll">
        {/* Chip "Tất cả" */}
        <button
          type="button"
          className={`genre-chip ${!selectedGenreId ? 'genre-chip-active' : ''}`}
          onClick={() => onSelectGenre(undefined)}
          disabled={disabled}
          aria-pressed={!selectedGenreId}
          data-testid="genre-chip-all"
        >
          Tất cả
        </button>

        {/* Loading skeleton chips */}
        {isLoading && genres.length === 0 && (
          <>
            <div className="skeleton-box genre-chip-skeleton" />
            <div className="skeleton-box genre-chip-skeleton" />
            <div className="skeleton-box genre-chip-skeleton" />
            <div className="skeleton-box genre-chip-skeleton" />
            <div className="skeleton-box genre-chip-skeleton" />
          </>
        )}

        {/* Dynamic genre chips from API */}
        {genres.map((genre) => {
          const isActive = selectedGenreId === genre.id;
          return (
            <button
              key={genre.id}
              type="button"
              className={`genre-chip ${isActive ? 'genre-chip-active' : ''}`}
              onClick={() => handleSelect(genre.id)}
              disabled={disabled}
              aria-pressed={isActive}
              data-testid={`genre-chip-${genre.id}`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
