import { getSafeLoginRedirect } from '../src/lib/loginRedirect';

describe('getSafeLoginRedirect', () => {
  it('returns a local movie path from the login link', () => {
    expect(getSafeLoginRedirect('?redirect=%2Fmovie%2F603')).toBe('/movie/603');
  });

  it('falls back to home for missing or external destinations', () => {
    expect(getSafeLoginRedirect('')).toBe('/');
    expect(getSafeLoginRedirect('?redirect=https%3A%2F%2Fevil.example')).toBe('/');
    expect(getSafeLoginRedirect('?redirect=%2F%2Fevil.example')).toBe('/');
    expect(getSafeLoginRedirect('?redirect=%2F%5Cevil.example')).toBe('/');
  });
});
