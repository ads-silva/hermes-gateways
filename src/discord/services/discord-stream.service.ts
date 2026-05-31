import type { Message } from 'discord.js'

const DISCORD_SAFE_LENGTH = 1900

/**
 * Streams an async generator of text chunks into a single Discord reply,
 * editing it progressively. Edits are throttled to stay rate-limit safe.
 */
export class DiscordStreamService {
  constructor(private readonly editIntervalMs = 750) {}

  async stream(
    message: Message,
    chunks: AsyncGenerator<string>,
  ): Promise<Message> {
    const reply = await message.reply('Thinking…')

    let accumulated = ''
    let lastEdit = 0
    let pending = false

    for await (const chunk of chunks) {
      accumulated += chunk

      // Discord caps messages at 2000 chars; keep the most recent window.
      if (accumulated.length > DISCORD_SAFE_LENGTH) {
        accumulated = accumulated.slice(-DISCORD_SAFE_LENGTH)
      }

      const now = Date.now()
      if (now - lastEdit >= this.editIntervalMs) {
        lastEdit = now
        await reply.edit(accumulated || '…')
      } else {
        pending = true
      }
    }

    // Flush any final buffered content.
    if (pending || accumulated) {
      await reply.edit(accumulated || '(empty response)')
    }

    return reply
  }
}
