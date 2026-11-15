'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToggleWatchlist, useWatchlistStatus } from '@/hooks/useWatchlist';
import { getActivityErrorMessage } from '@/lib/activityErrors';

interface WatchlistButtonProps {
  tmdbId: number;
}

function BookmarkIcon({ saved }: { saved: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
    </svg>
  );
}

export function WatchlistButton({ tmdbId }: WatchlistButtonProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const status = useWatchlistStatus(tmdbId, isAuthenticated);
  const toggle = useToggleWatchlist(tmdbId);

  if (isAuthLoading) {
    return <button type="button" className="watchlist-btn" disabled>Đang kiểm tra đăng nhập...</button>;
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`/movie/${tmdbId}`);
    return (
      <Link className="watchlist-btn" href={`/login?redirect=${redirect}`}>
        <BookmarkIcon saved={false} />
        <span>Đăng nhập để lưu phim</span>
      </Link>
    );
  }

  if (status.isPending) {
    return <button type="button" className="watchlist-btn" disabled>Đang tải watchlist...</button>;
  }

  if (status.isError) {
    return (
      <div className="watchlist-control">
        <button type="button" className="watchlist-btn" onClick={() => status.refetch()}>
          Thử tải lại watchlist
        </button>
        <p className="watchlist-error" role="alert">{getActivityErrorMessage(status.error)}</p>
      </div>
    );
  }

  const saved = status.data.inWatchlist;
  return (
    <div className="watchlist-control">
      <button
        type="button"
        className={`watchlist-btn${saved ? ' is-saved' : ''}`}
        aria-pressed={saved}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate(!saved)}
      >
        <BookmarkIcon saved={saved} />
        <span>{toggle.isPending ? 'Đang cập nhật...' : saved ? 'Đã lưu vào watchlist' : 'Thêm vào watchlist'}</span>
      </button>
      {toggle.isError && <p className="watchlist-error" role="alert">{getActivityErrorMessage(toggle.error)}</p>}
    </div>
  );
}
