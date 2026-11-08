import { AppError } from '../../src/middlewares/errorHandler.js';
import { createHistoryService, IHistoryService } from '../../src/modules/history/history.service.js';
import { IHistoryRepository } from '../../src/modules/history/history.repository.js';
import { HistoryEntryDto } from '../../src/modules/history/history.types.js';
import { IMovieResolver, PagedResult } from '../../src/modules/movie/movie.types.js';
import { UserActivityEventPublisher } from '../../src/modules/user/userActivity.events.js';

describe('HistoryService unit tests', () => {
  const fakeMovieSummary = {
    tmdbId: 603,
    title: 'The Matrix',
    posterUrl: '/poster.jpg',
    releaseDate: '1999-03-30',
    averageRating: 8.7,
    genreIds: [28, 878],
  };

  const fakeHistoryEntry: HistoryEntryDto = {
    id: 'entry-uuid-1',
    watchedAt: new Date('2026-11-08T09:00:00.000Z'),
    movie: fakeMovieSummary,
  };

  let mockRepo: jest.Mocked<IHistoryRepository>;
  let mockResolver: jest.Mocked<IMovieResolver>;
  let mockPublisher: jest.Mocked<UserActivityEventPublisher>;
  let service: IHistoryService;
  const fixedNow = new Date('2026-11-08T09:00:00.000Z');

  beforeEach(() => {
    mockRepo = {
      recordIfNotRecent: jest.fn(),
      listByUser: jest.fn(),
      deleteOne: jest.fn(),
      deleteAll: jest.fn(),
    };

    mockResolver = {
      resolveForWrite: jest.fn(),
      findCachedId: jest.fn(),
    };

    mockPublisher = {
      activityRecorded: jest.fn().mockResolvedValue(undefined),
    };

    service = createHistoryService({
      historyRepo: mockRepo,
      movieResolver: mockResolver,
      activityPublisher: mockPublisher,
      clock: () => fixedNow,
      dedupeWindowMs: 30 * 60 * 1000,
      pageSize: 20,
      maxPage: 500,
    });
  });

  describe('recordView', () => {
    it('resolves movie, records with injected clock, publishes event once when created is true', async () => {
      mockResolver.resolveForWrite.mockResolvedValue({ id: 'movie-uuid-1' });
      mockRepo.recordIfNotRecent.mockResolvedValue({
        entry: fakeHistoryEntry,
        created: true,
      });

      const result = await service.recordView('user-uuid-1', 603);

      expect(mockResolver.resolveForWrite).toHaveBeenCalledWith(603);
      expect(mockRepo.recordIfNotRecent).toHaveBeenCalledWith(
        'user-uuid-1',
        'movie-uuid-1',
        fixedNow,
        30 * 60 * 1000
      );
      expect(mockPublisher.activityRecorded).toHaveBeenCalledTimes(1);
      expect(mockPublisher.activityRecorded).toHaveBeenCalledWith({
        userId: 'user-uuid-1',
        movieId: 'movie-uuid-1',
        type: 'WATCHED',
        occurredAt: fixedNow,
      });
      expect(result).toEqual({
        entry: fakeHistoryEntry,
        created: true,
      });
    });

    it('does NOT call activityRecorded when created is false (dedupe window hit)', async () => {
      mockResolver.resolveForWrite.mockResolvedValue({ id: 'movie-uuid-1' });
      mockRepo.recordIfNotRecent.mockResolvedValue({
        entry: fakeHistoryEntry,
        created: false,
      });

      const result = await service.recordView('user-uuid-1', 603);

      expect(mockResolver.resolveForWrite).toHaveBeenCalledWith(603);
      expect(mockRepo.recordIfNotRecent).toHaveBeenCalledTimes(1);
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
      expect(result).toEqual({
        entry: fakeHistoryEntry,
        created: false,
      });
    });

    it('still succeeds and returns result when activityPublisher throws an error', async () => {
      mockResolver.resolveForWrite.mockResolvedValue({ id: 'movie-uuid-1' });
      mockRepo.recordIfNotRecent.mockResolvedValue({
        entry: fakeHistoryEntry,
        created: true,
      });
      mockPublisher.activityRecorded.mockRejectedValue(new Error('Queue connection down'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.recordView('user-uuid-1', 603);

      expect(result).toEqual({
        entry: fakeHistoryEntry,
        created: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User activity publishing failed for user user-uuid-1 and movie movie-uuid-1')
      );

      consoleSpy.mockRestore();
    });

    it('propagates 404 NOT_FOUND from movieResolver untouched', async () => {
      const error = new AppError('Movie not found', 404, 'NOT_FOUND');
      mockResolver.resolveForWrite.mockRejectedValue(error);

      await expect(service.recordView('user-uuid-1', 999999)).rejects.toThrow(error);
      expect(mockRepo.recordIfNotRecent).not.toHaveBeenCalled();
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });

    it('propagates 502 UPSTREAM_ERROR from movieResolver untouched', async () => {
      const error = new AppError('Upstream TMDB failure', 502, 'UPSTREAM_ERROR');
      mockResolver.resolveForWrite.mockRejectedValue(error);

      await expect(service.recordView('user-uuid-1', 603)).rejects.toThrow(error);
      expect(mockRepo.recordIfNotRecent).not.toHaveBeenCalled();
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });

    it('propagates 504 UPSTREAM_TIMEOUT from movieResolver untouched', async () => {
      const error = new AppError('Upstream TMDB timeout', 504, 'UPSTREAM_TIMEOUT');
      mockResolver.resolveForWrite.mockRejectedValue(error);

      await expect(service.recordView('user-uuid-1', 603)).rejects.toThrow(error);
      expect(mockRepo.recordIfNotRecent).not.toHaveBeenCalled();
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });
  });

  describe('listHistory', () => {
    it('passes default page 1 and configured pageSize to repository', async () => {
      const pagedResult: PagedResult<HistoryEntryDto> = {
        items: [fakeHistoryEntry],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      };
      mockRepo.listByUser.mockResolvedValue(pagedResult);

      const result = await service.listHistory('user-uuid-1');

      expect(mockRepo.listByUser).toHaveBeenCalledWith('user-uuid-1', 1, 20);
      expect(result).toBe(pagedResult);
    });

    it('clamps page exceeding maxPage to maxPage', async () => {
      mockRepo.listByUser.mockResolvedValue({
        items: [],
        page: 500,
        totalPages: 2,
        totalResults: 30,
      });

      await service.listHistory('user-uuid-1', 9999);

      expect(mockRepo.listByUser).toHaveBeenCalledWith('user-uuid-1', 500, 20);
    });

    it('clamps negative or zero page to 1', async () => {
      mockRepo.listByUser.mockResolvedValue({
        items: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
      });

      await service.listHistory('user-uuid-1', 0);

      expect(mockRepo.listByUser).toHaveBeenCalledWith('user-uuid-1', 1, 20);
    });
  });

  describe('deleteEntry', () => {
    it('resolves void when repository deleteOne returns true', async () => {
      mockRepo.deleteOne.mockResolvedValue(true);

      await expect(service.deleteEntry('user-uuid-1', 'entry-uuid-1')).resolves.toBeUndefined();
      expect(mockRepo.deleteOne).toHaveBeenCalledWith('user-uuid-1', 'entry-uuid-1');
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });

    it('throws AppError 404 NOT_FOUND when repository deleteOne returns false', async () => {
      mockRepo.deleteOne.mockResolvedValue(false);

      await expect(service.deleteEntry('user-uuid-1', 'non-existent-entry')).rejects.toThrow(AppError);
      await expect(service.deleteEntry('user-uuid-1', 'non-existent-entry')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'History entry not found',
      });
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('calls repository deleteAll with userId and does not call publisher', async () => {
      mockRepo.deleteAll.mockResolvedValue(4);

      await expect(service.clearHistory('user-uuid-1')).resolves.toBeUndefined();
      expect(mockRepo.deleteAll).toHaveBeenCalledWith('user-uuid-1');
      expect(mockPublisher.activityRecorded).not.toHaveBeenCalled();
    });
  });
});

