import { parseMovieQuery, serializeMovieQuery } from '../src/lib/movieQuery';

describe('movieQuery', () => {
  it('parses valid search, genre, and page values', () => {
    expect(parseMovieQuery(new URLSearchParams('page=3&q=%20Dune%20'))).toEqual({ page: 3, q: 'Dune' });
    expect(parseMovieQuery(new URLSearchParams('page=2&genreId=28'))).toEqual({ page: 2, genreId: 28 });
  });

  it('clamps invalid and out-of-range pages and ignores malformed filters', () => {
    expect(parseMovieQuery(new URLSearchParams('page=0&q=%20%20'))).toEqual({ page: 1 });
    expect(parseMovieQuery(new URLSearchParams('page=900&q=Alien&genreId=abc'))).toEqual({ page: 500, q: 'Alien' });
    expect(parseMovieQuery(new URLSearchParams('page=1.5&genreId=-2'))).toEqual({ page: 1 });
  });

  it('gives genre selection precedence when both filters appear', () => {
    expect(parseMovieQuery(new URLSearchParams('q=Dune&genreId=28'))).toEqual({ page: 1, genreId: 28 });
  });

  it('serializes defaults and empty values by omitting them', () => {
    expect(serializeMovieQuery({ page: 1, q: '  ' }).toString()).toBe('');
    expect(serializeMovieQuery({ page: 2, q: ' Dune ' }).toString()).toBe('page=2&q=Dune');
    expect(serializeMovieQuery({ page: 1, q: 'Dune', genreId: 28 }).toString()).toBe('genreId=28');
  });

  it('clamps serialized pages to the supported range', () => {
    expect(serializeMovieQuery({ page: 900 }).toString()).toBe('page=500');
    expect(serializeMovieQuery({ page: 0 }).toString()).toBe('');
  });
});
