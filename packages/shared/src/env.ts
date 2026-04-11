/**
 * Zod-validated environment configuration for nEIP.
 *
 * Validates all required environment variables at startup and fails fast
 * with a clear error message listing every missing or invalid variable.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Ambient — process.env is available in Node.js without @types/node by
// declaring a minimal interface here.
// ---------------------------------------------------------------------------

declare const process: { env: Record<string, string | undefined> };

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5400),
  LLM_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// ---------------------------------------------------------------------------
// Inferred type
// ---------------------------------------------------------------------------

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Validation + export
// ---------------------------------------------------------------------------

function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[nEIP] Invalid environment configuration. Fix the following:\n${issues}`,
    );
  }

  return result.data;
}

/**
 * Validated, type-safe environment variables.
 *
 * Import this instead of `process.env` to get full type safety and
 * fail-fast validation. Validation is deferred until the first property
 * access so that importing `@neip/shared` for error classes or types
 * does not require env vars to be set (e.g. in tests).
 *
 * @example
 * import { env } from '@neip/shared';
 * const port = env.PORT; // number
 */
let _cached: Env | undefined;

function _getEnv(): Env {
  if (!_cached) {
    _cached = parseEnv(process.env);
  }
  return _cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return _getEnv()[prop as keyof Env];
  },
});
