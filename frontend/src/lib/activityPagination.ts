import { MAX_ACTIVITY_PAGE } from '@/config/activity';

type SearchParamsReader = Pick<URLSearchParams, 'get'>;

export function parseActivityPage(params: SearchParamsReader): number {
  const raw = params.get('page');
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(page, MAX_ACTIVITY_PAGE);
}

export function activityPageHref(path: '/history' | '/watchlist', page: number): string {
  return page <= 1 ? path : `${path}?page=${page}`;
}

export function pageAfterEntryDeletion(currentPage: number, itemsOnPage: number): number {
  return currentPage > 1 && itemsOnPage === 1 ? currentPage - 1 : currentPage;
}
