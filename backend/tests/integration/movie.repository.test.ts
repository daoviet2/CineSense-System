import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../src/config/db.js';
import { createGenreRepository } from '../../src/modules/movie/genre.repository.js';
import { createMovieRepository } from '../../src/modules/movie/movie.repository.js';
import { MovieCacheInput } from '../../src/modules/movie/movie.types.js';

const movieRepository = createMovieRepository(prisma);
const genreRepository = createGenreRepository(prisma);

function movieInput(tmdbId: number, genres = [{ id: 28, name: 'Action' }]): MovieCacheInput {
  return {
    tmdbId,
    title: `Movie ${tmdbId}`,
    overview: 'Repository integration test fixture',
    averageRating: 7.5,
    posterUrl: null,
    releaseDate: null,
    genres,
  };
}

describe('movie repository integration', () => {
  it('creates a movie and reads it back with its genres using public fields only', async () => {
    const input = movieInput(900001, [
      { id: 28, name: 'Action' },
      { id: 18, name: 'Drama' },
    ]);

    const result = await movieRepository.saveIfAbsent(input);
    const found = await movieRepository.findByTmdbId(input.tmdbId);

    expect(result.created).toBe(true);
    expect(result.movie).toEqual({
      id: expect.any(String),
      ...input,
      genres: [
        { id: 18, name: 'Drama' },
        { id: 28, name: 'Action' },
      ],
    });
    expect(found).toEqual(result.movie);
    expect(Object.keys(result.movie).sort()).toEqual(
      ['id', 'tmdbId', 'title', 'overview', 'averageRating', 'posterUrl', 'releaseDate', 'genres'].sort()
    );
  });

  it('returns the existing movie on a repeated save without creating duplicates', async () => {
    const input = movieInput(900002);
    const first = await movieRepository.saveIfAbsent(input);
    const second = await movieRepository.saveIfAbsent({ ...input, title: 'Ignored duplicate' });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.movie).toEqual(first.movie);
    expect(await prisma.movie.count({ where: { tmdbId: input.tmdbId } })).toBe(1);
  });

  it('handles five concurrent saves for one tmdbId with exactly one creation', async () => {
    const input = movieInput(900003);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => movieRepository.saveIfAbsent(input))
    );

    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(results.filter(({ created }) => !created)).toHaveLength(4);
    expect(new Set(results.map(({ movie }) => movie.id)).size).toBe(1);
    expect(await prisma.movie.count({ where: { tmdbId: input.tmdbId } })).toBe(1);
  });

  it('upserts shared genres in a batch and deduplicates repeated genre ids', async () => {
    await movieRepository.saveIfAbsent(movieInput(900004));
    await movieRepository.saveIfAbsent(
      movieInput(900005, [
        { id: 28, name: 'Action & Adventure' },
        { id: 28, name: 'Action & Adventure' },
      ])
    );

    expect(await prisma.genre.count({ where: { id: 28 } })).toBe(1);
    expect(await prisma.movieGenre.count({ where: { genreId: 28 } })).toBe(2);
    expect(await genreRepository.findAll()).toEqual([{ id: 28, name: 'Action & Adventure' }]);

    await genreRepository.upsertMany([
      { id: 18, name: 'Drama' },
      { id: 28, name: 'Action' },
    ]);
    expect(await genreRepository.findAll()).toEqual([
      { id: 18, name: 'Drama' },
      { id: 28, name: 'Action' },
    ]);
  });

  it('rolls back movie and genre writes when the join insert fails mid-transaction', async () => {
    const failingClient = new Proxy(prisma, {
      get(target, property, receiver) {
        if (property !== '$transaction') return Reflect.get(target, property, receiver);

        return (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          target.$transaction((tx) =>
            callback(
              new Proxy(tx, {
                get(transaction, transactionProperty, transactionReceiver) {
                  const delegate = Reflect.get(transaction, transactionProperty, transactionReceiver);
                  if (transactionProperty !== 'movieGenre') return delegate;

                  return new Proxy(delegate, {
                    get(movieGenre, operationName, movieGenreReceiver) {
                      const operation = Reflect.get(movieGenre, operationName, movieGenreReceiver);
                      if (operationName !== 'createMany') {
                        return typeof operation === 'function' ? operation.bind(movieGenre) : operation;
                      }
                      return async (args: Parameters<typeof operation>[0]) => {
                        await operation.call(movieGenre, args);
                        throw new Error('Injected failure after join rows are written');
                      };
                    },
                  });
                },
              }) as Prisma.TransactionClient
            )
          );
      },
    }) as PrismaClient;

    const input = movieInput(900006, [{ id: 99, name: 'Rollback Genre' }]);
    const repository = createMovieRepository(failingClient);

    await expect(repository.saveIfAbsent(input)).rejects.toThrow(
      'Injected failure after join rows are written'
    );
    expect(await prisma.movie.count({ where: { tmdbId: input.tmdbId } })).toBe(0);
    expect(await prisma.genre.count({ where: { id: 99 } })).toBe(0);
    expect(await prisma.movieGenre.count()).toBe(0);
  });

  it('returns null for an uncached tmdbId and supports an empty genre batch', async () => {
    expect(await movieRepository.findByTmdbId(900007)).toBeNull();
    await genreRepository.upsertMany([]);
    expect(await genreRepository.findAll()).toEqual([]);
  });
});
