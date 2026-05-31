# Hermes Gateways

A production-ready, **pluggable gateway layer** that connects chat transports to
the **Hermes Agent**. Discord is the gateway shipped today; the pipeline is
transport-agnostic so Telegram, Slack, or any other transport can be added
without touching Hermes or the worker.

```
Gateway (Discord/…)  →  Queue (BullMQ/Redis)  →  Worker  →  Hermes Router  →  Tools / Memory  →  Reply via originating gateway
```

Every inbound message is normalised into a single `GatewayMessageJob` carrying a
`source` (`'discord'`, …). The worker resolves the matching **outbound gateway**
from that `source` to deliver the reply — so Hermes only ever sees neutral
`{ userId, channelId, content }`.

## Design principles

- A **gateway** is only the transport layer.
- **Hermes** is the orchestration / intelligence layer.
- **Tools** are the execution layer (validated with zod, never driven directly by the LLM).
- **Queue** provides reliability + rate limiting.
- **Memory** is externalized.

Gateway events are **never** sent straight to Hermes. They are enqueued and
processed by a worker, which keeps the gateway stable and rate-limit safe.

## Stack

- Node.js 22+, TypeScript (strict)
- discord.js v14
- BullMQ + ioredis
- Fastify (health endpoint)
- zod, pino

## Project layout

```
src/
 ├── app/
 │    ├── config/env.ts        # zod-validated environment
 │    ├── logger/logger.ts     # pino logger
 │    ├── http/server.ts       # Fastify health endpoint
 │    └── queue/               # Redis connection + BullMQ queue
 ├── gateways/
 │    └── registry.ts          # the gateway fleet (plug in here)
 ├── discord/                  # the Discord gateway implementation
 │    ├── client.ts            # discord.js client (minimal intents)
 │    ├── gateway.ts           # DiscordGateway: implements Gateway
 │    ├── events.ts            # gateway event registration
 │    ├── handlers/            # messageCreate → normalise → enqueue
 │    └── services/            # send + streaming reply
 ├── hermes/                   # Hermes HTTP client + router + types
 ├── workers/                  # BullMQ worker: queue → Hermes → reply
 ├── tools/registry.ts         # validated tool execution layer
 ├── types/gateway.ts          # Gateway / OutboundGateway / job contracts
 └── index.ts                  # bootstrap (starts the gateway fleet + worker + http)
```

## Adding a new gateway

The pipeline is transport-agnostic — a gateway is the only piece that knows its
transport. To plug in (e.g.) Telegram:

1. Add the literal to `GatewaySource` in [`src/types/gateway.ts`](src/types/gateway.ts):
   `export type GatewaySource = 'discord' | 'telegram'`.
2. Implement the **`Gateway`** interface in a `TelegramGateway` class:
   - `start()` — connect and register inbound handlers that normalise incoming
     messages into a `GatewayMessageJob` (with `source: 'telegram'`) and enqueue
     them on the shared `messageQueue`.
   - `stop()` — disconnect cleanly.
   - `isReady()` — connection liveness, surfaced on `/health`.
   - `sendMessage(channelId, content)` — deliver a reply.
3. Register it with one line in
   [`src/gateways/registry.ts`](src/gateways/registry.ts):
   `registerGateway(new TelegramGateway())`.

That's it. The bootstrap starts/stops it, `/health` reports it, and the worker
routes replies back to it automatically via `job.source` — the worker, queue,
and Hermes router need **no changes**.

## Setup

1. **Requirements:** Node.js 22+, a running Redis, a Discord bot token.

2. **Install:**

   ```bash
   npm install
   ```

3. **Configure:** copy `.env.example` to `.env` and fill it in.

   ```bash
   cp .env.example .env
   ```

   | Variable            | Description                                  |
   | ------------------- | -------------------------------------------- |
   | `DISCORD_TOKEN`     | Bot token from the Discord Developer Portal  |
   | `DISCORD_CLIENT_ID` | Application (client) ID                       |
   | `DISCORD_SERVER_ID` | Target server ID (Discord's API calls it a "guild") |
   | `REDIS_HOST/PORT`   | Redis connection                              |
   | `HERMES_BASE_URL`   | Hermes base URL (calls `POST {BASE_URL}/chat`)|
   | `HERMES_API_KEY`    | Optional bearer token for Hermes             |
   | `HTTP_PORT`         | Health server port (default 3000)             |

4. **Enable the Message Content intent** for your bot in the Discord
   Developer Portal (Bot → Privileged Gateway Intents).

## Running locally

Start Redis (Docker):

```bash
docker run -p 6379:6379 redis
```

Development (hot reload):

```bash
npm run dev
```

Build + run:

```bash
npm run build
npm start
```

Health check: `GET http://localhost:3000/health`

## Production (Docker)

```bash
docker compose up -d --build
```

This starts the bot plus a persistent Redis. Recommended host: a VPS
(Hetzner/Contabo/OVH) — Discord bots need a persistent websocket and
long-running workers, so serverless platforms (Vercel/Netlify) are not suitable.

## How the Hermes contract works

The worker calls:

```
POST {HERMES_BASE_URL}/chat
Authorization: Bearer {HERMES_API_KEY}   # if set
Content-Type: application/json

{ "userId": "...", "channelId": "...", "message": "..." }
```

and expects:

```json
{ "content": "the reply text" }
```

The response is validated with zod before being sent back to Discord —
upstream JSON is never trusted blindly.

## Security

**Never:**

- commit the token (use `.env`, which is gitignored)
- grant the bot Administrator permission
- enable unnecessary gateway intents
- execute tools directly from raw LLM output
- trust JSON from the model

**Always** validate tool input with zod. The flow is strictly:

```
LLM  →  structured intent  →  validation  →  execution layer
```

See `src/tools/registry.ts` for the enforced pattern.

## Scaling notes

The worker runs in the **same process** as the gateways because the outbound
side of each gateway needs its authenticated connection to send messages. To
scale workers horizontally later, run a dedicated worker entry that owns its own
gateway connections (or REST-only clients) and connects to the same Redis queue.

## Roadmap

- Slash commands (`/hermes ask`, `/hermes reset`, `/hermes tools`)
- Real streaming replies (`DiscordStreamService` is already provided)
- Memory: Postgres + pgvector + embeddings
- Observability: Langfuse / OpenTelemetry / Grafana
- Queue robustness: dead-letter queue, poison-message handling
- Multi-agent routing (`@Hermes coding`, `@Hermes devops`, …)
```
