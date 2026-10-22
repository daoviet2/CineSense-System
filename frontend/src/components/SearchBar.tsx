'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Tìm kiếm phim theo tên...',
  disabled = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmittedQueryRef = useRef<string>(initialQuery);

  // Sync internal state if initialQuery changes from outside (e.g., URL query reset)
  useEffect(() => {
    setQuery(initialQuery);
    lastEmittedQueryRef.current = initialQuery;
  }, [initialQuery]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerSearch = (searchQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = searchQuery.trim();
    if (trimmed !== lastEmittedQueryRef.current) {
      lastEmittedQueryRef.current = trimmed;
      onSearch(trimmed);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerSearch(val);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    triggerSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query);
  };

  return (
    <form
      role="search"
      className="search-bar-container"
      onSubmit={handleSubmit}
      aria-label="Tìm kiếm phim"
    >
      <div className="search-input-wrapper glass-panel">
        <span className="search-input-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          type="text"
          className="search-input"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
          maxLength={100}
        />

        {query.length > 0 && !disabled && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Xóa từ khóa tìm kiếm"
            title="Xóa"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary search-submit-btn"
          disabled={disabled}
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  );
}
