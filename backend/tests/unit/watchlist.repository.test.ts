import { Prisma, PrismaClient } from '@prisma/client';
import { createWatchlistRepository } from '../../src/modules/watchlist/watchlist.repository.js';

describe('watchlist repository unit tests', () => {
  let mockPrisma: any;
  let watchlistRepo: ReturnType<typeof createWatchlistRepository>;

  const fakeMovieRecord = {
    tmdbId: 603,
    title: 'The Matrix',
    posterUrl: '/poster.jpg',
    releaseDate: new Date('1999-03-30T00:00:00.000Z'),
    averageRating: 8.7,
    genres: [{ genreId: 28 }, { genreId: 878 }],
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(),
      watchlist: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    watchlistRepo = createWatchlistRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('add', () => {
    it('creates a new watchlist item and returns created: true', async () => {
      const addedAt = new Date('2026-10-27T10:00:00.000Z');
      const fakeCreated = {
        addedAt,
        movie: fakeMovieRecord,
      };

      mockPrisma.watchlist.create.mockResolvedValueOnce(fakeCreated);

      const result = await watchlistRepo.add('u-1', 'm-1');

      expect(result.created).toBe(true);
      expect(result.item.addedAt).toEqual(addedAt);
      expect(result.item.movie).toEqual({
        tmdbId: 603,
        title: 'The Matrix',
        posterUrl: '/poster.jpg',
        releaseDate: '1999-03-30',
        averageRating: 8.7,
        genreIds: [28, 878],
      });
      expect(mockPrisma.watchlist.create).toHaveBeenCalledWith({
        data: { userId: 'u-1', movieId: 'm-1' },
        select: expect.any(Object),
      });
    });

    it('handles P2002 unique constraint error by reading existing item and returning created: false (Decision D28)', async () => {
      const addedAt = new Date('2026-10-27T09:00:00.000Z');
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
        }
      );

      mockPrisma.watchlist.create.mockRejectedValueOnce(p2002Error);
      mockPrisma.watchlist.findUnique.mockResolvedValueOnce({
        addedAt,
        movie: fakeMovieRecord,
      });

      const result = await watchlistRepo.add('u-1', 'm-1');

      expect(result.created).toBe(false);
      expect(result.item.addedAt).toEqual(addedAt);
      expect(result.item.movie.tmdbId).toBe(603);
      expect(mockPrisma.watchlist.findUnique).toHaveBeenCalledWith({
        where: {
          userId_movieId: {
            userId: 'u-1',
            movieId: 'm-1',
          },
        },
        select: expect.any(Object),
      });
    });

    it('rethrows unexpected Prisma errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.watchlist.create.mockRejectedValueOnce(dbError);

      await expect(watchlistRepo.add('u-1', 'm-1')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('remove', () => {
    it('returns true when deleteMany deletes at least one record', async () => {
      mockPrisma.watchlist.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await watchlistRepo.remove('u-1', 'm-1');

      expect(result).toBe(true);
      expect(mockPrisma.watchlist.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', movieId: 'm-1' },
      });
    });

    it('returns false when record to delete was not found', async () => {
      mockPrisma.watchlist.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await watchlistRepo.remove('u-1', 'm-1');

      expect(result).toBe(false);
    });
  });

  describe('find', () => {
    it('returns mapped WatchlistItemDto when record exists', async () => {
      const addedAt = new Date('2026-10-27T10:00:00.000Z');
      mockPrisma.watchlist.findUnique.mockResolvedValueOnce({
        addedAt,
        movie: fakeMovieRecord,
      });

      const result = await watchlistRepo.find('u-1', 'm-1');

      expect(result).toEqual({
        addedAt,
        movie: {
          tmdbId: 603,
          title: 'The Matrix',
          posterUrl: '/poster.jpg',
          releaseDate: '1999-03-30',
          averageRating: 8.7,
          genreIds: [28, 878],
        },
      });
      expect(mockPrisma.watchlist.findUnique).toHaveBeenCalledWith({
        where: {
          userId_movieId: {
            userId: 'u-1',
            movieId: 'm-1',
          },
        },
        select: expect.any(Object),
      });
    });

    it('returns null when record does not exist', async () => {
      mockPrisma.watchlist.findUnique.mockResolvedValueOnce(null);

      const result = await watchlistRepo.find('u-1', 'm-1');

      expect(result).toBeNull();
    });
  });

  describe('listByUser', () => {
    it('executes count and findMany in a transaction and returns paged results', async () => {
      const addedAt = new Date('2026-10-27T10:00:00.000Z');
      const fakeRow = {
        addedAt,
        movie: fakeMovieRecord,
      };

      mockPrisma.$transaction.mockResolvedValueOnce([1, [fakeRow]]);

      const result = await watchlistRepo.listByUser('u-1', 1, 20);

      expect(result).toEqual({
        items: [
          {
            addedAt,
            movie: {
              tmdbId: 603,
              title: 'The Matrix',
              posterUrl: '/poster.jpg',
              releaseDate: '1999-03-30',
              averageRating: 8.7,
              genreIds: [28, 878],
            },
          },
        ],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      });
      expect(mockPrisma.watchlist.count).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
      });
      expect(mockPrisma.watchlist.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        orderBy: { addedAt: 'desc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      });
    });

    it('calculates pagination skip and totalPages correctly for subsequent pages', async () => {
      mockPrisma.$transaction.mockResolvedValueOnce([45, []]);

      const result = await watchlistRepo.listByUser('u-1', 3, 20);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(3);
      expect(result.totalResults).toBe(45);
      expect(result.items).toEqual([]);
      expect(mockPrisma.watchlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });
  });
});
