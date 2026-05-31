/**
 * The gateway registry — the single place every transport is wired in.
 *
 * To plug in a new gateway:
 *   1. Add its literal to `GatewaySource` in `src/types/gateway.ts`.
 *   2. Implement the `Gateway` interface (start / stop / isReady / sendMessage).
 *   3. Add one `registerGateway(new YourGateway())` line below.
 *
 * The bootstrap (`index.ts`) starts/stops every registered gateway, the worker
 * resolves the outbound side by `source`, and `/health` reports each one's
 * readiness — none of those call sites change when a gateway is added.
 */
import type { Gateway, GatewaySource, OutboundGateway } from '../types/gateway.js'
import { DiscordGateway } from '../discord/gateway.js'

const registry = new Map<GatewaySource, Gateway>()

export function registerGateway(gateway: Gateway): void {
  registry.set(gateway.source, gateway)
}

/** Every registered gateway — used to start/stop the whole fleet. */
export function getGateways(): Gateway[] {
  return [...registry.values()]
}

/** Resolve the outbound side for a given source (used by the worker). */
export function getOutboundGateway(source: GatewaySource): OutboundGateway {
  const gateway = registry.get(source)
  if (!gateway) {
    throw new Error(`No gateway registered for source: ${source}`)
  }
  return gateway
}

/** Per-gateway readiness, for the health endpoint. */
export function gatewayStatuses(): Record<GatewaySource, 'ready' | 'not-ready'> {
  const statuses = {} as Record<GatewaySource, 'ready' | 'not-ready'>
  for (const gateway of registry.values()) {
    statuses[gateway.source] = gateway.isReady() ? 'ready' : 'not-ready'
  }
  return statuses
}

// --- Registered gateways -------------------------------------------------
registerGateway(new DiscordGateway())
