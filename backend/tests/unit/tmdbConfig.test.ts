import {
  MOVIES_PAGE_SIZE,
  TMDB_FALLBACK_LANGUAGE,
  TMDB_MAX_PAGE,
  TMDB_POSTER_SIZE,
} from '../../src/config/tmdb.js';
import { RATE_LIMIT_MOVIES_MAX } from '../../src/config/security.js';

describe('TMDB configuration constants', () => {
  it('centralizes paging, poster, fallback language, and rate-limit values', () => {
    expect(TMDB_POSTER_SIZE).toBe('w500');
    expect(TMDB_MAX_PAGE).toBe(500);
    expect(MOVIES_PAGE_SIZE).toBe(20);
    expect(TMDB_FALLBACK_LANGUAGE).toBe('en-US');
    expect(RATE_LIMIT_MOVIES_MAX).toBe(300);
  });
});
