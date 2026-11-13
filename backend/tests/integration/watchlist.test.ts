import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';
import { AppError } from '../../src/middlewares/errorHandler.js';
import { createActivityFixture, expectNoOutOfScopeWrites } from './activity.fixture.js';

afterEach(expectNoOutOfScopeWrites);

describe('watchlist HTTP integration', () => {
  it('adds an uncached movie once, reports status, and removes it idempotently', async () => {
    const { app, tmdbClient, activityPublisher, register } = createActivityFixture();
    const user = await register('watchlist-flow');

    const added = await request(app).post('/watchlist').set('Cookie', user.cookie).send({ tmdbId: 950001 });
    const duplicate = await request(app).post('/watchlist').set('Cookie', user.cookie).send({ tmdbId: 950001 });
    const statusBefore = await request(app).get('/watchlist/950001').set('Cookie', user.cookie);
    const list = await request(app).get('/watchlist').set('Cookie', user.cookie);
    const removed = await request(app).delete('/watchlist/950001').set('Cookie', user.cookie);
    const removedAgain = await request(app).delete('/watchlist/950001').set('Cookie', user.cookie);
    const statusAfter = await request(app).get('/watchlist/950001').set('Cookie', user.cookie);

    expect(added.status).toBe(201);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.item).toEqual(added.body.item);
    expect(added.body.item.movie).toMatchObject({ tmdbId: 950001, genreIds: [28] });
    expect(added.body.item).not.toHaveProperty('userId');
    expect(statusBefore.body).toEqual({ inWatchlist: true, addedAt: added.body.item.addedAt });
    expect(list.body).toMatchObject({ page: 1, totalPages: 1, totalResults: 1 });
    expect(list.body.items).toEqual([added.body.item]);
    expect(removed.status).toBe(204);
    expect(removedAgain.status).toBe(204);
    expect(statusAfter.body).toEqual({ inWatchlist: false, addedAt: null });
    expect(tmdbClient.getMovieDetails).toHaveBeenCalledTimes(1);
    expect(await prisma.watchlist.count()).toBe(0);
    expect(activityPublisher.activityRecorded).toHaveBeenCalledTimes(1);
    expect(activityPublisher.activityRecorded).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, type: 'WATCHLIST_ADDED', occurredAt: expect.any(Date) })
    );
  });

  it('handles five concurrent adds with one row and one activity event', async () => {
    const { app, activityPublisher, register } = createActivityFixture();
    const user = await register('watchlist-race');
    expect((await request(app).get('/movies/950002')).status).toBe(200);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post('/watchlist').set('Cookie', user.cookie).send({ tmdbId: 950002 })
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 200, 200, 201]);
    expect(await prisma.watchlist.count({ where: { userId: user.id } })).toBe(1);
    expect(activityPublisher.activityRecorded).toHaveBeenCalledTimes(1);
  });

  it('isolates users and returns paged items ordered by addedAt descending', async () => {
    const { app, register } = createActivityFixture();
    const userA = await register('watchlist-owner');
    const userB = await register('watchlist-other');
    const base = Date.parse('2026-11-10T00:00:00.000Z');
    await prisma.movie.createMany({
      data: Array.from({ length: 21 }, (_, index) => ({
        tmdbId: 950100 + index,
        title: `Paged movie ${index}`,
        overview: 'Test overview',
        averageRating: 7.5,
        posterUrl: null,
        releaseDate: null,
      })),
    });
    const movies = await prisma.movie.findMany({ orderBy: { tmdbId: 'asc' }, select: { id: true } });
    await prisma.watchlist.createMany({
      data: movies.map((movie, index) => ({
        userId: userA.id,
        movieId: movie.id,
        addedAt: new Date(base + index * 60_000),
      })),
    });
    await prisma.watchlist.create({ data: { userId: userB.id, movieId: movies[0].id } });

    const page1 = await request(app).get('/watchlist?page=1').set('Cookie', userA.cookie);
    const page2 = await request(app).get('/watchlist?page=2').set('Cookie', userA.cookie);
    const page3 = await request(app).get('/watchlist?page=3').set('Cookie', userA.cookie);
    const otherList = await request(app).get('/watchlist').set('Cookie', userB.cookie);
    const otherStatus = await request(app).get('/watchlist/950120').set('Cookie', userB.cookie);
    const otherDelete = await request(app).delete('/watchlist/950120').set('Cookie', userB.cookie);

    expect(page1.status).toBe(200);
    expect(page1.body).toMatchObject({ page: 1, totalPages: 2, totalResults: 21 });
    expect(page1.body.items).toHaveLength(20);
    expect(page1.body.items[0].movie.tmdbId).toBe(950120);
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.items[0].movie.tmdbId).toBe(950100);
    expect(page3.body.items).toEqual([]);
    expect(otherList.body.totalResults).toBe(1);
    expect(otherStatus.body).toEqual({ inWatchlist: false, addedAt: null });
    expect(otherDelete.status).toBe(204);
    expect(await prisma.watchlist.count({ where: { userId: userA.id } })).toBe(21);
    expect(JSON.stringify(page1.body)).not.toContain(userA.id);
  });

  it('checks status and deletes an uncached movie without a TMDB call or database write', async () => {
    const { app, tmdbClient, activityPublisher, register } = createActivityFixture();
    const user = await register('watchlist-uncached');

    const status = await request(app).get('/watchlist/950003').set('Cookie', user.cookie);
    const removed = await request(app).delete('/watchlist/950003').set('Cookie', user.cookie);

    expect(status.status).toBe(200);
    expect(status.body).toEqual({ inWatchlist: false, addedAt: null });
    expect(removed.status).toBe(204);
    expect(tmdbClient.getMovieDetails).not.toHaveBeenCalled();
    expect(await prisma.movie.count()).toBe(0);
    expect(await prisma.watchlist.count()).toBe(0);
    expect(activityPublisher.activityRecorded).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'NOT_FOUND'],
    [502, 'UPSTREAM_ERROR'],
    [504, 'UPSTREAM_TIMEOUT'],
  ])('returns %i %s without partial rows when TMDB fails', async (status, code) => {
    const { app, tmdbClient, activityPublisher, register } = createActivityFixture();
    const user = await register(`watchlist-error-${status}`);
    tmdbClient.getMovieDetails.mockRejectedValueOnce(new AppError('Movie unavailable', status, code));

    const response = await request(app).post('/watchlist').set('Cookie', user.cookie).send({ tmdbId: 950010 + status });

    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
    expect(await prisma.movie.count()).toBe(0);
    expect(await prisma.watchlist.count()).toBe(0);
    expect(activityPublisher.activityRecorded).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', (app: ReturnType<typeof createApp>) => request(app).post('/watchlist').send({ tmdbId: 950020 })],
    ['GET list', (app: ReturnType<typeof createApp>) => request(app).get('/watchlist')],
    ['GET status', (app: ReturnType<typeof createApp>) => request(app).get('/watchlist/950020')],
    ['DELETE', (app: ReturnType<typeof createApp>) => request(app).delete('/watchlist/950020')],
  ])('%s requires a cookie', async (_route, invoke) => {
    const { app } = createActivityFixture();
    const response = await invoke(app);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(await prisma.watchlist.count()).toBe(0);
  });
});
