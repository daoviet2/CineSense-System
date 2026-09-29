import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REDIS_URL: z.string().optional(),
  TMDB_API_KEY: z.string().optional(),
  RECOMMENDATION_SERVICE_URL: z.string().optional(),
  FRONTEND_ORIGIN: z.string().optional().default('http://localhost:3000'),
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
