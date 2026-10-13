import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().optional(),
  TMDB_API_KEY: z.string().trim().min(1, 'TMDB_API_KEY is required'),
  TMDB_BASE_URL: z.string().url().default('https://api.themoviedb.org/3'),
  TMDB_IMAGE_BASE_URL: z.string().url().default('https://image.tmdb.org/t/p'),
  TMDB_LANGUAGE: z.string().trim().min(1).default('vi-VN'),
  TMDB_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  RECOMMENDATION_SERVICE_URL: z.string().optional(),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`- ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Failed to load valid environment variables');
  }
  return result.data;
}

export const env = loadEnv();
