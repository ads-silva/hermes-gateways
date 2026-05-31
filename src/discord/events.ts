import { Events } from 'discord.js'

import { discordClient } from './client.js'
import { onMessageCreate } from './handlers/message-create.handler.js'
import { logger } from '../app/logger/logger.js'

/** Wire up the Discord client's gateway events. Called by `DiscordGateway`. */
export function registerDiscordEvents(): void {
  discordClient.once(Events.ClientReady, (client) => {
    logger.info(`Discord gateway ready: ${client.user.tag}`)
  })

  discordClient.on(Events.MessageCreate, onMessageCreate)

  discordClient.on(Events.Error, (error) => {
    logger.error({ err: error }, 'Discord client error')
  })

  discordClient.on(Events.Warn, (info) => {
    logger.warn({ info }, 'Discord client warning')
  })
}
