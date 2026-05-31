/**
 * Transport-agnostic gateway contracts.
 *
 * A "gateway" is any chat transport (Discord today; Telegram, Slack, … later).
 * Inbound messages from every gateway are normalised into a single
 * {@link GatewayMessageJob} shape and enqueued. The worker replies through the
 * matching {@link OutboundGateway}, selected by `source`. Hermes never sees the
 * transport — it only ever receives `{ userId, channelId, content }`.
 */

/**
 * Identifier for a chat transport. Add a new literal here when plugging in a
 * new gateway (e.g. `'telegram'`), then register an {@link OutboundGateway}
 * for it in `src/gateways/outbound-registry.ts`.
 */
export type GatewaySource = 'discord'

/**
 * Normalised inbound message, identical across every gateway.
 *
 * `channelId` is the gateway-native conversation id (Discord channel,
 * Telegram chat, Slack channel, …) — it is opaque to Hermes and is passed back
 * to the originating gateway's {@link OutboundGateway} to deliver the reply.
 */
export type GatewayMessageJob = {
  source: GatewaySource
  messageId: string
  channelId: string
  userId: string
  username: string
  content: string
}

/**
 * The outbound half of a gateway: knows how to deliver a reply back to its
 * transport. This is the narrow surface the worker depends on.
 */
export interface OutboundGateway {
  /** The transport this gateway delivers to. Used as the registry key. */
  readonly source: GatewaySource

  /** Deliver `content` to the given gateway-native conversation. */
  sendMessage(channelId: string, content: string): Promise<unknown>
}

/**
 * A full gateway: the inbound lifecycle plus the outbound delivery half.
 *
 * Implement this once per transport, then register the instance in
 * `src/gateways/registry.ts`. The bootstrap starts/stops every registered
 * gateway and the health endpoint reports each one's `isReady()` — none of
 * those call sites need to know which concrete transports exist.
 */
export interface Gateway extends OutboundGateway {
  /** Connect to the transport and begin receiving messages. */
  start(): Promise<void>

  /** Disconnect cleanly (called on graceful shutdown). */
  stop(): Promise<void>

  /** Whether the transport connection is currently live (for `/health`). */
  isReady(): boolean
}
