import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

/**
 * Zod schema for LinguaLoop environment variables.
 * Provides strict type checking, default values, and runtime validation.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application runtime environment'),

  PORT: z.coerce
    .number()
    .int()
    .min(1, 'PORT must be a positive integer')
    .max(65535, 'PORT must be a valid port number (<= 65535)')
    .default(5000)
    .describe('Port for Express HTTP server and WebSocket gateway'),

  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required to connect to the MongoDB database')
    .describe('MongoDB connection URL string'),

  MONGODB_DB_NAME: z.string().default('lingualoop_db').describe('MongoDB database name'),

  REDIS_URL: z
    .string()
    .default('redis://localhost:6379')
    .describe('Redis connection URL for ephemeral voice session storage'),

  JWT_SECRET: z
    .string()
    .min(10, 'JWT_SECRET is required and must be at least 10 characters long for security')
    .describe('Secret key for signing and verifying JWT tokens'),

  JWT_EXPIRES_IN: z
    .string()
    .default('24h')
    .describe('JWT token expiration duration (e.g. 24h, 7d)'),

  OLLAMA_BASE_URL: z
    .string()
    .default('http://localhost:11434')
    .describe('Base URL for Ollama local LLM service'),

  MASTRA_STORAGE_URL: z
    .string()
    .default('file:./mastra.db')
    .describe('Path or URL for Mastra local database storage'),

  MASTRA_PLATFORM_ACCESS_TOKEN: z
    .string()
    .optional()
    .describe('Optional Mastra Platform access token'),

  MASTRA_PROJECT_ID: z.string().optional().describe('Optional Mastra Platform project ID'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates process.env against envSchema.
 * Displays formatted error messages and terminates process if invalid.
 */
export const validateEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('====================================================');
    console.error('CRITICAL: ENVIRONMENT VARIABLE VALIDATION FAILED');
    console.error('====================================================');
    console.error(
      'The application failed to start due to missing or invalid environment variables:\n'
    );

    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.') || 'UNKNOWN_FIELD';
      console.error(`  - [${field}]: ${issue.message}`);
    });

    console.error('\nPlease update your .env file according to .env.example before restarting.');
    console.error('====================================================');

    process.exit(1);
  }

  return result.data;
};

export const env: EnvConfig = validateEnv();
export default env;
