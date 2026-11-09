import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/middlewares/errorHandler.js';
import { createActivityWriteRateLimiter } from '../../src/middlewares/rateLimiter.js';
import { IHistoryService } from '../../src/modules/history/history.service.js';
import {
  HistoryEntryDto,
  RecordHistoryResult,
} from '../../src/modules/history/history.types.js';
import { MovieSummaryDto, PagedResult } from '../../src/modules/movie/movie.types.js';
import { signAccessToken } from '../../src/utils/jwt.js';

const mockMovieSummary: MovieSummaryDto = {
  tmdbId: 603,
  title: 'The Matrix',
  posterUrl: 'https://image.tmdb.org/t/p/w500/matrix.jpg',
  releaseDate: '1999-03-31',
  averageRating: 8.7,
  genreIds: [28, 878],
};

const mockHistoryEntry: HistoryEntryDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  watchedAt: new Date('2026-10-20T10:00:00.000Z'),
  movie: mockMovieSummary,
};

const USER_ID = 'test-user-uuid-1234';

function authCookie(userId = USER_ID): string {
  const token = signAccessToken(userId);
  return `access_token=${token}`;
}

function buildTestApp(customRateLimitMax = 60) {
  const historyService: jest.Mocked<IHistoryService> = {
    recordView: jest.fn(),
    listHistory: jest.fn(),
    deleteEntry: jest.fn(),
    clearHistory: jest.fn(),
  };

  const app = createApp({
    historyService,
    activityWriteRateLimiter: createActivityWriteRateLimiter(customRateLimitMax),
  });

  return { app, historyService };
}

describe('History HTTP routes (/history)', () => {
  // ── 1. Authentication enforcement (requireAuth) ──────────────────────────
  describe('Authentication enforcement', () => {
    it.each([
      ['POST /history', (app: any) => request(app).post('/history').send({ tmdbId: 603 })],
      ['GET /history', (app: any) => request(app).get('/history')],
      [
        'DELETE /history/:id',
        (app: any) => request(app).delete('/history/550e8400-e29b-41d4-a716-446655440000'),
      ],
      ['DELETE /history', (app: any) => request(app).delete('/history')],
    ])('%s returns 401 UNAUTHORIZED when no cookie is provided', async (_name, callRoute) => {
      const { app, historyService } = buildTestApp();
      const res = await callRoute(app);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(historyService.recordView).not.toHaveBeenCalled();
      expect(historyService.listHistory).not.toHaveBeenCalled();
      expect(historyService.deleteEntry).not.toHaveBeenCalled();
      expect(historyService.clearHistory).not.toHaveBeenCalled();
    });
  });

  // ── 2. POST /history ─────────────────────────────────────────────────────
  describe('POST /history', () => {
    it('returns 201 with { entry } when newly created (created: true)', async () => {
      const { app, historyService } = buildTestApp();
      const serviceResult: RecordHistoryResult = {
        entry: mockHistoryEntry,
        created: true,
      };
      historyService.recordView.mockResolvedValueOnce(serviceResult);

      const res = await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send({ tmdbId: 603 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        entry: {
          id: mockHistoryEntry.id,
          watchedAt: mockHistoryEntry.watchedAt.toISOString(),
          movie: mockMovieSummary,
        },
      });
      expect(historyService.recordView).toHaveBeenCalledWith(USER_ID, 603);
    });

    it('returns 200 with { entry } when duplicate within dedupe window (created: false)', async () => {
      const { app, historyService } = buildTestApp();
      const serviceResult: RecordHistoryResult = {
        entry: mockHistoryEntry,
        created: false,
      };
      historyService.recordView.mockResolvedValueOnce(serviceResult);

      const res = await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send({ tmdbId: 603 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        entry: {
          id: mockHistoryEntry.id,
          watchedAt: mockHistoryEntry.watchedAt.toISOString(),
          movie: mockMovieSummary,
        },
      });
      expect(historyService.recordView).toHaveBeenCalledWith(USER_ID, 603);
    });

    it('response payload contains NO userId (Decisions D9, D30)', async () => {
      const { app, historyService } = buildTestApp();
      historyService.recordView.mockResolvedValueOnce({
        entry: mockHistoryEntry,
        created: true,
      });

      const res = await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send({ tmdbId: 603 });

      expect(res.status).toBe(201);
      expect(res.body.entry).not.toHaveProperty('userId');
      expect(JSON.stringify(res.body)).not.toContain(USER_ID);
    });

    it.each([
      ['non-numeric tmdbId (abc)', { tmdbId: 'abc' }],
      ['zero tmdbId (0)', { tmdbId: 0 }],
      ['negative tmdbId (-1)', { tmdbId: -1 }],
      ['missing tmdbId ({})', {}],
      ['tmdbId exceeding integer max', { tmdbId: 3_000_000_000 }],
    ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
      const { app, historyService } = buildTestApp();

      const res = await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
      });
      expect(historyService.recordView).not.toHaveBeenCalled();
    });

    it('propagates upstream and not-found AppErrors from service unchanged', async () => {
      const { app, historyService } = buildTestApp();
      historyService.recordView.mockRejectedValueOnce(
        new AppError('Movie not found on TMDB', 404, 'NOT_FOUND')
      );

      const res = await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send({ tmdbId: 999999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Movie not found on TMDB',
      });
    });
  });

  // ── 3. GET /history ──────────────────────────────────────────────────────
  describe('GET /history', () => {
    it('returns 200 with paged history results and defaults page to 1', async () => {
      const { app, historyService } = buildTestApp();
      const pagedResult: PagedResult<HistoryEntryDto> = {
        items: [mockHistoryEntry],
        page: 1,
        totalPages: 5,
        totalResults: 95,
      };
      historyService.listHistory.mockResolvedValueOnce(pagedResult);

      const res = await request(app)
        .get('/history')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [
          {
            id: mockHistoryEntry.id,
            watchedAt: mockHistoryEntry.watchedAt.toISOString(),
            movie: mockMovieSummary,
          },
        ],
        page: 1,
        totalPages: 5,
        totalResults: 95,
      });
      expect(historyService.listHistory).toHaveBeenCalledWith(USER_ID, 1);
      expect(JSON.stringify(res.body)).not.toContain(USER_ID);
    });

    it('passes explicit page query parameter to service', async () => {
      const { app, historyService } = buildTestApp();
      historyService.listHistory.mockResolvedValueOnce({
        items: [],
        page: 3,
        totalPages: 5,
        totalResults: 95,
      });

      const res = await request(app)
        .get('/history?page=3')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(historyService.listHistory).toHaveBeenCalledWith(USER_ID, 3);
    });

    it.each([
      ['page=0', '/history?page=0'],
      ['page=-1', '/history?page=-1'],
      ['non-numeric page', '/history?page=abc'],
    ])('returns 400 VALIDATION_ERROR for invalid query %s', async (_label, path) => {
      const { app, historyService } = buildTestApp();

      const res = await request(app)
        .get(path)
        .set('Cookie', authCookie());

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
      });
      expect(historyService.listHistory).not.toHaveBeenCalled();
    });
  });

  // ── 4. DELETE /history/:id ───────────────────────────────────────────────
  describe('DELETE /history/:id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('returns 204 on successful deletion', async () => {
      const { app, historyService } = buildTestApp();
      historyService.deleteEntry.mockResolvedValueOnce();

      const res = await request(app)
        .delete(`/history/${validUuid}`)
        .set('Cookie', authCookie());

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(historyService.deleteEntry).toHaveBeenCalledWith(USER_ID, validUuid);
    });

    it('returns 400 VALIDATION_ERROR for non-UUID entry id', async () => {
      const { app, historyService } = buildTestApp();

      const res = await request(app)
        .delete('/history/not-a-valid-uuid')
        .set('Cookie', authCookie());

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
      });
      expect(historyService.deleteEntry).not.toHaveBeenCalled();
    });

    it('returns 404 NOT_FOUND when entry does not belong to user or does not exist (IDOR protection D30)', async () => {
      const { app, historyService } = buildTestApp();
      historyService.deleteEntry.mockRejectedValueOnce(
        new AppError('History entry not found', 404, 'NOT_FOUND')
      );

      const res = await request(app)
        .delete(`/history/${validUuid}`)
        .set('Cookie', authCookie());

      expect(res.status).toBe(404);
      expect(res.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'History entry not found',
      });
    });
  });

  // ── 5. DELETE /history ───────────────────────────────────────────────────
  describe('DELETE /history', () => {
    it('returns 204 on clearing user history', async () => {
      const { app, historyService } = buildTestApp();
      historyService.clearHistory.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/history')
        .set('Cookie', authCookie());

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(historyService.clearHistory).toHaveBeenCalledWith(USER_ID);
    });
  });

  // ── 6. Rate Limiting on POST /history (Decision D34) ──────────────────────
  describe('Rate Limiting (POST /history)', () => {
    it('returns 429 TOO_MANY_REQUESTS with D3 envelope when exceeding write limit', async () => {
      const writeLimit = 3;
      const { app, historyService } = buildTestApp(writeLimit);
      historyService.recordView.mockResolvedValue({
        entry: mockHistoryEntry,
        created: true,
      });

      for (let i = 0; i < writeLimit; i++) {
        const okRes = await request(app)
          .post('/history')
          .set('Cookie', authCookie())
          .send({ tmdbId: 603 });
        expect(okRes.status).toBe(201);
      }

      // Exceeded limit call
      const rateLimitedRes = await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send({ tmdbId: 603 });

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error).toMatchObject({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
      });
    });

    it('GET /history is NOT blocked by the write rate limiter', async () => {
      const writeLimit = 1;
      const { app, historyService } = buildTestApp(writeLimit);
      historyService.recordView.mockResolvedValue({
        entry: mockHistoryEntry,
        created: true,
      });
      historyService.listHistory.mockResolvedValue({
        items: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
      });

      // Exhaust write limit
      await request(app)
        .post('/history')
        .set('Cookie', authCookie())
        .send({ tmdbId: 603 });

      // GET /history should still succeed (200)
      const getRes = await request(app)
        .get('/history')
        .set('Cookie', authCookie());

      expect(getRes.status).toBe(200);
      expect(historyService.listHistory).toHaveBeenCalled();
    });
  });
});
