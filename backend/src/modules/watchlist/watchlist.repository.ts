import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/db.js';
import { PagedResult } from '../movie/movie.types.js';
import { toMovieSummaryFromCached } from '../movie/tmdb.mapper.js';
import { AddWatchlistResult, WatchlistItemDto } from './watchlist.types.js';

const watchlistItemWithMovieSelect = {
  addedAt: true,
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
} satisfies Prisma.WatchlistSelect;

type PrismaWatchlistItemWithMovie = Prisma.WatchlistGetPayload<{
  select: typeof watchlistItemWithMovieSelect;
}>;

function toWatchlistItemDto(record: PrismaWatchlistItemWithMovie): WatchlistItemDto {
  return {
    addedAt: record.addedAt,
    movie: toMovieSummaryFromCached(record.movie),
  };
}

export interface IWatchlistRepository {
  add(userId: string, movieId: string): Promise<AddWatchlistResult>;
  remove(userId: string, movieId: string): Promise<boolean>;
  find(userId: string, movieId: string): Promise<WatchlistItemDto | null>;
  listByUser(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PagedResult<WatchlistItemDto>>;
}

export class PrismaWatchlistRepository implements IWatchlistRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async add(userId: string, movieId: string): Promise<AddWatchlistResult> {
    try {
      const created = await this.prisma.watchlist.create({
        data: {
          userId,
          movieId,
        },
        select: watchlistItemWithMovieSelect,
      });

      return {
        item: toWatchlistItemDto(created),
        created: true,
      };
    } catch (error) {
      // Catch unique constraint violation (P2002 on watchlists_user_id_movie_id_key)
      // to guarantee idempotent add operation without leaking Prisma error codes (Decision D28).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.watchlist.findUnique({
          where: {
            userId_movieId: {
              userId,
              movieId,
            },
          },
          select: watchlistItemWithMovieSelect,
        });

        if (existing) {
          return {
            item: toWatchlistItemDto(existing),
            created: false,
          };
        }
      }

      throw error;
    }
  }

  async remove(userId: string, movieId: string): Promise<boolean> {
    const result = await this.prisma.watchlist.deleteMany({
      where: {
        userId,
        movieId,
      },
    });

    return result.count > 0;
  }

  async find(userId: string, movieId: string): Promise<WatchlistItemDto | null> {
    const record = await this.prisma.watchlist.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
      select: watchlistItemWithMovieSelect,
    });

    return record ? toWatchlistItemDto(record) : null;
  }

  async listByUser(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PagedResult<WatchlistItemDto>> {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [totalResults, rows] = await this.prisma.$transaction([
      this.prisma.watchlist.count({
        where: { userId },
      }),
      this.prisma.watchlist.findMany({
        where: { userId },
        orderBy: { addedAt: 'desc' },
        skip,
        take,
        select: watchlistItemWithMovieSelect,
      }),
    ]);

    const totalPages = Math.ceil(totalResults / pageSize);

    return {
      items: rows.map(toWatchlistItemDto),
      page,
      totalPages,
      totalResults,
    };
  }
}

export function createWatchlistRepository(
  prismaClient?: PrismaClient
): IWatchlistRepository {
  return new PrismaWatchlistRepository(prismaClient);
}
