import express from 'express';
import request from 'supertest';
import {
  ACTIVITY_MAX_PAGE,
  ACTIVITY_PAGE_SIZE,
  HISTORY_DEDUPE_WINDOW_MS,
} from '../../src/config/activity.js';
import { RATE_LIMIT_ACTIVITY_WRITE_MAX } from '../../src/config/security.js';
import { createActivityWriteRateLimiter } from '../../src/middlewares/rateLimiter.js';

describe('Activity configuration constants', () => {
  it('defines expected dedupe window, page size, max page, and write rate limit', () => {
    expect(HISTORY_DEDUPE_WINDOW_MS).toBe(30 * 60 * 1000);
    expect(ACTIVITY_PAGE_SIZE).toBe(20);
    expect(ACTIVITY_MAX_PAGE).toBe(500);
    expect(RATE_LIMIT_ACTIVITY_WRITE_MAX).toBe(60);
  });
});

describe('createActivityWriteRateLimiter', () => {
  it('returns 429 with D3 error envelope when limit is exceeded', async () => {
    const app = express();
    // Use low limit of 2 requests for testing
    app.use('/test-activity', createActivityWriteRateLimiter(2), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const res1 = await request(app).post('/test-activity');
    expect(res1.status).toBe(200);

    const res2 = await request(app).post('/test-activity');
    expect(res2.status).toBe(200);

    const res3 = await request(app).post('/test-activity');
    expect(res3.status).toBe(429);
    expect(res3.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
      },
    });
  });
});
