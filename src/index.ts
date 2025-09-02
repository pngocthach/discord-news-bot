import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Client, Events, GatewayIntentBits, IntentsBitField } from "discord.js";
import { config } from "dotenv";
config();

const app = new Hono();

const CHANNEL_ID = process.env.CHANNEL_ID!;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
  ],
});

const TEST_MARKDOWN = `
# Test
## Test
### Test
#### Test
##### Test
###### Test
`;

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.displayName}`);
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (channel) {
    // @ts-expect-error
    await channel.send(TEST_MARKDOWN);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === "/ping") {
    await message.reply("Pong!");
  }
  if (message.content === "/dit me may") {
    await message.reply("dit me may luon");
  }
});

client.login(process.env.DISCORD_TOKEN);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 10000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
