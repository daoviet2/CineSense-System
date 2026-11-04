import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/db.js';
import { PagedResult } from '../movie/movie.types.js';
import { toMovieSummaryFromCached } from '../movie/tmdb.mapper.js';
import { HistoryEntryDto, RecordHistoryResult } from './history.types.js';

const historyEntryWithMovieSelect = {
  id: true,
  watchedAt: true,
  movie: {
    select: {
      tmdbId: true,
      title: true,
      posterUrl: true,
      releaseDate: true,
      averageRating: true,
      genres: {
        orderBy: { genreId: 'asc' },
        select: {
          genreId: true,
        },
      },
    },
  },
} satisfies Prisma.WatchHistorySelect;

type PrismaHistoryEntryWithMovie = Prisma.WatchHistoryGetPayload<{
  select: typeof historyEntryWithMovieSelect;
}>;

function toHistoryEntryDto(record: PrismaHistoryEntryWithMovie): HistoryEntryDto {
  return {
    id: record.id,
    watchedAt: record.watchedAt,
    movie: toMovieSummaryFromCached(record.movie),
  };
}

export interface IHistoryRepository {
  recordIfNotRecent(
    userId: string,
    movieId: string,
    now: Date,
    windowMs: number
  ): Promise<RecordHistoryResult>;

  listByUser(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PagedResult<HistoryEntryDto>>;

  deleteOne(userId: string, entryId: string): Promise<boolean>;

  deleteAll(userId: string): Promise<number>;
}

export class PrismaHistoryRepository implements IHistoryRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async recordIfNotRecent(
    userId: string,
    movieId: string,
    now: Date,
    windowMs: number
  ): Promise<RecordHistoryResult> {
    const threshold = new Date(now.getTime() - windowMs);
    const lockKey = `${userId}:${movieId}`;

    return await this.prisma.$transaction(async (tx) => {
      // Transaction-level advisory lock serializes concurrent writes for the same
      // (userId, movieId) pair without locking other users or movies (Decision D27).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;

      const recent = await tx.watchHistory.findFirst({
        where: {
          userId,
          movieId,
          watchedAt: {
            gte: threshold,
          },
        },
        orderBy: {
          watchedAt: 'desc',
        },
        select: historyEntryWithMovieSelect,
      });

      if (recent) {
        return {
          entry: toHistoryEntryDto(recent),
          created: false,
        };
      }

      const created = await tx.watchHistory.create({
        data: {
          userId,
          movieId,
          watchedAt: now,
        },
        select: historyEntryWithMovieSelect,
      });

      return {
        entry: toHistoryEntryDto(created),
        created: true,
      };
    });
  }

  async listByUser(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PagedResult<HistoryEntryDto>> {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [totalResults, rows] = await this.prisma.$transaction([
      this.prisma.watchHistory.count({
        where: { userId },
      }),
      this.prisma.watchHistory.findMany({
        where: { userId },
        orderBy: { watchedAt: 'desc' },
        skip,
        take,
        select: historyEntryWithMovieSelect,
      }),
    ]);

    const totalPages = Math.ceil(totalResults / pageSize);

    return {
      items: rows.map(toHistoryEntryDto),
      page,
      totalPages,
      totalResults,
    };
  }

  async deleteOne(userId: string, entryId: string): Promise<boolean> {
    const result = await this.prisma.watchHistory.deleteMany({
      where: {
        id: entryId,
        userId,
      },
    });

    return result.count > 0;
  }

  async deleteAll(userId: string): Promise<number> {
    const result = await this.prisma.watchHistory.deleteMany({
      where: { userId },
    });

    return result.count;
  }
}

export function createHistoryRepository(prismaClient?: PrismaClient): IHistoryRepository {
  return new PrismaHistoryRepository(prismaClient);
}

