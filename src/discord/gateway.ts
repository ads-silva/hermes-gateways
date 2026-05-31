import { env } from '../app/config/env.js'
import type { Gateway, GatewaySource } from '../types/gateway.js'

import { discordClient } from './client.js'
import { registerDiscordEvents } from './events.js'
import { DiscordMessageService } from './services/discord-message.service.js'

/**
 * The Discord gateway: inbound lifecycle (login / destroy / ready) plus
 * outbound delivery (delegated to {@link DiscordMessageService}).
 */
export class DiscordGateway implements Gateway {
  readonly source: GatewaySource = 'discord'

  private readonly messages = new DiscordMessageService()

  async start(): Promise<void> {
    registerDiscordEvents()
    await discordClient.login(env.DISCORD_TOKEN)
  }

  async stop(): Promise<void> {
    await discordClient.destroy()
  }

  isReady(): boolean {
    return discordClient.isReady()
  }

  sendMessage(channelId: string, content: string): Promise<unknown> {
    return this.messages.sendMessage(channelId, content)
  }
}
