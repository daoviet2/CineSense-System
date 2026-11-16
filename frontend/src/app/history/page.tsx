'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/Pagination';
import { useClearHistory, useDeleteHistoryEntry, useHistoryList } from '@/hooks/useHistory';
import { activityPageHref, pageAfterEntryDeletion, parseActivityPage } from '@/lib/activityPagination';
import { getActivityErrorMessage } from '@/lib/activityErrors';
import { formatWatchedAt } from '@/lib/historyFormat';
import type { HistoryEntry } from '@/types/activity';

function HistoryRow({ entry, onDelete, disabled }: {
  entry: HistoryEntry;
  onDelete: (entry: HistoryEntry) => void;
  disabled: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const watchedAt = formatWatchedAt(entry.watchedAt);

  return (
    <li className="history-item glass-panel">
      <Link href={`/movie/${entry.movie.tmdbId}`} className="history-item-link">
        <span className="history-item-poster">
          {entry.movie.posterUrl && !imageFailed ? (
            <Image src={entry.movie.posterUrl} alt="" fill sizes="52px" onError={() => setImageFailed(true)} />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M7 2v20M17 2v20M2 8h5m10 0h5M2 16h5m10 0h5" />
            </svg>
          )}
        </span>
        <span className="history-item-info">
          <span className="history-item-title">{entry.movie.title}</span>
          <time className="history-item-meta" dateTime={entry.watchedAt}>Đã xem lúc {watchedAt}</time>
        </span>
      </Link>
      <button
        type="button"
        className="history-item-delete"
        aria-label={`Xóa lượt xem ${entry.movie.title} lúc ${watchedAt}`}
        title="Xóa mục này"
        disabled={disabled}
        onClick={() => onDelete(entry)}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" />
        </svg>
      </button>
    </li>
  );
}

function HistoryLoading() {
  return (
    <ul className="history-list" aria-busy="true" aria-label="Đang tải lịch sử xem">
      {Array.from({ length: 4 }, (_, index) => (
        <li className="history-item glass-panel" aria-hidden="true" key={index}>
          <span className="history-item-poster skeleton-box" />
          <span className="history-item-info">
            <span className="history-skeleton-title skeleton-box" />
            <span className="history-skeleton-meta skeleton-box" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function HistoryContent() {
  const router = useRouter();
  const page = parseActivityPage(useSearchParams());
  const history = useHistoryList(page);
  const deleteEntry = useDeleteHistoryEntry();
  const clearHistory = useClearHistory();
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const clearButton = useRef<HTMLButtonElement>(null);
  const isMutating = deleteEntry.isPending || clearHistory.isPending;
  const data = history.data;
  const outOfRange = Boolean(data && data.totalResults > 0 && page > data.totalPages);

  useEffect(() => {
    if (outOfRange && !history.isFetching && data) {
      router.replace(activityPageHref('/history', data.totalPages));
    }
  }, [outOfRange, history.isFetching, data, router]);

  useEffect(() => {
    if (confirmClear) confirmButton.current?.focus();
  }, [confirmClear]);

  function cancelClear() {
    setConfirmClear(false);
    clearButton.current?.focus();
  }

  function removeEntry(entry: HistoryEntry) {
    if (isMutating || !data) return;
    setActionError(null);
    const nextPage = pageAfterEntryDeletion(page, data.items.length);
    deleteEntry.mutate(entry.id, {
      onSuccess: () => {
        if (nextPage !== page) router.replace(activityPageHref('/history', nextPage));
      },
      onError: (error) => setActionError(getActivityErrorMessage(error)),
    });
  }

  function removeAll() {
    if (isMutating) return;
    setActionError(null);
    clearHistory.mutate(undefined, {
      onSuccess: () => {
        setConfirmClear(false);
        if (page !== 1) router.replace('/history');
      },
      onError: (error) => setActionError(getActivityErrorMessage(error)),
    });
  }

  const showLoading = history.isLoading || history.isPlaceholderData || outOfRange;
  const hasEntries = Boolean(data?.items.length);

  return (
    <main className="activity-page-wrapper" id="main-content">
      <div className="activity-container">
        <header className="activity-page-header">
          <div>
            <p className="activity-eyebrow">Thư viện của bạn</p>
            <h1 className="activity-page-title">Lịch sử xem</h1>
            <p className="activity-page-subtitle">Những bộ phim bạn đã mở gần đây, mới nhất ở đầu danh sách.</p>
          </div>
          {hasEntries && !showLoading && !history.error && (
            <button
              ref={clearButton}
              type="button"
              className="btn activity-clear-button"
              aria-expanded={confirmClear}
              aria-controls="history-clear-confirm"
              disabled={isMutating}
              onClick={() => setConfirmClear(true)}
            >
              Xóa tất cả
            </button>
          )}
        </header>

        {confirmClear && hasEntries && (
          <div id="history-clear-confirm" className="confirm-inline history-confirm" role="group" aria-label="Xác nhận xóa toàn bộ lịch sử">
            <p>Xóa toàn bộ lịch sử xem? Hành động này không thể hoàn tác.</p>
            <div className="history-confirm-actions">
              <button type="button" className="btn btn-ghost" disabled={isMutating} onClick={cancelClear}>Giữ lại</button>
              <button ref={confirmButton} type="button" className="btn activity-confirm-delete" disabled={isMutating} onClick={removeAll}>
                {clearHistory.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        )}

        {actionError && <p className="history-action-error" role="alert">{actionError}</p>}

        {showLoading ? (
          <HistoryLoading />
        ) : history.error ? (
          <div className="history-state glass-panel" role="alert">
            <h2>Không thể tải lịch sử xem</h2>
            <p>{getActivityErrorMessage(history.error)}</p>
            <button type="button" className="btn btn-primary" onClick={() => history.refetch()}>Thử lại</button>
          </div>
        ) : !data || !hasEntries ? (
          <div className="history-state glass-panel">
            <h2>Chưa có phim nào trong lịch sử</h2>
            <p>Mở một bộ phim để bắt đầu lưu lại hành trình xem của bạn.</p>
            <Link href="/" className="btn btn-primary">Khám phá phim</Link>
          </div>
        ) : (
          <>
            <p className="history-result-count">{data.totalResults.toLocaleString('vi-VN')} lượt xem</p>
            <ul className="history-list" aria-label="Danh sách lịch sử xem">
              {data.items.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} disabled={isMutating} onDelete={removeEntry} />
              ))}
            </ul>
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(nextPage) => router.push(activityPageHref('/history', nextPage), { scroll: false })}
              disabled={isMutating || history.isFetching}
              ariaLabel="Phân trang lịch sử xem"
            />
          </>
        )}
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return <Suspense fallback={<main className="activity-page-wrapper"><div className="activity-container"><HistoryLoading /></div></main>}><HistoryContent /></Suspense>;
}
