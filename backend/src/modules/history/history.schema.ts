import { z } from 'zod';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

export const recordHistoryBodySchema = z.object({
  tmdbId: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
    z
      .number()
      .int('tmdbId must be an integer')
      .positive('tmdbId must be positive')
      .max(MAX_POSTGRES_INTEGER, 'tmdbId exceeds max integer')
  ),
});

export const historyListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
});

export const historyIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type RecordHistoryBody = z.infer<typeof recordHistoryBodySchema>;
export type HistoryListQuery = z.infer<typeof historyListQuerySchema>;
export type HistoryIdParams = z.infer<typeof historyIdParamsSchema>;
