import {
  ACTIVITY_MAX_PAGE,
  ACTIVITY_PAGE_SIZE,
  HISTORY_DEDUPE_WINDOW_MS,
} from '../../config/activity.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { IMovieResolver, PagedResult } from '../movie/movie.types.js';
import {
  NoopUserActivityEventPublisher,
  UserActivityEventPublisher,
} from '../user/userActivity.events.js';
import { IHistoryRepository } from './history.repository.js';
import { HistoryEntryDto, RecordHistoryResult } from './history.types.js';

export interface HistoryServiceDependencies {
  historyRepo: IHistoryRepository;
  movieResolver: IMovieResolver;
  activityPublisher?: UserActivityEventPublisher;
  clock?: () => Date;
  dedupeWindowMs?: number;
  pageSize?: number;
  maxPage?: number;
}

export interface IHistoryService {
  recordView(userId: string, tmdbId: number): Promise<RecordHistoryResult>;
  listHistory(userId: string, page?: number): Promise<PagedResult<HistoryEntryDto>>;
  deleteEntry(userId: string, entryId: string): Promise<void>;
  clearHistory(userId: string): Promise<void>;
}

/**
 * Factory for creating the History domain service.
 * Adheres to architectural decisions:
 * - D25: depends on IMovieResolver port, not MovieService or Prisma.
 * - D27: deduplicates repeated views within the configured dedupe window.
 * - D29: publishes 'WATCHED' activity event exactly once when created === true; handles publisher errors safely.
 * - D30: enforces ownership on delete; throws 404 NOT_FOUND if entry does not exist or belongs to another user.
 */
export function createHistoryService({
  historyRepo,
  movieResolver,
  activityPublisher = new NoopUserActivityEventPublisher(),
  clock = () => new Date(),
  dedupeWindowMs = HISTORY_DEDUPE_WINDOW_MS,
  pageSize = ACTIVITY_PAGE_SIZE,
  maxPage = ACTIVITY_MAX_PAGE,
}: HistoryServiceDependencies): IHistoryService {
  return {
    async recordView(userId: string, tmdbId: number): Promise<RecordHistoryResult> {
      const movie = await movieResolver.resolveForWrite(tmdbId);
      const now = clock();
      const result = await historyRepo.recordIfNotRecent(userId, movie.id, now, dedupeWindowMs);

      if (result.created) {
        try {
          await activityPublisher.activityRecorded({
            userId,
            movieId: movie.id,
            type: 'WATCHED',
            occurredAt: now,
          });
        } catch {
          // Log failure safely without exposing sensitive user data (Decision D29).
          console.error(`User activity publishing failed for user ${userId} and movie ${movie.id}`);
        }
      }

      return result;
    },

    async listHistory(userId: string, page = 1): Promise<PagedResult<HistoryEntryDto>> {
      const targetPage = Math.min(Math.max(1, page), maxPage);
      return await historyRepo.listByUser(userId, targetPage, pageSize);
    },

    async deleteEntry(userId: string, entryId: string): Promise<void> {
      const deleted = await historyRepo.deleteOne(userId, entryId);
      if (!deleted) {
        throw new AppError('History entry not found', 404, 'NOT_FOUND');
      }
    },

    async clearHistory(userId: string): Promise<void> {
      await historyRepo.deleteAll(userId);
    },
  };
}

