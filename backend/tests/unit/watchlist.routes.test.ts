import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createActivityWriteRateLimiter } from '../../src/middlewares/rateLimiter.js';
import { IWatchlistService } from '../../src/modules/watchlist/watchlist.service.js';
import { WatchlistItemDto } from '../../src/modules/watchlist/watchlist.types.js';
import { signAccessToken } from '../../src/utils/jwt.js';

const USER_ID = 'watchlist-route-user';
const OTHER_USER_ID = 'other-user';
const cookie = (userId = USER_ID) => `access_token=${signAccessToken(userId)}`;
const item: WatchlistItemDto = {
  addedAt: new Date('2026-11-01T10:00:00.000Z'),
  movie: {
    tmdbId: 603,
    title: 'The Matrix',
    posterUrl: null,
    releaseDate: '1999-03-31',
    averageRating: 8.7,
    genreIds: [28, 878],
  },
};

function setup(writeLimit = 10) {
  const watchlistService: jest.Mocked<IWatchlistService> = {
    addToWatchlist: jest.fn(),
    removeFromWatchlist: jest.fn(),
    getWatchlistStatus: jest.fn(),
    listWatchlist: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    getStatus: jest.fn(),
    list: jest.fn(),
  };
  const app = createApp({
    watchlistService,
    watchlistWriteRateLimiter: createActivityWriteRateLimiter(writeLimit),
  });
  return { app, watchlistService };
}

describe('Watchlist HTTP routes', () => {
  it.each([
    ['POST', (app: ReturnType<typeof createApp>) => request(app).post('/watchlist').send({ tmdbId: 603 })],
    ['GET list', (app: ReturnType<typeof createApp>) => request(app).get('/watchlist')],
    ['GET status', (app: ReturnType<typeof createApp>) => request(app).get('/watchlist/603')],
    ['DELETE', (app: ReturnType<typeof createApp>) => request(app).delete('/watchlist/603')],
  ])('%s requires authentication', async (_route, invoke) => {
    const { app, watchlistService } = setup();
    const response = await invoke(app);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(watchlistService.add).not.toHaveBeenCalled();
    expect(watchlistService.list).not.toHaveBeenCalled();
    expect(watchlistService.getStatus).not.toHaveBeenCalled();
    expect(watchlistService.remove).not.toHaveBeenCalled();
  });

  it.each([
    [true, 201],
    [false, 200],
  ])('POST created=%s returns %i and a public item', async (created, expectedStatus) => {
    const { app, watchlistService } = setup();
    watchlistService.add.mockResolvedValue({ item, created });
    const response = await request(app).post('/watchlist').set('Cookie', cookie()).send({ tmdbId: 603, userId: OTHER_USER_ID });
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual({
      item: { addedAt: item.addedAt.toISOString(), movie: item.movie },
    });
    expect(JSON.stringify(response.body)).not.toContain(USER_ID);
    expect(response.body.item).not.toHaveProperty('userId');
    expect(watchlistService.add).toHaveBeenCalledWith(USER_ID, 603);
  });

  it('uses the authenticated user for list, status, and delete', async () => {
    const { app, watchlistService } = setup();
    watchlistService.list.mockResolvedValue({ items: [item], page: 2, totalPages: 2, totalResults: 21 });
    watchlistService.getStatus.mockResolvedValue({ inWatchlist: true, addedAt: item.addedAt });
    watchlistService.remove.mockResolvedValue();

    const list = await request(app).get('/watchlist?page=2').set('Cookie', cookie(OTHER_USER_ID));
    expect(list.status).toBe(200);
    expect(list.body).toEqual({
      items: [{ addedAt: item.addedAt.toISOString(), movie: item.movie }],
      page: 2,
      totalPages: 2,
      totalResults: 21,
    });
    expect(JSON.stringify(list.body)).not.toContain(OTHER_USER_ID);
    expect(watchlistService.list).toHaveBeenCalledWith(OTHER_USER_ID, 2);

    const status = await request(app).get('/watchlist/603').set('Cookie', cookie(OTHER_USER_ID));
    expect(status.status).toBe(200);
    expect(status.body).toEqual({ inWatchlist: true, addedAt: item.addedAt.toISOString() });
    expect(watchlistService.getStatus).toHaveBeenCalledWith(OTHER_USER_ID, 603);

    const removed = await request(app).delete('/watchlist/603').set('Cookie', cookie(OTHER_USER_ID));
    expect(removed.status).toBe(204);
    expect(removed.text).toBe('');
    expect(watchlistService.remove).toHaveBeenCalledWith(OTHER_USER_ID, 603);
  });

  it('defaults list page to 1 and returns absent status', async () => {
    const { app, watchlistService } = setup();
    watchlistService.list.mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 });
    watchlistService.getStatus.mockResolvedValue({ inWatchlist: false, addedAt: null });
    const list = await request(app).get('/watchlist').set('Cookie', cookie());
    const status = await request(app).get('/watchlist/603').set('Cookie', cookie());
    expect(list.status).toBe(200);
    expect(watchlistService.list).toHaveBeenCalledWith(USER_ID, 1);
    expect(status.body).toEqual({ inWatchlist: false, addedAt: null });
  });

  it.each([
    ['POST missing', 'post', '/watchlist', {}],
    ['POST zero', 'post', '/watchlist', { tmdbId: 0 }],
    ['POST string', 'post', '/watchlist', { tmdbId: '603' }],
    ['POST too large', 'post', '/watchlist', { tmdbId: 3_000_000_000 }],
    ['GET page zero', 'get', '/watchlist?page=0', undefined],
    ['GET bad page', 'get', '/watchlist?page=abc', undefined],
    ['GET bad ID', 'get', '/watchlist/abc', undefined],
    ['DELETE zero ID', 'delete', '/watchlist/0', undefined],
  ] as const)('%s returns 400 before calling service', async (_label, method, path, body) => {
    const { app, watchlistService } = setup();
    const operation = request(app)[method](path).set('Cookie', cookie());
    const response = await (body === undefined ? operation : operation.send(body));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(watchlistService.add).not.toHaveBeenCalled();
    expect(watchlistService.list).not.toHaveBeenCalled();
    expect(watchlistService.getStatus).not.toHaveBeenCalled();
    expect(watchlistService.remove).not.toHaveBeenCalled();
  });

  it('limits POST only and returns the D3 error envelope', async () => {
    const { app, watchlistService } = setup(1);
    watchlistService.add.mockResolvedValue({ item, created: true });
    watchlistService.list.mockResolvedValue({ items: [], page: 1, totalPages: 0, totalResults: 0 });
    const first = await request(app).post('/watchlist').set('Cookie', cookie()).send({ tmdbId: 603 });
    const second = await request(app).post('/watchlist').set('Cookie', cookie()).send({ tmdbId: 603 });
    const read = await request(app).get('/watchlist').set('Cookie', cookie());
    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({ error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' } });
    expect(read.status).toBe(200);
    expect(watchlistService.add).toHaveBeenCalledTimes(1);
  });
});
