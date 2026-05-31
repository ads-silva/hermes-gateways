import 'dotenv/config'

import type { FastifyInstance } from 'fastify'

import { logger } from './app/logger/logger.js'
import { startHttpServer } from './app/http/server.js'
import { redis } from './app/queue/connection.js'
import { messageQueue } from './app/queue/queues.js'
import { getGateways } from './gateways/registry.js'
import { messageWorker } from './workers/message.worker.js'

async function bootstrap() {
  // Start every registered gateway. Adding a transport never touches this file.
  for (const gateway of getGateways()) {
    await gateway.start()
    logger.info(`Gateway started: ${gateway.source}`)
  }

  // The worker runs in this same process so it shares each gateway's
  // authenticated connection (the outbound side needs it to send). To scale
  // workers horizontally later, run a dedicated worker entry that owns its own
  // gateway connections (or REST-only clients) against the same Redis queue.
  logger.info(`Message worker started (queue: ${messageWorker.name})`)

  const http = await startHttpServer()

  registerShutdownHooks(http)
}

function registerShutdownHooks(http: FastifyInstance) {
  let shuttingDown = false

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info(`Received ${signal}, shutting down gracefully…`)

    try {
      await http.close()
      await messageWorker.close()
      await messageQueue.close()
      for (const gateway of getGateways()) {
        await gateway.stop()
      }
      await redis.quit()
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown')
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Fatal error during bootstrap')
  process.exit(1)
})
