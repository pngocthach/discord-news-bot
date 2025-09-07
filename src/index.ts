import { serve } from "@hono/node-server";
import { Client, Events, GatewayIntentBits, IntentsBitField } from "discord.js";
import { Hono } from "hono";
import cron from "node-cron";
import { env } from "#/config/env.js";
import { logger } from "#/config/logger.js";
import { runNewsJob } from "#/jobs/news.job.js";

const app = new Hono();

const CHANNEL_ID = env.CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  logger.info(`Logged in as ${c.user.displayName}`);
  const channel = client.channels.cache.get(CHANNEL_ID);
  logger.info(`Channel: ${channel}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === "/ping") {
    await message.reply("Pong!");
  }
  if (message.content === "/dit me may") {
    await message.reply("dit me may luon");
  }
});

client.login(env.DISCORD_TOKEN);

const cronSchedule = "0 8 * * *";

logger.info(
  `📰 News job scheduled to run daily at 8:00 AM. [Schedule: ${cronSchedule}]`
);

cron.schedule(cronSchedule, () => {
  logger.info("⏰ Cron job triggered! Running the news job now...");
  runNewsJob();
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

serve(
  {
    fetch: app.fetch,
    port: Number(env.PORT),
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`);
  }
);
