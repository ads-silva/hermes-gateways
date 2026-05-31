import type { Message } from 'discord.js'

import { env } from '../../app/config/env.js'
import { logger } from '../../app/logger/logger.js'
import { messageQueue } from '../../app/queue/queues.js'
import type { GatewayMessageJob } from '../../types/gateway.js'

export async function onMessageCreate(message: Message): Promise<void> {
  try {
    // Ignore bots (including ourselves) and DMs / non-server contexts.
    // (`inGuild()` is discord.js's name for "is in a server".)
    if (message.author.bot) return
    if (!message.inGuild()) return

    // Security: only serve our own server. Even if the bot is ever added to
    // another server, messages from anywhere else are dropped before they can
    // reach the queue or the Hermes backend. (`guildId` is discord.js's name
    // for the server id; we compare it to DISCORD_SERVER_ID.)
    if (message.guildId !== env.DISCORD_SERVER_ID) {
      logger.warn(
        { guildId: message.guildId },
        'Dropped message from non-allowlisted server',
      )
      return
    }

    // Ignore empty content (e.g. attachment-only messages with no text).
    if (!message.content.trim()) return

    const job: GatewayMessageJob = {
      source: 'discord',
      messageId: message.id,
      channelId: message.channelId,
      userId: message.author.id,
      username: message.author.username,
      content: message.content,
    }

    await messageQueue.add('process-message', job)

    logger.debug(
      { messageId: job.messageId, channelId: job.channelId },
      'Enqueued Discord message',
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to enqueue Discord message')
  }
}
