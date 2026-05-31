import type { Message } from 'discord.js'

import type { GatewaySource, OutboundGateway } from '../../types/gateway.js'
import { discordClient } from '../client.js'

const DISCORD_MAX_MESSAGE_LENGTH = 2000

/**
 * Splits content into Discord-safe chunks (<= 2000 chars), preferring to
 * break on newlines so we never cut a message mid-line when avoidable.
 */
function chunkContent(
  content: string,
  limit = DISCORD_MAX_MESSAGE_LENGTH,
): string[] {
  if (content.length <= limit) return [content]

  const chunks: string[] = []
  let current = ''

  for (const line of content.split('\n')) {
    if (line.length > limit) {
      // A single line longer than the limit: hard-split it.
      if (current) {
        chunks.push(current)
        current = ''
      }
      for (let i = 0; i < line.length; i += limit) {
        chunks.push(line.slice(i, i + limit))
      }
      continue
    }

    if (current.length + line.length + 1 > limit) {
      chunks.push(current)
      current = line
    } else {
      current = current ? `${current}\n${line}` : line
    }
  }

  if (current) chunks.push(current)

  return chunks
}

export class DiscordMessageService implements OutboundGateway {
  readonly source: GatewaySource = 'discord'

  async sendMessage(channelId: string, content: string): Promise<Message[]> {
    const channel = await discordClient.channels.fetch(channelId)

    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      throw new Error(`Invalid or non-sendable Discord channel: ${channelId}`)
    }

    const sent: Message[] = []
    for (const chunk of chunkContent(content)) {
      sent.push(await channel.send(chunk))
    }

    return sent
  }
}
