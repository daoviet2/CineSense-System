import {
  ACTIVITY_MAX_PAGE,
  ACTIVITY_PAGE_SIZE,
} from '../../config/activity.js';
import { IMovieResolver, PagedResult } from '../movie/movie.types.js';
import {
  NoopUserActivityEventPublisher,
  UserActivityEventPublisher,
} from '../user/userActivity.events.js';
import { IWatchlistRepository } from './watchlist.repository.js';
import {
  AddWatchlistResult,
  WatchlistItemDto,
  WatchlistStatusDto,
} from './watchlist.types.js';

export interface WatchlistServiceDependencies {
  watchlistRepo: IWatchlistRepository;
  movieResolver: IMovieResolver;
  activityPublisher?: UserActivityEventPublisher;
  clock?: () => Date;
  pageSize?: number;
  maxPage?: number;
}

export interface IWatchlistService {
  addToWatchlist(userId: string, tmdbId: number): Promise<AddWatchlistResult>;
  removeFromWatchlist(userId: string, tmdbId: number): Promise<void>;
  getWatchlistStatus(userId: string, tmdbId: number): Promise<WatchlistStatusDto>;
  listWatchlist(userId: string, page?: number): Promise<PagedResult<WatchlistItemDto>>;

  // Convenient aliases matching specification
  add(userId: string, tmdbId: number): Promise<AddWatchlistResult>;
  remove(userId: string, tmdbId: number): Promise<void>;
  getStatus(userId: string, tmdbId: number): Promise<WatchlistStatusDto>;
  list(userId: string, page?: number): Promise<PagedResult<WatchlistItemDto>>;
}

/**
 * Factory for creating the Watchlist domain service.
 * Adheres to architectural decisions:
 * - D25: depends on IMovieResolver port, not MovieService or Prisma.
 * - D28: idempotent add; remove/status does not invoke TMDB if movie is not cached locally.
 * - D29: publishes 'WATCHLIST_ADDED' activity event exactly once when created === true;
 *        never publishes on remove or on idempotent duplicate; handles publisher errors safely.
 * - D30: enforces userId ownership; accepts tmdbId and returns clean DTOs.
 */
export function createWatchlistService({
  watchlistRepo,
  movieResolver,
  activityPublisher = new NoopUserActivityEventPublisher(),
  clock = () => new Date(),
  pageSize = ACTIVITY_PAGE_SIZE,
  maxPage = ACTIVITY_MAX_PAGE,
}: WatchlistServiceDependencies): IWatchlistService {
  const addToWatchlist = async (
    userId: string,
    tmdbId: number
  ): Promise<AddWatchlistResult> => {
    const movie = await movieResolver.resolveForWrite(tmdbId);
    const result = await watchlistRepo.add(userId, movie.id);

    if (result.created) {
      try {
        await activityPublisher.activityRecorded({
          userId,
          movieId: movie.id,
          type: 'WATCHLIST_ADDED',
          occurredAt: clock(),
        });
      } catch {
        // Log safely without leaking PII (Decision D29).
        console.error(
          `User activity publishing failed for user ${userId} and movie ${movie.id}`
        );
      }
    }

    return result;
  };

  const removeFromWatchlist = async (
    userId: string,
    tmdbId: number
  ): Promise<void> => {
    const movieId = await movieResolver.findCachedId(tmdbId);
    if (!movieId) {
      // Movie is not cached in local DB, so it cannot be in the user's watchlist.
      // Return 204 idempotently without calling TMDB (Decision D25, D28).
      return;
    }

    await watchlistRepo.remove(userId, movieId);
    // Never publish event on removal (Decision D29).
  };

  const getWatchlistStatus = async (
    userId: string,
    tmdbId: number
  ): Promise<WatchlistStatusDto> => {
    const movieId = await movieResolver.findCachedId(tmdbId);
    if (!movieId) {
      // Uncached movie is not in watchlist
      return { inWatchlist: false, addedAt: null };
    }

    const item = await watchlistRepo.find(userId, movieId);
    if (!item) {
      return { inWatchlist: false, addedAt: null };
    }

    return { inWatchlist: true, addedAt: item.addedAt };
  };

  const listWatchlist = async (
    userId: string,
    page = 1
  ): Promise<PagedResult<WatchlistItemDto>> => {
    const targetPage = Math.min(Math.max(1, page), maxPage);
    return await watchlistRepo.listByUser(userId, targetPage, pageSize);
  };

  return {
    addToWatchlist,
    removeFromWatchlist,
    getWatchlistStatus,
    listWatchlist,

    // Aliases
    add: addToWatchlist,
    remove: removeFromWatchlist,
    getStatus: getWatchlistStatus,
    list: listWatchlist,
  };
}
