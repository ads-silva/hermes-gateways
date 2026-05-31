import { Queue } from 'bullmq'

import { redis } from './connection.js'
import type { GatewayMessageJob } from '../../types/gateway.js'

export const GATEWAY_MESSAGE_QUEUE = 'gateway-message-queue'

export const messageQueue = new Queue<GatewayMessageJob>(
  GATEWAY_MESSAGE_QUEUE,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 500,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },
)
