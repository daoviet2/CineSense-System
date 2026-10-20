import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/middlewares/errorHandler.js';
import { prisma } from '../../src/config/db.js';
import { ITmdbClient } from '../../src/modules/movie/tmdb.client.js';
import { MovieEventPublisher } from '../../src/modules/movie/movie.types.js';
import { TmdbMovieDetails, TmdbMoviePage } from '../../src/modules/movie/tmdb.types.js';

const detailPayload = (tmdbId: number): TmdbMovieDetails => ({
  id: tmdbId,
  title: `Movie ${tmdbId}`,
  overview: `Overview for movie ${tmdbId}`,
  poster_path: `/movie-${tmdbId}.jpg`,
  release_date: '2024-05-10',
  vote_average: 7.8,
  genres: [{ id: 28, name: 'Action' }],
});

const moviePage: TmdbMoviePage = {
  page: 1,
  results: [
    {
      id: 930001,
      title: 'List result',
      overview: 'List result overview',
      poster_path: null,
      release_date: '',
      vote_average: 7.2,
      genre_ids: [28],
    },
  ],
  total_pages: 4,
  total_results: 80,
};

function createFakeTmdbClient(): jest.Mocked<ITmdbClient> {
  return {
    getMovieDetails: jest.fn(async (tmdbId: number) => detailPayload(tmdbId)),
    getPopularMovies: jest.fn(async (_page: number) => moviePage),
    searchMovies: jest.fn(async (_query: string, _page: number) => moviePage),
    discoverMoviesByGenre: jest.fn(async (_genreId: number, _page: number) => moviePage),
    getGenres: jest.fn(async () => ({ genres: [{ id: 28, name: 'Action' }] })),
  } as jest.Mocked<ITmdbClient>;
}

function createTestApp(tmdbClient = createFakeTmdbClient()) {
  const eventPublisher: jest.Mocked<MovieEventPublisher> = {
    movieCached: jest.fn().mockResolvedValue(undefined),
  };
  return {
    app: createApp({ tmdbClient, eventPublisher }),
    tmdbClient,
    eventPublisher,
  };
}

async function expectNoUserBehaviorRows(): Promise<void> {
  expect(await prisma.userProfile.count()).toBe(0);
  expect(await prisma.watchHistory.count()).toBe(0);
  expect(await prisma.watchlist.count()).toBe(0);
  expect(await prisma.rating.count()).toBe(0);
}

describe('movie HTTP integration', () => {
  it('caches a detail on first request, then serves it from Postgres without another TMDB call', async () => {
    const { app, tmdbClient, eventPublisher } = createTestApp();

    const first = await request(app).get('/movies/930101');
    const second = await request(app).get('/movies/930101');

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      id: expect.any(String),
      tmdbId: 930101,
      title: 'Movie 930101',
      averageRating: 7.8,
      genres: [{ id: 28, name: 'Action' }],
    });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(1);
    expect(eventPublisher.movieCached).toHaveBeenCalledTimes(1);
    expect(await prisma.movie.count({ where: { tmdbId: 930101 } })).toBe(1);
    expect(await prisma.genre.count({ where: { id: 28 } })).toBe(1);
    expect(await prisma.movieGenre.count()).toBe(1);
    await expectNoUserBehaviorRows();
  });

  it('handles five concurrent detail requests with one database row and one publish event', async () => {
    const { app, tmdbClient, eventPublisher } = createTestApp();
    let detailRequests = 0;
    let releaseDetails!: () => void;
    const allDetailRequestsStarted = new Promise<void>((resolve) => {
      releaseDetails = resolve;
    });
    tmdbClient.getMovieDetails.mockImplementation(async (tmdbId: number) => {
      detailRequests += 1;
      if (detailRequests === 5) releaseDetails();
      await allDetailRequestsStarted;
      return detailPayload(tmdbId);
    });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).get('/movies/930102'))
    );

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200, 200, 200]);
    expect(new Set(responses.map(({ body }) => body.id)).size).toBe(1);
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(5);
    expect(eventPublisher.movieCached).toHaveBeenCalledTimes(1);
    expect(await prisma.movie.count({ where: { tmdbId: 930102 } })).toBe(1);
    expect(await prisma.movieGenre.count()).toBe(1);
    await expectNoUserBehaviorRows();
  });

  it('proxies popular, search, and genre list requests without writing movies', async () => {
    const { app, tmdbClient } = createTestApp();

    const popular = await request(app).get('/movies');
    const emptyQuery = await request(app).get('/movies?q=');
    const search = await request(app).get('/movies?q=matrix&page=2');
    const genre = await request(app).get('/movies?genreId=28&page=3');

    expect(popular.status).toBe(200);
    expect(popular.body).toMatchObject({ items: [expect.objectContaining({ tmdbId: 930001 })], page: 1 });
    expect(emptyQuery.status).toBe(200);
    expect(search.status).toBe(200);
    expect(genre.status).toBe(200);
    expect(tmdbClient.getPopularMovies).toHaveBeenCalledTimes(2);
    expect(tmdbClient.searchMovies).toHaveBeenCalledWith('matrix', 2);
    expect(tmdbClient.discoverMoviesByGenre).toHaveBeenCalledWith(28, 3);
    expect(await prisma.movie.count()).toBe(0);
    expect(await prisma.movieGenre.count()).toBe(0);
    await expectNoUserBehaviorRows();
  });

  it('syncs genres from TMDB once, then serves the database result', async () => {
    const { app, tmdbClient } = createTestApp();

    const first = await request(app).get('/genres');
    const second = await request(app).get('/genres');

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ items: [{ id: 28, name: 'Action' }] });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(tmdbClient.getGenres).toHaveBeenCalledTimes(1);
    expect(await prisma.genre.count()).toBe(1);
    await expectNoUserBehaviorRows();
  });

  it.each([
    [502, 'UPSTREAM_ERROR'],
    [504, 'UPSTREAM_TIMEOUT'],
  ])('returns the standard envelope and leaves no partial data on upstream %s', async (status, code) => {
    const tmdbClient = createFakeTmdbClient();
    tmdbClient.getMovieDetails.mockRejectedValueOnce(new AppError('Upstream unavailable', status, code));
    const { app } = createTestApp(tmdbClient);

    const response = await request(app).get('/movies/930103');

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error: { code, message: 'Upstream unavailable' } });
    expect(await prisma.movie.count({ where: { tmdbId: 930103 } })).toBe(0);
    expect(await prisma.genre.count()).toBe(0);
    expect(await prisma.movieGenre.count()).toBe(0);
    await expectNoUserBehaviorRows();
  });

  it('returns 404 from TMDB without leaving a cached row', async () => {
    const tmdbClient = createFakeTmdbClient();
    tmdbClient.getMovieDetails.mockRejectedValueOnce(new AppError('Movie resource not found', 404, 'NOT_FOUND'));
    const { app } = createTestApp(tmdbClient);

    const response = await request(app).get('/movies/930104');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(await prisma.movie.count({ where: { tmdbId: 930104 } })).toBe(0);
    expect(await prisma.genre.count()).toBe(0);
    expect(await prisma.movieGenre.count()).toBe(0);
    await expectNoUserBehaviorRows();
  });

  it('allows all movie and genre endpoints without a session cookie', async () => {
    const { app } = createTestApp();
    const list = await request(app).get('/movies');
    const detail = await request(app).get('/movies/930105');
    const genres = await request(app).get('/genres');

    expect(list.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(genres.status).toBe(200);
  });
});
