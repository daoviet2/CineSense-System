import { AppError } from '../../src/middlewares/errorHandler.js';
import { IGenreRepository } from '../../src/modules/movie/genre.repository.js';
import { IMovieRepository } from '../../src/modules/movie/movie.repository.js';
import { createMovieService } from '../../src/modules/movie/movie.service.js';
import { MovieEventPublisher, MovieWithGenres } from '../../src/modules/movie/movie.types.js';
import { ITmdbClient } from '../../src/modules/movie/tmdb.client.js';
import { TmdbGenreList, TmdbMovieDetails, TmdbMoviePage } from '../../src/modules/movie/tmdb.types.js';

const movie: MovieWithGenres = {
  id: 'movie-uuid',
  tmdbId: 603,
  title: 'The Matrix',
  overview: 'A computer hacker learns the truth.',
  averageRating: 8.7,
  posterUrl: 'https://image.tmdb.org/t/p/w500/matrix.jpg',
  releaseDate: new Date('1999-03-31T00:00:00.000Z'),
  genres: [{ id: 28, name: 'Action' }],
};

const details = (overrides: Partial<TmdbMovieDetails> = {}): TmdbMovieDetails => ({
  id: 603,
  title: 'The Matrix',
  overview: 'A computer hacker learns the truth.',
  poster_path: '/matrix.jpg',
  release_date: '1999-03-31',
  vote_average: 8.7,
  genres: [{ id: 28, name: 'Action' }],
  ...overrides,
});

const moviePage = (overrides: Partial<TmdbMoviePage> = {}): TmdbMoviePage => ({
  page: 1,
  results: [
    {
      id: 603,
      title: 'The Matrix',
      overview: 'A computer hacker learns the truth.',
      poster_path: '/matrix.jpg',
      release_date: '1999-03-31',
      vote_average: 8.7,
      genre_ids: [28],
    },
  ],
  total_pages: 600,
  total_results: 12000,
  ...overrides,
});

function setup(options: {
  cached?: MovieWithGenres | null;
  created?: boolean;
  overview?: string | null;
  fallbackOverview?: string | null;
  storedGenres?: Array<{ id: number; name: string }>;
} = {}) {
  const cached = options.cached ?? null;
  const movieRepo: jest.Mocked<IMovieRepository> = {
    findByTmdbId: jest.fn().mockResolvedValue(cached),
    saveIfAbsent: jest.fn().mockResolvedValue({ movie, created: options.created ?? true }),
  };
  const genreRepo: jest.Mocked<IGenreRepository> = {
    findAll: jest.fn().mockResolvedValue(options.storedGenres ?? []),
    upsertMany: jest.fn().mockResolvedValue(undefined),
  };
  const tmdbClient: jest.Mocked<ITmdbClient> = {
    getMovieDetails: jest
      .fn()
      .mockResolvedValueOnce(
        details({ overview: options.overview === undefined ? 'A computer hacker learns the truth.' : options.overview })
      )
      .mockResolvedValue(
        details({ overview: options.fallbackOverview === undefined ? 'An alternate description.' : options.fallbackOverview })
      ),
    getPopularMovies: jest.fn().mockResolvedValue(moviePage()),
    searchMovies: jest.fn().mockResolvedValue(moviePage()),
    discoverMoviesByGenre: jest.fn().mockResolvedValue(moviePage()),
    getGenres: jest.fn().mockResolvedValue({ genres: [{ id: 28, name: 'Action' }] } satisfies TmdbGenreList),
  };
  const eventPublisher: jest.Mocked<MovieEventPublisher> = {
    movieCached: jest.fn().mockResolvedValue(undefined),
  };
  const service = createMovieService({
    tmdbClient,
    movieRepo,
    genreRepo,
    eventPublisher,
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    language: 'vi-VN',
  });

  return { service, movieRepo, genreRepo, tmdbClient, eventPublisher };
}

describe('MovieService', () => {
  it('returns a cached detail without calling TMDB or publishing', async () => {
    const { service, tmdbClient, eventPublisher } = setup({ cached: movie });

    await expect(service.getMovieDetail(603)).resolves.toEqual({
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      overview: movie.overview,
      averageRating: movie.averageRating,
      posterUrl: movie.posterUrl,
      releaseDate: '1999-03-31',
      genres: movie.genres,
    });
    expect(tmdbClient.getMovieDetails).not.toHaveBeenCalled();
    expect(eventPublisher.movieCached).not.toHaveBeenCalled();
  });

  it('fetches and saves a miss, then publishes exactly once when newly created', async () => {
    const { service, movieRepo, tmdbClient, eventPublisher } = setup();

    await service.getMovieDetail(603);

    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(1);
    expect(movieRepo.saveIfAbsent).toHaveBeenCalledWith(expect.objectContaining({ tmdbId: 603 }));
    expect(eventPublisher.movieCached).toHaveBeenCalledTimes(1);
    expect(eventPublisher.movieCached).toHaveBeenCalledWith(expect.objectContaining({ id: 'movie-uuid' }));
  });

  it('does not publish when saveIfAbsent reports a concurrent winner', async () => {
    const { service, eventPublisher } = setup({ created: false });
    await service.getMovieDetail(603);
    expect(eventPublisher.movieCached).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', ''],
    ['null', null],
  ] as const)('uses en-US overview fallback when localized overview is %s', async (_label, overview) => {
    const { service, movieRepo, tmdbClient } = setup({ overview, fallbackOverview: 'English overview' });
    await service.getMovieDetail(603);
    expect(tmdbClient.getMovieDetails).toHaveBeenNthCalledWith(1, 603);
    expect(tmdbClient.getMovieDetails).toHaveBeenNthCalledWith(2, 603, 'en-US');
    expect(movieRepo.saveIfAbsent).toHaveBeenCalledWith(expect.objectContaining({ overview: 'English overview' }));
  });

  it('keeps an empty overview if both localized and fallback values are empty', async () => {
    const { service, movieRepo, tmdbClient } = setup({ overview: '', fallbackOverview: '' });
    await service.getMovieDetail(603);
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(2);
    expect(movieRepo.saveIfAbsent).toHaveBeenCalledWith(expect.objectContaining({ overview: '' }));
  });

  it('does not request fallback when configured language is en-US', async () => {
    const { tmdbClient, movieRepo } = setup({ overview: '' });
    const service = createMovieService({
      tmdbClient,
      movieRepo,
      genreRepo: { findAll: jest.fn(), upsertMany: jest.fn() },
      imageBaseUrl: 'https://image.tmdb.org/t/p',
      language: 'en-US',
    });
    await service.getMovieDetail(603);
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(1);
  });

  it('propagates upstream detail errors without saving', async () => {
    const { service, tmdbClient, movieRepo } = setup();
    tmdbClient.getMovieDetails.mockReset().mockRejectedValue(new AppError('upstream', 502, 'UPSTREAM_ERROR'));
    await expect(service.getMovieDetail(603)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
    expect(movieRepo.saveIfAbsent).not.toHaveBeenCalled();
  });

  it('keeps the response available and logs a safe message when publisher fails', async () => {
    const { service, eventPublisher } = setup();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    eventPublisher.movieCached.mockRejectedValueOnce(new Error('private publisher detail'));
    await expect(service.getMovieDetail(603)).resolves.toMatchObject({ tmdbId: 603 });
    expect(errorSpy).toHaveBeenCalledWith('Movie cache event publishing failed');
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('private publisher detail'));
    errorSpy.mockRestore();
  });

  it('routes list requests to popular, search, or genre discovery without writing to DB', async () => {
    const { service, tmdbClient, movieRepo } = setup();
    await service.listMovies({ page: 2 });
    await service.listMovies({ page: 3, q: ' matrix ' });
    await service.listMovies({ page: 4, genreId: 28 });
    expect(tmdbClient.getPopularMovies).toHaveBeenCalledWith(2);
    expect(tmdbClient.searchMovies).toHaveBeenCalledWith('matrix', 3);
    expect(tmdbClient.discoverMoviesByGenre).toHaveBeenCalledWith(28, 4);
    expect(movieRepo.saveIfAbsent).not.toHaveBeenCalled();
  });

  it('treats an empty search as popular and caps total pages at the configured limit', async () => {
    const { service, tmdbClient } = setup();
    await expect(service.listMovies({ page: 1, q: '  ' })).resolves.toMatchObject({ totalPages: 500 });
    expect(tmdbClient.getPopularMovies).toHaveBeenCalledWith(1);
    expect(tmdbClient.searchMovies).not.toHaveBeenCalled();
  });

  it('rejects combined search and genre filters', async () => {
    const { service, tmdbClient } = setup();
    await expect(service.listMovies({ page: 1, q: 'matrix', genreId: 28 })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(tmdbClient.searchMovies).not.toHaveBeenCalled();
    expect(tmdbClient.discoverMoviesByGenre).not.toHaveBeenCalled();
  });

  it('returns stored genres without calling TMDB', async () => {
    const storedGenres = [{ id: 28, name: 'Action' }];
    const { service, tmdbClient, genreRepo } = setup({ storedGenres });
    await expect(service.listGenres()).resolves.toEqual(storedGenres);
    expect(tmdbClient.getGenres).not.toHaveBeenCalled();
    expect(genreRepo.upsertMany).not.toHaveBeenCalled();
  });

  it('synchronizes and returns TMDB genres when the database is empty', async () => {
    const { service, tmdbClient, genreRepo } = setup();
    await expect(service.listGenres()).resolves.toEqual([{ id: 28, name: 'Action' }]);
    expect(tmdbClient.getGenres).toHaveBeenCalledTimes(1);
    expect(genreRepo.upsertMany).toHaveBeenCalledWith([{ id: 28, name: 'Action' }]);
  });
});
