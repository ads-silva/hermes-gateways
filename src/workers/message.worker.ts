import { Worker } from 'bullmq'

import { redis } from '../app/queue/connection.js'
import { GATEWAY_MESSAGE_QUEUE } from '../app/queue/queues.js'
import { HermesRouter } from '../hermes/hermes-router.js'
import { getOutboundGateway } from '../gateways/registry.js'
import { logger } from '../app/logger/logger.js'
import type { GatewayMessageJob } from '../types/gateway.js'

const hermesRouter = new HermesRouter()

export const messageWorker = new Worker<GatewayMessageJob>(
  GATEWAY_MESSAGE_QUEUE,
  async (job) => {
    const response = await hermesRouter.handleMessage({
      userId: job.data.userId,
      channelId: job.data.channelId,
      content: job.data.content,
    })

    // Reply through whichever gateway the message arrived on.
    const gateway = getOutboundGateway(job.data.source)
    await gateway.sendMessage(job.data.channelId, response.content)
  },
  {
    connection: redis,

    concurrency: 5,

    // Rate-limit safe: at most 10 jobs processed per second.
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
)

messageWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Message job completed')
})

messageWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, err: error }, 'Message job failed')
})
