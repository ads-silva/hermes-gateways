import { z } from 'zod'

export type HermesRequest = {
  userId: string
  channelId: string
  message: string
}

export const hermesResponseSchema = z.object({
  content: z.string(),
})

export type HermesResponse = z.infer<typeof hermesResponseSchema>
