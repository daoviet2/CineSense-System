import { PrismaClient } from '@prisma/client';
import { createHistoryRepository } from '../../src/modules/history/history.repository.js';

describe('history repository unit tests', () => {
  let mockPrisma: any;
  let historyRepo: ReturnType<typeof createHistoryRepository>;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(),
      watchHistory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      $executeRaw: jest.fn(),
    };
    historyRepo = createHistoryRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('recordIfNotRecent', () => {
    it('executes advisory lock and creates new entry when none exists within window', async () => {
      const now = new Date('2026-10-27T10:00:00.000Z');
      const windowMs = 30 * 60 * 1000;
      const fakeCreated = {
        id: 'hist-1',
        watchedAt: now,
        movie: {
          tmdbId: 603,
          title: 'The Matrix',
          posterUrl: '/poster.jpg',
          releaseDate: new Date('1999-03-30T00:00:00.000Z'),
          averageRating: 8.7,
          genres: [{ genreId: 28 }],
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          watchHistory: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(fakeCreated),
          },
        };
        return callback(tx);
      });

      const result = await historyRepo.recordIfNotRecent('u-1', 'm-1', now, windowMs);

      expect(result.created).toBe(true);
      expect(result.entry.id).toBe('hist-1');
      expect(result.entry.movie.genreIds).toEqual([28]);
    });

    it('returns existing entry with created: false when an entry is within window', async () => {
      const now = new Date('2026-10-27T10:15:00.000Z');
      const windowMs = 30 * 60 * 1000;
      const existingEntry = {
        id: 'hist-existing',
        watchedAt: new Date('2026-10-27T10:00:00.000Z'),
        movie: {
          tmdbId: 603,
          title: 'The Matrix',
          posterUrl: '/poster.jpg',
          releaseDate: null,
          averageRating: 8.7,
          genres: [{ genreId: 28 }],
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          watchHistory: {
            findFirst: jest.fn().mockResolvedValue(existingEntry),
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await historyRepo.recordIfNotRecent('u-1', 'm-1', now, windowMs);

      expect(result.created).toBe(false);
      expect(result.entry.id).toBe('hist-existing');
    });
  });

  describe('listByUser', () => {
    it('executes count and findMany in a transaction and maps items to DTOs', async () => {
      const fakeRow = {
        id: 'hist-1',
        watchedAt: new Date('2026-10-27T10:00:00.000Z'),
        movie: {
          tmdbId: 603,
          title: 'The Matrix',
          posterUrl: null,
          releaseDate: null,
          averageRating: 8.7,
          genres: [{ genreId: 28 }],
        },
      };

      mockPrisma.$transaction.mockResolvedValue([1, [fakeRow]]);

      const result = await historyRepo.listByUser('u-1', 1, 20);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.totalResults).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('hist-1');
      expect(result.items[0].movie.genreIds).toEqual([28]);
    });
  });

  describe('deleteOne', () => {
    it('returns true when deleteMany deletes 1 row', async () => {
      mockPrisma.watchHistory.deleteMany.mockResolvedValue({ count: 1 });

      const deleted = await historyRepo.deleteOne('u-1', 'entry-1');
      expect(deleted).toBe(true);
      expect(mockPrisma.watchHistory.deleteMany).toHaveBeenCalledWith({
        where: { id: 'entry-1', userId: 'u-1' },
      });
    });

    it('returns false when deleteMany deletes 0 rows', async () => {
      mockPrisma.watchHistory.deleteMany.mockResolvedValue({ count: 0 });

      const deleted = await historyRepo.deleteOne('u-1', 'entry-2');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteAll', () => {
    it('returns the count of deleted rows for the user', async () => {
      mockPrisma.watchHistory.deleteMany.mockResolvedValue({ count: 5 });

      const count = await historyRepo.deleteAll('u-1');
      expect(count).toBe(5);
      expect(mockPrisma.watchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
      });
    });
  });
});

