import Fastify from 'fastify'

import { env } from '../config/env.js'
import { redis } from '../queue/connection.js'
import { logger } from '../logger/logger.js'
import { gatewayStatuses } from '../../gateways/registry.js'

export function buildHttpServer() {
  const app = Fastify({ logger: false })

  app.get('/health', async () => {
    return {
      status: 'ok',
      gateways: gatewayStatuses(),
      redis: redis.status,
      uptime: process.uptime(),
    }
  })

  return app
}

export async function startHttpServer() {
  const app = buildHttpServer()
  await app.listen({ host: '0.0.0.0', port: env.HTTP_PORT })
  logger.info(`HTTP health server listening on :${env.HTTP_PORT}`)
  return app
}
