import { z } from 'zod';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

const tmdbIdSchema = z.number().int().positive().max(MAX_POSTGRES_INTEGER);

export const addWatchlistBodySchema = z.object({ tmdbId: tmdbIdSchema });

export const watchlistTmdbIdParamsSchema = z.object({
  tmdbId: z.coerce.number().int().positive().max(MAX_POSTGRES_INTEGER),
});

export const watchlistListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
