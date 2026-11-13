import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { ITmdbClient } from '../../src/modules/movie/tmdb.client.js';
import { TmdbMovieDetails, TmdbMoviePage } from '../../src/modules/movie/tmdb.types.js';
import { UserActivityEventPublisher } from '../../src/modules/user/userActivity.events.js';

export function movieDetails(tmdbId: number): TmdbMovieDetails {
  return {
    id: tmdbId,
    title: `Activity movie ${tmdbId}`,
    overview: `Overview for ${tmdbId}`,
    poster_path: `/activity-${tmdbId}.jpg`,
    release_date: '2024-05-10',
    vote_average: 8.2,
    genres: [{ id: 28, name: 'Action' }],
  };
}

export function createActivityFixture() {
  const emptyPage: TmdbMoviePage = {
    page: 1,
    results: [],
    total_pages: 0,
    total_results: 0,
  };
  const tmdbClient: jest.Mocked<ITmdbClient> = {
    getMovieDetails: jest.fn(async (tmdbId) => movieDetails(tmdbId)),
    getPopularMovies: jest.fn(async (_page: number) => emptyPage),
    searchMovies: jest.fn(async (_query: string, _page: number) => emptyPage),
    discoverMoviesByGenre: jest.fn(async (_genreId: number, _page: number) => emptyPage),
    getGenres: jest.fn(async () => ({ genres: [{ id: 28, name: 'Action' }] })),
  };
  const activityPublisher: jest.Mocked<UserActivityEventPublisher> = {
    activityRecorded: jest.fn().mockResolvedValue(undefined),
  };
  const app = createApp({ tmdbClient, activityPublisher });

  async function register(label: string): Promise<{ id: string; cookie: string }> {
    const response = await request(app).post('/auth/register').send({
      name: `User ${label}`,
      email: `${label}@activity.test`,
      password: 'integration-password-123',
    });
    expect(response.status).toBe(201);
    const cookies = response.headers['set-cookie'];
    if (!Array.isArray(cookies)) throw new Error('Registration did not set an auth cookie');
    const cookie = cookies.find((value: string) => value.startsWith('access_token='));
    if (!cookie) throw new Error('Registration did not set an access_token cookie');
    return { id: response.body.user.id as string, cookie: cookie.split(';')[0] };
  }

  return { app, tmdbClient, activityPublisher, register };
}

export async function expectNoOutOfScopeWrites(): Promise<void> {
  expect(await prisma.userProfile.count()).toBe(0);
  expect(await prisma.rating.count()).toBe(0);
}
