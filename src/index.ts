import { serve } from "@hono/node-server";
import { Client, Events, GatewayIntentBits, IntentsBitField } from "discord.js";
import { Hono } from "hono";
import cron from "node-cron";
import { env } from "#/config/env.js";
import { logger } from "#/config/logger.js";
import { runNewsJob } from "#/jobs/news.job.js";
import { fetchContentForSelectedArticles } from "#/services/article.service";

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

const DISCORD_MAX_LENGTH = 2000;

function splitMessage(
  content: string,
  maxLength: number = DISCORD_MAX_LENGTH
): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  const lines = content.split("\n");

  for (const line of lines) {
    // If adding this line would exceed the limit
    if (currentChunk.length + line.length + 1 > maxLength) {
      // If we have content in current chunk, save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // If single line is too long, split it
      if (line.length > maxLength) {
        let remainingLine = line;
        while (remainingLine.length > maxLength) {
          chunks.push(remainingLine.substring(0, maxLength));
          remainingLine = remainingLine.substring(maxLength);
        }
        if (remainingLine.trim()) {
          currentChunk = remainingLine;
        }
      } else {
        currentChunk = line;
      }
    } else {
      // Add line to current chunk
      // biome-ignore lint/nursery/noUnnecessaryConditions: explain
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.content === "/ping") {
    await message.reply("Pong!");
  }
  if (message.content === "/dit me may") {
    await message.reply("dit me may luon");
  }
  if (message.content === "/news") {
    const summaries = await runNewsJob();
    if (summaries) {
      const chunks = splitMessage(summaries, DISCORD_MAX_LENGTH);

      // Send first chunk as a reply
      if (chunks.length > 0) {
        await message.reply(chunks[0]);

        // Send remaining chunks as follow-up messages
        for (let i = 1; i < chunks.length; i++) {
          await message.channel.send(chunks[i]);
        }
      } else {
        await message.reply("No summaries found");
      }
    }
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
