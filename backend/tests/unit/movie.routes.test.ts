import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/middlewares/errorHandler.js';
import { createMoviesRateLimiter } from '../../src/middlewares/rateLimiter.js';
import { IMovieService } from '../../src/modules/movie/movie.service.js';
import { MovieDetailDto, MovieSummaryDto } from '../../src/modules/movie/movie.types.js';

const summary: MovieSummaryDto = {
  tmdbId: 603,
  title: 'The Matrix',
  posterUrl: 'https://image.tmdb.org/t/p/w500/matrix.jpg',
  releaseDate: '1999-03-31',
  averageRating: 8.7,
  genreIds: [28],
};

const detail: MovieDetailDto = {
  id: 'movie-uuid',
  ...summary,
  overview: 'A computer hacker learns the truth.',
  genres: [{ id: 28, name: 'Action' }],
};

function buildApp(maxRequests = 300) {
  const movieService: jest.Mocked<IMovieService> = {
    getMovieDetail: jest.fn().mockResolvedValue(detail),
    listMovies: jest.fn().mockResolvedValue({
      items: [summary],
      page: 1,
      totalPages: 20,
      totalResults: 400,
    }),
    listGenres: jest.fn().mockResolvedValue([{ id: 28, name: 'Action' }]),
  };

  return {
    app: createApp({ movieService, moviesRateLimiter: createMoviesRateLimiter(maxRequests) }),
    movieService,
  };
}

describe('movie HTTP routes', () => {
  it('GET /movies returns the service page DTO and defaults page to 1 without auth', async () => {
    const { app, movieService } = buildApp();
    const response = await request(app).get('/movies');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [summary],
      page: 1,
      totalPages: 20,
      totalResults: 400,
    });
    expect(movieService.listMovies).toHaveBeenCalledWith({ page: 1 });
  });

  it.each([
    ['page=0', '/movies?page=0'],
    ['page above TMDB limit', '/movies?page=501'],
    ['non-numeric page', '/movies?page=abc'],
    ['combined q and genreId', '/movies?q=a&genreId=28'],
  ])('returns a D3 validation envelope for %s', async (_label, path) => {
    const { app, movieService } = buildApp();
    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(movieService.listMovies).not.toHaveBeenCalled();
  });

  it('trims a search query and accepts an empty query as absent', async () => {
    const { app, movieService } = buildApp();
    const searched = await request(app).get('/movies?page=2&q=%20matrix%20');
    const empty = await request(app).get('/movies?q=%20%20');

    expect(searched.status).toBe(200);
    expect(movieService.listMovies).toHaveBeenNthCalledWith(1, { page: 2, q: 'matrix' });
    expect(empty.status).toBe(200);
    expect(movieService.listMovies).toHaveBeenNthCalledWith(2, { page: 1 });
  });

  it('GET /movies/:tmdbId returns a public detail DTO without TMDB raw fields', async () => {
    const { app, movieService } = buildApp();
    const response = await request(app).get('/movies/603');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(detail);
    expect(response.body).not.toHaveProperty('genre_ids');
    expect(response.body).not.toHaveProperty('poster_path');
    expect(movieService.getMovieDetail).toHaveBeenCalledWith(603);
  });

  it.each(['/movies/abc', '/movies/0', '/movies/-1'])('validates movie id in %s', async (path) => {
    const { app, movieService } = buildApp();
    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(movieService.getMovieDetail).not.toHaveBeenCalled();
  });

  it('GET /genres returns the genre DTO collection without auth', async () => {
    const { app, movieService } = buildApp();
    const response = await request(app).get('/genres');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ id: 28, name: 'Action' }] });
    expect(movieService.listGenres).toHaveBeenCalledTimes(1);
  });

  it.each([
    [404, 'NOT_FOUND'],
    [502, 'UPSTREAM_ERROR'],
    [504, 'UPSTREAM_TIMEOUT'],
  ])('passes service status %s and code %s through the standard error envelope', async (status, code) => {
    const { app, movieService } = buildApp();
    movieService.getMovieDetail.mockRejectedValueOnce(
      new AppError('safe message', status, code)
    );

    const response = await request(app).get('/movies/603');
    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      error: { code, message: 'safe message' },
    });
  });

  it('returns a D3 429 envelope when the movies limiter is exceeded', async () => {
    const { app, movieService } = buildApp(1);
    const first = await request(app).get('/movies');
    const second = await request(app).get('/genres');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
      },
    });
    expect(movieService.listGenres).not.toHaveBeenCalled();
  });
});
