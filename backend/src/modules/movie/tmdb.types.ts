import { z } from 'zod';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

const tmdbIdSchema = z.number().int().positive().max(MAX_POSTGRES_INTEGER);

const isValidReleaseDate = (value: string): boolean => {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const tmdbReleaseDateSchema = z.string().refine(isValidReleaseDate, {
  message: 'Expected an ISO date or an empty string',
});

export const tmdbGenreSchema = z.object({
  id: tmdbIdSchema,
  name: z.string().min(1),
});

const tmdbMovieFields = {
  id: tmdbIdSchema,
  title: z.string().min(1),
  overview: z.string().nullable(),
  poster_path: z.string().nullable(),
  release_date: tmdbReleaseDateSchema,
  vote_average: z.number().min(0).max(10),
};

export const tmdbMovieDetailsSchema = z.object({
  ...tmdbMovieFields,
  genres: z.array(tmdbGenreSchema),
});

export const tmdbMovieSummarySchema = z.object({
  ...tmdbMovieFields,
  genre_ids: z.array(tmdbIdSchema),
});

export const tmdbMoviePageSchema = z.object({
  page: z.number().int().positive(),
  results: z.array(tmdbMovieSummarySchema),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative(),
});

export const tmdbGenreListSchema = z.object({
  genres: z.array(tmdbGenreSchema),
});

export type TmdbGenre = z.infer<typeof tmdbGenreSchema>;
export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;
export type TmdbMovieSummary = z.infer<typeof tmdbMovieSummarySchema>;
export type TmdbMoviePage = z.infer<typeof tmdbMoviePageSchema>;
export type TmdbGenreList = z.infer<typeof tmdbGenreListSchema>;
