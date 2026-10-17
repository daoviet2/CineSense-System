import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/db.js';
import { upsertGenres } from './genre.repository.js';
import { MovieCacheInput, MovieWithGenres } from './movie.types.js';

const movieWithGenresSelect = {
  id: true,
  tmdbId: true,
  title: true,
  overview: true,
  averageRating: true,
  posterUrl: true,
  releaseDate: true,
  genres: {
    orderBy: { genreId: 'asc' },
    select: {
      genre: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.MovieSelect;

type PrismaMovieWithGenres = Prisma.MovieGetPayload<{ select: typeof movieWithGenresSelect }>;

function toMovieWithGenres(movie: PrismaMovieWithGenres): MovieWithGenres {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    overview: movie.overview,
    averageRating: movie.averageRating,
    posterUrl: movie.posterUrl,
    releaseDate: movie.releaseDate,
    genres: movie.genres.map(({ genre }) => ({ id: genre.id, name: genre.name })),
  };
}

function isTmdbIdUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes('tmdb_id') || target.includes('tmdbId');
  return typeof target === 'string' && target.includes('tmdb_id');
}

export interface IMovieRepository {
  findByTmdbId(tmdbId: number): Promise<MovieWithGenres | null>;
  saveIfAbsent(input: MovieCacheInput): Promise<{ movie: MovieWithGenres; created: boolean }>;
}

export class PrismaMovieRepository implements IMovieRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findByTmdbId(tmdbId: number): Promise<MovieWithGenres | null> {
    const movie = await this.prisma.movie.findUnique({
      where: { tmdbId },
      select: movieWithGenresSelect,
    });

    return movie ? toMovieWithGenres(movie) : null;
  }

  async saveIfAbsent(
    input: MovieCacheInput
  ): Promise<{ movie: MovieWithGenres; created: boolean }> {
    const genres = Array.from(new Map(input.genres.map((genre) => [genre.id, genre])).values());

    try {
      const movie = await this.prisma.$transaction(async (tx) => {
        await upsertGenres(tx, genres);

        const createdMovie = await tx.movie.create({
          data: {
            tmdbId: input.tmdbId,
            title: input.title,
            overview: input.overview,
            averageRating: input.averageRating,
            posterUrl: input.posterUrl,
            releaseDate: input.releaseDate,
          },
          select: { id: true },
        });

        if (genres.length > 0) {
          await tx.movieGenre.createMany({
            data: genres.map(({ id }) => ({ movieId: createdMovie.id, genreId: id })),
          });
        }

        const saved = await tx.movie.findUnique({
          where: { id: createdMovie.id },
          select: movieWithGenresSelect,
        });
        if (!saved) throw new Error('Created movie could not be read inside transaction');
        return saved;
      });

      return { movie: toMovieWithGenres(movie), created: true };
    } catch (error: unknown) {
      if (!isTmdbIdUniqueConflict(error)) throw error;

      const existing = await this.findByTmdbId(input.tmdbId);
      if (!existing) throw error;
      return { movie: existing, created: false };
    }
  }
}

export function createMovieRepository(prismaClient?: PrismaClient): IMovieRepository {
  return new PrismaMovieRepository(prismaClient);
}
