import { MAX_MOVIE_PAGE } from '@/config/movie';

export interface PaginationState {
  page: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  pageLabel: string;
}

/**
 * Clamps a page number between 1 and min(totalPages, MAX_MOVIE_PAGE).
 */
export function clampPage(page: number, totalPages: number): number {
  const maxPage = Math.min(Math.max(1, totalPages || 1), MAX_MOVIE_PAGE);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  if (page > maxPage) {
    return maxPage;
  }
  return Math.floor(page);
}

/**
 * Derives pagination state from current page and total pages.
 */
export function getPaginationState(currentPage: number, totalPages: number): PaginationState {
  const clampedTotalPages = Math.min(Math.max(1, totalPages || 1), MAX_MOVIE_PAGE);
  const page = clampPage(currentPage, clampedTotalPages);
  const canPrev = page > 1;
  const canNext = page < clampedTotalPages;
  const pageLabel = `Trang ${page} / ${clampedTotalPages}`;

  return {
    page,
    totalPages: clampedTotalPages,
    canPrev,
    canNext,
    pageLabel,
  };
}
