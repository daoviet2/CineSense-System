import {
  mapTmdbMoviePage,
  mapTmdbMovieToCacheInput,
  mapTmdbMovieSummary,
} from '../../src/modules/movie/tmdb.mapper.js';
import {
  tmdbGenreListSchema,
  tmdbMovieDetailsSchema,
  tmdbMoviePageSchema,
} from '../../src/modules/movie/tmdb.types.js';

const imageBaseUrl = 'https://image.tmdb.org/t/p/';

const validDetails = {
  id: 603,
  title: 'The Matrix',
  overview: 'A computer hacker learns about reality.',
  poster_path: '/poster.jpg',
  release_date: '1999-03-30',
  vote_average: 8.7,
  genres: [{ id: 28, name: 'Action' }],
};

const validSummary = {
  id: 603,
  title: 'The Matrix',
  overview: 'A computer hacker learns about reality.',
  poster_path: '/poster.jpg',
  release_date: '1999-03-30',
  vote_average: 8.7,
  genre_ids: [28],
};

describe('TMDB payload schemas', () => {
  it('rejects payloads missing required fields', () => {
    const { vote_average: _voteAverage, ...incomplete } = validDetails;
    expect(tmdbMovieDetailsSchema.safeParse(incomplete).success).toBe(false);
  });

  it('strips fields not part of the public TMDB contract', () => {
    const parsed = tmdbMovieDetailsSchema.parse({ ...validDetails, vendor_debug: 'ignored' });
    expect(parsed).not.toHaveProperty('vendor_debug');
  });

  it('parses movie pages and genre lists at the API boundary', () => {
    expect(
      tmdbMoviePageSchema.parse({
        page: 1,
        results: [validSummary],
        total_pages: 1,
        total_results: 1,
      }).results
    ).toHaveLength(1);
    expect(tmdbGenreListSchema.parse({ genres: [{ id: 28, name: 'Action' }] }).genres).toHaveLength(1);
    expect(tmdbMoviePageSchema.safeParse({ page: 1, results: [], total_pages: -1, total_results: 0 }).success).toBe(false);
  });
});

describe('TMDB mapper', () => {
  it('maps movie details without losing the 0–10 rating scale or genre IDs', () => {
    const input = mapTmdbMovieToCacheInput(
      tmdbMovieDetailsSchema.parse({ ...validDetails, vote_average: 0 }),
      imageBaseUrl
    );

    expect(input).toEqual({
      tmdbId: 603,
      title: 'The Matrix',
      overview: 'A computer hacker learns about reality.',
      averageRating: 0,
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      releaseDate: new Date('1999-03-30T00:00:00.000Z'),
      genres: [{ id: 28, name: 'Action' }],
    });
  });

  it('maps missing poster and empty release date to null', () => {
    const input = mapTmdbMovieToCacheInput(
      tmdbMovieDetailsSchema.parse({
        ...validDetails,
        poster_path: null,
        release_date: '',
        overview: null,
        genres: [],
      }),
      imageBaseUrl
    );

    expect(input.posterUrl).toBeNull();
    expect(input.releaseDate).toBeNull();
    expect(input.overview).toBe('');
    expect(input.genres).toEqual([]);
  });

  it('maps list summaries and pagination to stable camelCase DTOs', () => {
    const summary = mapTmdbMovieSummary(
      tmdbMoviePageSchema.parse({
        page: 2,
        results: [{ ...validSummary, poster_path: null, release_date: '' }],
        total_pages: 4,
        total_results: 61,
      }).results[0],
      imageBaseUrl
    );
    const page = mapTmdbMoviePage(
      tmdbMoviePageSchema.parse({
        page: 2,
        results: [validSummary],
        total_pages: 4,
        total_results: 61,
      }),
      imageBaseUrl
    );

    expect(summary).toEqual({
      tmdbId: 603,
      title: 'The Matrix',
      posterUrl: null,
      releaseDate: null,
      averageRating: 8.7,
      genreIds: [28],
    });
    expect(page).toMatchObject({ page: 2, totalPages: 4, totalResults: 61, items: [{ tmdbId: 603 }] });
  });
});
