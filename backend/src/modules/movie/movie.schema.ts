import { z } from 'zod';
import { TMDB_MAX_PAGE } from '../../config/tmdb.js';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

const optionalSearchQuerySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).max(100).optional()
);

export const movieListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(TMDB_MAX_PAGE).default(1),
    q: optionalSearchQuerySchema,
    genreId: z.coerce.number().int().positive().max(MAX_POSTGRES_INTEGER).optional(),
  })
  .refine(({ q, genreId }) => q === undefined || genreId === undefined, {
    message: 'Search query and genre filter cannot be combined',
  });

export const movieTmdbIdParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive().max(MAX_POSTGRES_INTEGER),
});

export type MovieListQuery = z.infer<typeof movieListQuerySchema>;
