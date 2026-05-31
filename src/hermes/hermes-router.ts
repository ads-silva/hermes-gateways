import { HermesClient } from './hermes-client.js'
import type { HermesResponse } from './types.js'

const hermesClient = new HermesClient()

export class HermesRouter {
  async handleMessage(input: {
    userId: string
    channelId: string
    content: string
  }): Promise<HermesResponse> {
    return hermesClient.generate({
      userId: input.userId,
      channelId: input.channelId,
      message: input.content,
    })
  }
}
