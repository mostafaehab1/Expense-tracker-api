import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate environment variables ONCE at startup with Zod. If a required var is
 * missing or malformed, we crash immediately with a clear message instead of
 * failing mysteriously deep in a request handler later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // In test we use an in-memory Mongo whose URI is injected at runtime, so this
  // is optional there. In dev/prod it must be present.
  MONGODB_URI: z.string().url().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Flatten Zod's error into a readable list and exit — no point continuing.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');

  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
