'use client';

import React, { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GenreFilter } from '@/components/GenreFilter';
import { MovieGrid } from '@/components/MovieGrid';
import { Pagination } from '@/components/Pagination';
import { SearchBar } from '@/components/SearchBar';
import { useGenres } from '@/hooks/useGenres';
import { useMovies } from '@/hooks/useMovies';
import { getHomeEmptyMessage, getHomeSectionTitle } from '@/lib/movieHome';
import { parseMovieQuery, serializeMovieQuery } from '@/lib/movieQuery';
import type { MovieQuery } from '@/types/movie';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse and sanitize query parameters from URL using pure helper (D21/feat-031)
  const currentQuery = parseMovieQuery(searchParams);

  // TanStack Query hooks
  const { data, isLoading, error, refetch } = useMovies(currentQuery);
  const { data: genres = [] } = useGenres();

  // Navigation helper to update URL and trigger data fetch
  const navigateWithQuery = useCallback(
    (newQuery: MovieQuery) => {
      const serialized = serializeMovieQuery(newQuery);
      const queryString = serialized.toString();
      const targetUrl = queryString ? `/?${queryString}` : '/';
      router.push(targetUrl);
    },
    [router]
  );

  // Search handler: searches update q and reset page to 1
  const handleSearch = useCallback(
    (q: string) => {
      if (q.trim()) {
        navigateWithQuery({ page: 1, q: q.trim() });
      } else {
        // Clearing query resets to popular
        navigateWithQuery({ page: 1 });
      }
    },
    [navigateWithQuery]
  );

  // Genre selection handler: selecting genre resets q and page to 1
  const handleSelectGenre = useCallback(
    (genreId?: number) => {
      if (genreId) {
        navigateWithQuery({ page: 1, genreId });
      } else {
        // Deselecting genre resets to popular
        navigateWithQuery({ page: 1 });
      }
    },
    [navigateWithQuery]
  );

  // Pagination handler: retains existing q or genreId and changes page
  const handlePageChange = useCallback(
    (page: number) => {
      navigateWithQuery({
        ...currentQuery,
        page,
      });

      // Smooth scroll back to top of movie grid
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    },
    [currentQuery, navigateWithQuery]
  );

  const sectionTitle = getHomeSectionTitle(currentQuery, genres);
  const emptyMessage = getHomeEmptyMessage(currentQuery);
  const totalResults = data?.totalResults;

  return (
    <main className="home-container">
      {/* Hero / Header Section */}
      <section className="home-hero" aria-label="Giới thiệu và tìm kiếm phim">
        <span className="home-hero-badge">CineSense Movies</span>
        <h1 className="home-hero-title">
          Khám phá điện ảnh đỉnh cao cùng{' '}
          <span className="brand-highlight">CineSense</span>
        </h1>
        <p className="home-hero-subtitle">
          Tìm kiếm phim yêu thích, lọc theo thể loại và trải nghiệm kho phim phong phú từ TMDB.
        </p>

        {/* Search Bar */}
        <SearchBar
          initialQuery={currentQuery.q || ''}
          onSearch={handleSearch}
          placeholder="Tìm kiếm phim theo tiêu đề..."
        />
      </section>

      {/* Genre Filter Chips */}
      <section aria-label="Bộ lọc thể loại phim">
        <GenreFilter
          selectedGenreId={currentQuery.genreId}
          onSelectGenre={handleSelectGenre}
        />
      </section>

      {/* Section Header with dynamic title and result count */}
      <div className="home-section-header">
        <h2 className="home-section-title">{sectionTitle}</h2>
        {totalResults !== undefined && !isLoading && !error && (
          <span className="home-section-count" data-testid="movie-count">
            {totalResults > 0
              ? `${totalResults.toLocaleString()} bộ phim`
              : '0 kết quả'}
          </span>
        )}
      </div>

      {/* Movie Grid: handles Loading, Empty, Error, and Success states */}
      <MovieGrid
        movies={data?.items || []}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage={emptyMessage}
        skeletonCount={20}
      />

      {/* Pagination Controls */}
      {data && (
        <Pagination
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={handlePageChange}
          disabled={isLoading}
        />
      )}
    </main>
  );
}

function HomeLoadingFallback() {
  return (
    <main className="home-container">
      <div className="home-hero">
        <span className="home-hero-badge">CineSense Movies</span>
        <h1 className="home-hero-title">Đang tải phim...</h1>
      </div>
      <MovieGrid isLoading={true} skeletonCount={20} />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
