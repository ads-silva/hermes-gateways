import { env } from '../app/config/env.js'

import {
  hermesResponseSchema,
  type HermesRequest,
  type HermesResponse,
} from './types.js'

const DEFAULT_TIMEOUT_MS = 60_000

export class HermesClient {
  constructor(private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {}

  async generate(payload: HermesRequest): Promise<HermesResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (env.HERMES_API_KEY) {
      headers.Authorization = `Bearer ${env.HERMES_API_KEY}`
    }

    try {
      const response = await fetch(`${env.HERMES_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Hermes request failed: ${response.status}`)
      }

      // Never trust the shape of an upstream response: validate it.
      return hermesResponseSchema.parse(await response.json())
    } finally {
      clearTimeout(timeout)
    }
  }
}
