import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { AppError } from '../../src/middlewares/errorHandler.js';
import { createActivityFixture, expectNoOutOfScopeWrites } from './activity.fixture.js';

afterEach(expectNoOutOfScopeWrites);

describe('history HTTP integration', () => {
  it('caches an uncached movie, records once, and deduplicates a repeat view', async () => {
    const { app, tmdbClient, activityPublisher, register } = createActivityFixture();
    const user = await register('history-cache');

    const first = await request(app).post('/history').set('Cookie', user.cookie).send({ tmdbId: 940001 });
    const repeated = await request(app).post('/history').set('Cookie', user.cookie).send({ tmdbId: 940001 });

    expect(first.status).toBe(201);
    expect(repeated.status).toBe(200);
    expect(repeated.body.entry.id).toBe(first.body.entry.id);
    expect(first.body.entry.movie).toMatchObject({ tmdbId: 940001, genreIds: [28] });
    expect(first.body.entry).not.toHaveProperty('userId');
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(1);
    expect(await prisma.movie.count({ where: { tmdbId: 940001 } })).toBe(1);
    expect(await prisma.watchHistory.count({ where: { userId: user.id } })).toBe(1);
    expect(activityPublisher.activityRecorded).toHaveBeenCalledTimes(1);
    expect(activityPublisher.activityRecorded).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, type: 'WATCHED', occurredAt: expect.any(Date) })
    );
  });

  it('handles five concurrent POST requests with one history row and one activity event', async () => {
    const { app, tmdbClient, activityPublisher, register } = createActivityFixture();
    const user = await register('history-race');
    expect((await request(app).get('/movies/940002')).status).toBe(200);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post('/history').set('Cookie', user.cookie).send({ tmdbId: 940002 })
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 200, 200, 201]);
    expect(new Set(responses.map((response) => response.body.entry.id)).size).toBe(1);
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(1);
    expect(await prisma.watchHistory.count({ where: { userId: user.id } })).toBe(1);
    expect(activityPublisher.activityRecorded).toHaveBeenCalledTimes(1);
  });

  it('lists history in pages and enforces ownership on list, delete, and clear', async () => {
    const { app, register } = createActivityFixture();
    const userA = await register('history-owner');
    const userB = await register('history-other');
    const detail = await request(app).get('/movies/940003');
    expect(detail.status).toBe(200);
    const movieId = detail.body.id as string;
    const base = Date.parse('2026-11-10T00:00:00.000Z');
    await prisma.watchHistory.createMany({
      data: Array.from({ length: 23 }, (_, index) => ({
        userId: userA.id,
        movieId,
        watchedAt: new Date(base + index * 60_000),
      })),
    });
    await prisma.watchHistory.create({
      data: { userId: userB.id, movieId, watchedAt: new Date(base) },
    });

    const page1 = await request(app).get('/history?page=1').set('Cookie', userA.cookie);
    const page2 = await request(app).get('/history?page=2').set('Cookie', userA.cookie);
    const page3 = await request(app).get('/history?page=3').set('Cookie', userA.cookie);
    const otherList = await request(app).get('/history').set('Cookie', userB.cookie);
    expect(page1.status).toBe(200);
    expect(page1.body).toMatchObject({ page: 1, totalPages: 2, totalResults: 23 });
    expect(page1.body.items).toHaveLength(20);
    expect(page1.body.items[0].watchedAt).toBe(new Date(base + 22 * 60_000).toISOString());
    expect(page1.body.items[0].movie.genreIds).toEqual([28]);
    expect(page2.body.items).toHaveLength(3);
    expect(page3.body.items).toEqual([]);
    expect(otherList.body.totalResults).toBe(1);
    expect(JSON.stringify(page1.body)).not.toContain(userA.id);

    const entryId = page1.body.items[0].id as string;
    const denied = await request(app).delete(`/history/${entryId}`).set('Cookie', userB.cookie);
    expect(denied.status).toBe(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');
    expect(await prisma.watchHistory.count({ where: { id: entryId, userId: userA.id } })).toBe(1);

    expect((await request(app).delete(`/history/${entryId}`).set('Cookie', userA.cookie)).status).toBe(204);
    expect((await request(app).delete('/history').set('Cookie', userA.cookie)).status).toBe(204);
    expect(await prisma.watchHistory.count({ where: { userId: userA.id } })).toBe(0);
    expect(await prisma.watchHistory.count({ where: { userId: userB.id } })).toBe(1);
  });

  it.each([
    [404, 'NOT_FOUND'],
    [502, 'UPSTREAM_ERROR'],
    [504, 'UPSTREAM_TIMEOUT'],
  ])('returns %i %s without partial rows when TMDB fails', async (status, code) => {
    const { app, tmdbClient, activityPublisher, register } = createActivityFixture();
    const user = await register(`history-error-${status}`);
    tmdbClient.getMovieDetails.mockRejectedValueOnce(new AppError('Movie unavailable', status, code));

    const response = await request(app).post('/history').set('Cookie', user.cookie).send({ tmdbId: 940010 + status });

    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
    expect(await prisma.movie.count()).toBe(0);
    expect(await prisma.watchHistory.count()).toBe(0);
    expect(activityPublisher.activityRecorded).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', (app: ReturnType<typeof createApp>) => request(app).post('/history').send({ tmdbId: 940020 })],
    ['GET', (app: ReturnType<typeof createApp>) => request(app).get('/history')],
    ['DELETE one', (app: ReturnType<typeof createApp>) => request(app).delete('/history/550e8400-e29b-41d4-a716-446655440000')],
    ['DELETE all', (app: ReturnType<typeof createApp>) => request(app).delete('/history')],
  ])('%s requires a cookie', async (_route, invoke) => {
    const { app } = createActivityFixture();
    const response = await invoke(app);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(await prisma.watchHistory.count()).toBe(0);
  });
});
