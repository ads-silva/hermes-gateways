import { Client, GatewayIntentBits, Partials } from 'discord.js'

export const discordClient = new Client({
  // Note: discord.js calls a server a "Guild" — these intents are server-scoped.
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],

  partials: [Partials.Channel],

  failIfNotExists: false,
})
