import { z } from 'zod'

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_SERVER_ID: z.string().min(1),

  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  HERMES_BASE_URL: z.string().url(),
  HERMES_API_KEY: z.string().optional(),

  HTTP_PORT: z.coerce.number().default(3000),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
