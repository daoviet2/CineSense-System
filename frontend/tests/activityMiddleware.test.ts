import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';

describe('activity route middleware', () => {
  it.each(['/history', '/watchlist', '/history/anything', '/watchlist/anything'])('redirects a guest from %s to login', (path) => {
    const response = middleware(new NextRequest(`http://localhost:3000${path}`));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/login?redirect=${encodeURIComponent(path)}`);
  });

  it('allows a request with an access_token cookie and keeps movie pages public', () => {
    const member = middleware(new NextRequest('http://localhost:3000/history', {
      headers: { cookie: 'access_token=test-cookie' },
    }));
    const movieGuest = middleware(new NextRequest('http://localhost:3000/movie/603'));
    expect(member.status).toBe(200);
    expect(movieGuest.status).toBe(200);
  });
});
