import { AppError } from '../../src/middlewares/errorHandler.js';
import { IMovieResolver } from '../../src/modules/movie/movie.types.js';
import { UserActivityEventPublisher } from '../../src/modules/user/userActivity.events.js';
import { IWatchlistRepository } from '../../src/modules/watchlist/watchlist.repository.js';
import { createWatchlistService } from '../../src/modules/watchlist/watchlist.service.js';
import { WatchlistItemDto } from '../../src/modules/watchlist/watchlist.types.js';

describe('WatchlistService unit tests', () => {
  let mockWatchlistRepo: jest.Mocked<IWatchlistRepository>;
  let mockMovieResolver: jest.Mocked<IMovieResolver>;
  let mockPublisher: jest.Mocked<UserActivityEventPublisher>;
  const fixedClock = () => new Date('2026-10-27T12:00:00.000Z');

  const sampleWatchlistItem: WatchlistItemDto = {
    addedAt: new Date('2026-10-27T10:00:00.000Z'),
    movie: {
      tmdbId: 603,
      title: 'The Matrix',
      posterUrl: '/matrix.jpg',
      releaseDate: '1999-03-31',
      averageRating: 8.7,
      genreIds: [28, 878],
    },
  };

  beforeEach(() => {
    mockWatchlistRepo = {
      add: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
      listByUser: jest.fn(),
    };

    mockMovieResolver = {
      resolveForWrite: jest.fn(),
      findCachedId: jest.fn(),
    };

    mockPublisher = {
      activityRecorded: jest.fn().mockResolvedValue(undefined),
    };
  });

  function createService(maxPage = 500, pageSize = 20) {
    return createWatchlistService({
      watchlistRepo: mockWatchlistRepo,
      movieResolver: mockMovieResolver,
      activityPublisher: mockPublisher,
      clock: fixedClock,
      pageSize,
      maxPage,
    });
  }

  // ── 1. addToWatchlist (add) ──────────────────────────────────────────────
  describe('addToWatchlist', () => {
    it('resolves movie ID, adds to repository, and publishes WATCHLIST_ADDED when newly created', async () => {
      const service = createService();
      mockMovieResolver.resolveForWrite.mockResolvedValueOnce({ id: 'movie-uuid-1' });
      mockWatchlistRepo.add.mockResolvedValueOnce({
        item: sampleWatchlistItem,
        created: true,
      });

      const result = await service.addToWatchlist('user-1', 603);

      expect(mockMovieResolver.resolveForWrite).toHaveBeenCalledWith(603);
      expect(mockWatchlistRepo.add).toHaveBeenCalledWith('user-1', 'movie-uuid-1');
      expect(mockPublisher.activityRecorded).toHaveBeenCalledTimes(1);
      expect(mockPublisher.activityRecorded).toHaveBeenCalledWith({
        userId: 'user-1',
        movieId: 'movie-uuid-1',
        type: 'WATCHLIST_ADDED',
        occurredAt: fixedClock(),
      });
      expect(result).toEqual({
        item: sampleWatchlistItem,
        created: true,
      });
    });

    it('does NOT publish activity event when movie is already in watchlist (created: false)', async () => {
      const service = createService();
      mockMovieResolver.resolveForWrite.mockResolvedValueOnce({ id: 'movie-uuid-1' });
      mockWatchlistRepo.add.mockResolvedValueOnce({
        item: sampleWatchlistItem,
        created: false,
      });

      const result = await service.addToWatchlist('user-1', 603);

      expect(mockWatchlistRepo.add).toHaveBeenCalledWith('user-1', 'movie-uuid-1');
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
      expect(result.created).toBe(false);
    });

    it('safely catches and logs publisher error without failing the request (Decision D29)', async () => {
      const service = createService();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockMovieResolver.resolveForWrite.mockResolvedValueOnce({ id: 'movie-uuid-1' });
      mockWatchlistRepo.add.mockResolvedValueOnce({
        item: sampleWatchlistItem,
        created: true,
      });
      mockPublisher.activityRecorded.mockRejectedValueOnce(new Error('Queue broker down'));

      const result = await service.addToWatchlist('user-1', 603);

      expect(result.created).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User activity publishing failed')
      );
      consoleSpy.mockRestore();
    });

    it('propagates AppError from movieResolver untouched without calling repository or publisher', async () => {
      const service = createService();
      mockMovieResolver.resolveForWrite.mockRejectedValueOnce(
        new AppError('Upstream TMDB unavailable', 502, 'UPSTREAM_ERROR')
      );

      await expect(service.addToWatchlist('user-1', 999999)).rejects.toMatchObject({
        statusCode: 502,
        code: 'UPSTREAM_ERROR',
        message: 'Upstream TMDB unavailable',
      });

      expect(mockWatchlistRepo.add).not.toHaveBeenCalled();
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });
  });

  // ── 2. removeFromWatchlist (remove) ──────────────────────────────────────
  describe('removeFromWatchlist', () => {
    it('removes item when movie is cached in local DB and NEVER publishes event', async () => {
      const service = createService();
      mockMovieResolver.findCachedId.mockResolvedValueOnce('movie-uuid-1');
      mockWatchlistRepo.remove.mockResolvedValueOnce(true);

      await service.removeFromWatchlist('user-1', 603);

      expect(mockMovieResolver.findCachedId).toHaveBeenCalledWith(603);
      expect(mockWatchlistRepo.remove).toHaveBeenCalledWith('user-1', 'movie-uuid-1');
      expect(mockMovieResolver.resolveForWrite).not.toHaveBeenCalled();
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });

    it('returns immediately without calling repository or TMDB when movie is not cached locally', async () => {
      const service = createService();
      mockMovieResolver.findCachedId.mockResolvedValueOnce(null);

      await service.removeFromWatchlist('user-1', 999999);

      expect(mockMovieResolver.findCachedId).toHaveBeenCalledWith(999999);
      expect(mockWatchlistRepo.remove).not.toHaveBeenCalled();
      expect(mockMovieResolver.resolveForWrite).not.toHaveBeenCalled();
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });
  });

  // ── 3. getWatchlistStatus (getStatus) ────────────────────────────────────
  describe('getWatchlistStatus', () => {
    it('returns inWatchlist: false when movie is not cached locally (never calls TMDB)', async () => {
      const service = createService();
      mockMovieResolver.findCachedId.mockResolvedValueOnce(null);

      const status = await service.getWatchlistStatus('user-1', 603);

      expect(status).toEqual({ inWatchlist: false, addedAt: null });
      expect(mockMovieResolver.findCachedId).toHaveBeenCalledWith(603);
      expect(mockMovieResolver.resolveForWrite).not.toHaveBeenCalled();
      expect(mockWatchlistRepo.find).not.toHaveBeenCalled();
    });

    it('returns inWatchlist: true with addedAt timestamp when movie is in watchlist', async () => {
      const service = createService();
      mockMovieResolver.findCachedId.mockResolvedValueOnce('movie-uuid-1');
      mockWatchlistRepo.find.mockResolvedValueOnce(sampleWatchlistItem);

      const status = await service.getWatchlistStatus('user-1', 603);

      expect(status).toEqual({
        inWatchlist: true,
        addedAt: sampleWatchlistItem.addedAt,
      });
      expect(mockWatchlistRepo.find).toHaveBeenCalledWith('user-1', 'movie-uuid-1');
    });

    it('returns inWatchlist: false when movie is cached but not in user watchlist', async () => {
      const service = createService();
      mockMovieResolver.findCachedId.mockResolvedValueOnce('movie-uuid-1');
      mockWatchlistRepo.find.mockResolvedValueOnce(null);

      const status = await service.getWatchlistStatus('user-1', 603);

      expect(status).toEqual({ inWatchlist: false, addedAt: null });
    });
  });

  // ── 4. listWatchlist (list) ──────────────────────────────────────────────
  describe('listWatchlist', () => {
    it('clamps page to 1 if negative and delegates to watchlistRepo', async () => {
      const service = createService(500, 20);
      mockWatchlistRepo.listByUser.mockResolvedValueOnce({
        items: [sampleWatchlistItem],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      });

      const result = await service.listWatchlist('user-1', -5);

      expect(mockWatchlistRepo.listByUser).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result.items).toHaveLength(1);
    });

    it('clamps page to maxPage when exceeding limit', async () => {
      const service = createService(100, 20);
      mockWatchlistRepo.listByUser.mockResolvedValueOnce({
        items: [],
        page: 100,
        totalPages: 1,
        totalResults: 1,
      });

      await service.listWatchlist('user-1', 999);

      expect(mockWatchlistRepo.listByUser).toHaveBeenCalledWith('user-1', 100, 20);
    });
  });

  // ── 5. Method aliases ───────────────────────────────────────────────────
  describe('method aliases', () => {
    it('exposes add, remove, getStatus, and list matching specification', () => {
      const service = createService();
      expect(service.add).toBe(service.addToWatchlist);
      expect(service.remove).toBe(service.removeFromWatchlist);
      expect(service.getStatus).toBe(service.getWatchlistStatus);
      expect(service.list).toBe(service.listWatchlist);
    });
  });
});
