'use client';

import React from 'react';
import { getPaginationState } from '@/lib/moviePagination';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { page, totalPages: maxPages, canPrev, canNext, pageLabel } = getPaginationState(
    currentPage,
    totalPages
  );

  // Không hiển thị phân trang nếu chỉ có 1 trang và đang ở trang 1
  if (maxPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (canPrev && !disabled) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (canNext && !disabled) {
      onPageChange(page + 1);
    }
  };

  return (
    <nav
      className="pagination-container"
      role="navigation"
      aria-label="Phân trang danh sách phim"
      data-testid="pagination"
    >
      <button
        type="button"
        className="btn btn-ghost pagination-btn"
        onClick={handlePrev}
        disabled={!canPrev || disabled}
        aria-label="Trang trước"
        data-testid="pagination-prev"
      >
        <span aria-hidden="true" className="pagination-arrow">←</span>
        <span>Trước</span>
      </button>

      <span
        className="pagination-label"
        aria-current="page"
        data-testid="pagination-label"
      >
        {pageLabel}
      </span>

      <button
        type="button"
        className="btn btn-ghost pagination-btn"
        onClick={handleNext}
        disabled={!canNext || disabled}
        aria-label="Trang tiếp theo"
        data-testid="pagination-next"
      >
        <span>Sau</span>
        <span aria-hidden="true" className="pagination-arrow">→</span>
      </button>
    </nav>
  );
}
