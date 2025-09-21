import { serve } from "@hono/node-server";
import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  IntentsBitField,
  type Message,
  type TextChannel,
} from "discord.js";
import { Hono } from "hono";
import cron from "node-cron";
import { env } from "#/config/env";
import { logger } from "#/config/logger";
import { periodicCrawler } from "#/jobs/crawler.job";
import { runNewsJob } from "#/jobs/news.job";
import { closeBrowser } from "#/services/scraper.service";

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

  // Start the periodic crawler when Discord client is ready
  periodicCrawler.start();
  logger.info("🤖 Periodic crawler started automatically");
});

const DISCORD_MAX_LENGTH = 2000;

function splitLongLine(line: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    chunks.push(remaining.substring(0, maxLength));
    remaining = remaining.substring(maxLength);
  }
  if (remaining.trim()) {
    chunks.push(remaining);
  }
  return chunks;
}

function addLineToChunk(currentChunk: string, line: string): string {
  return currentChunk ? `${currentChunk}\n${line}` : line;
}

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
    const wouldExceedLimit = currentChunk.length + line.length + 1 > maxLength;

    if (wouldExceedLimit) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // Handle very long lines
      if (line.length > maxLength) {
        const longLineChunks = splitLongLine(line, maxLength);
        chunks.push(...longLineChunks.slice(0, -1));
        currentChunk = longLineChunks.at(-1) || "";
      } else {
        currentChunk = line;
      }
    } else {
      // Add line to current chunk
      currentChunk = addLineToChunk(currentChunk, line);
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function handleNewsCommand(message: Message) {
  const summaries = await runNewsJob();
  if (summaries) {
    const chunks = splitMessage(summaries, DISCORD_MAX_LENGTH);

    // Send first chunk as a reply
    if (chunks.length > 0) {
      await message.reply(chunks[0]);

      // Send remaining chunks as follow-up messages
      for (let i = 1; i < chunks.length; i++) {
        if (message.channel?.type === ChannelType.GuildText) {
          await (message.channel as TextChannel).send(chunks[i]);
        }
      }
    } else {
      await message.reply("No summaries found");
    }
  } else {
    await message.reply(
      "⏳ No articles with content found. The periodic crawler may need more time to crawl content."
    );
  }
}

async function handleCrawlerStatusCommand(message: Message) {
  const status = periodicCrawler.getStatus();
  const statusMessage = `🤖 **Crawler Status**
**Running:** ${status.isRunning ? "✅ Yes" : "❌ No"}
**Scheduled:** ${status.isScheduled ? "✅ Yes" : "❌ No"}
**Schedule:** ${status.schedule}
**Max Articles per Batch:** ${status.config.maxArticlesPerBatch}
**Batch Size:** ${status.config.batchSize}`;
  await message.reply(statusMessage);
}

async function handleCrawlerRunCommand(message: Message) {
  await message.reply("🚀 Running crawler cycle manually...");
  try {
    await periodicCrawler.runCrawlerCycle();
    if (message.channel?.type === ChannelType.GuildText) {
      await (message.channel as TextChannel).send(
        "✅ Crawler cycle completed successfully!"
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (message.channel?.type === ChannelType.GuildText) {
      await (message.channel as TextChannel).send(
        `❌ Crawler cycle failed: ${errorMessage}`
      );
    }
  }
}

client.on(Events.MessageCreate, async (message) => {
  switch (message.content) {
    case "/ping":
      await message.reply("Pong!");
      break;
    case "/dit me may":
      await message.reply("dit me may luon");
      break;
    case "/news":
      await handleNewsCommand(message);
      break;
    case "/crawler-status":
      await handleCrawlerStatusCommand(message);
      break;
    case "/crawler-run":
      await handleCrawlerRunCommand(message);
      break;
    default:
      // Ignore unknown commands
      break;
  }
});

// Graceful shutdown handling
function setupGracefulShutdown() {
  const cleanup = async () => {
    logger.info("🛑 Shutting down gracefully...");

    try {
      // Stop the periodic crawler
      periodicCrawler.stop();
      logger.info("✅ Periodic crawler stopped");

      // Close browser instance
      await closeBrowser();
      logger.info("✅ Browser instance closed");

      // Destroy Discord client
      if (client.readyAt) {
        client.destroy();
        logger.info("✅ Discord client destroyed");
      }

      logger.info("🔄 Cleanup completed");
    } catch (error) {
      logger.error({ err: error }, "❌ Error during cleanup");
    }

    process.exit(0);
  };

  // Handle various shutdown signals
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGUSR1", cleanup);
  process.on("SIGUSR2", cleanup);

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error({ err: error }, "❌ Uncaught exception");
    cleanup();
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "❌ Unhandled promise rejection");
    cleanup();
  });
}

// Setup graceful shutdown
setupGracefulShutdown();

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
