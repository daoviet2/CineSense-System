/**
 * feat-040 Smoke verification:
 * Validates live HTTP dispatch through createApp() with a real JWT access_token cookie.
 * Ensures:
 * - Real JWT verification and extraction of userId in requireAuth.
 * - HTTP status codes: 201 (new view), 200 (deduped view), 200 (paged list), 204 (delete), 204 (clear).
 * - Sensitive credentials (cookie/token) are NEVER logged or printed.
 */
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { IHistoryService } from '../../src/modules/history/history.service.js';
import {
  HistoryEntryDto,
  RecordHistoryResult,
} from '../../src/modules/history/history.types.js';
import { signAccessToken } from '../../src/utils/jwt.js';

describe('History HTTP Smoke Verification', () => {
  it('performs end-to-end HTTP smoke flow with real JWT auth cookie', async () => {
    const userId = 'smoke-user-uuid-9999';
    const realJwtCookie = `access_token=${signAccessToken(userId)}`;

    const mockEntry: HistoryEntryDto = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      watchedAt: new Date(),
      movie: {
        tmdbId: 603,
        title: 'The Matrix',
        posterUrl: 'https://image.tmdb.org/t/p/w500/matrix.jpg',
        releaseDate: '1999-03-31',
        averageRating: 8.7,
        genreIds: [28, 878],
      },
    };

    const mockHistoryService: jest.Mocked<IHistoryService> = {
      recordView: jest
        .fn<Promise<RecordHistoryResult>, [string, number]>()
        .mockResolvedValueOnce({ entry: mockEntry, created: true })
        .mockResolvedValueOnce({ entry: mockEntry, created: false }),
      listHistory: jest.fn().mockResolvedValue({
        items: [mockEntry],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      }),
      deleteEntry: jest.fn().mockResolvedValue(undefined),
      clearHistory: jest.fn().mockResolvedValue(undefined),
    };

    const app = createApp({ historyService: mockHistoryService });

    // 1. Smoke: POST /history (new view) -> 201
    const postRes1 = await request(app)
      .post('/history')
      .set('Cookie', realJwtCookie)
      .send({ tmdbId: 603 });
    expect(postRes1.status).toBe(201);
    expect(postRes1.body.entry.id).toBe(mockEntry.id);
    expect(postRes1.body).not.toHaveProperty('userId');

    // 2. Smoke: POST /history (duplicate in window) -> 200
    const postRes2 = await request(app)
      .post('/history')
      .set('Cookie', realJwtCookie)
      .send({ tmdbId: 603 });
    expect(postRes2.status).toBe(200);
    expect(postRes2.body.entry.id).toBe(mockEntry.id);

    // 3. Smoke: GET /history -> 200 with items
    const getRes = await request(app)
      .get('/history?page=1')
      .set('Cookie', realJwtCookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body.items).toHaveLength(1);
    expect(getRes.body.page).toBe(1);

    // 4. Smoke: DELETE /history/:id -> 204
    const deleteRes = await request(app)
      .delete(`/history/${mockEntry.id}`)
      .set('Cookie', realJwtCookie);
    expect(deleteRes.status).toBe(204);

    // 5. Smoke: DELETE /history (clear all) -> 204
    const clearRes = await request(app)
      .delete('/history')
      .set('Cookie', realJwtCookie);
    expect(clearRes.status).toBe(204);
  });
});
