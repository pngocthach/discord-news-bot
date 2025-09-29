import { env } from "#/config/env";
import { logger } from "#/config/logger";
import { createDiscordClient, registerReadyListener } from "#/discord/client";
import {
  handleCrawlerRunCommand,
  handleCrawlerStatusCommand,
  handleNewsCommand,
} from "#/discord/message-handlers";
import { registerCommandHandlers } from "#/discord/registration";
import { periodicCrawler } from "#/jobs/crawler.job";
import { runNewsJob } from "#/jobs/news.job";
import { scheduleNewsJob } from "#/scheduler/news";
import { closeBrowser } from "#/services/scraper.service";

const client = createDiscordClient();
const channelId = env.CHANNEL_ID;

registerReadyListener({
  client,
  channelId,
  periodicCrawler,
});

registerCommandHandlers(client, {
  "/ping": async (message) => {
    await message.reply("Pong!");
  },
  "/dit me may": async (message) => {
    await message.reply("dit me may luon");
  },
  "/news": handleNewsCommand,
  "/crawler-status": handleCrawlerStatusCommand,
  "/crawler-run": handleCrawlerRunCommand,
});

const newsCronTask = scheduleNewsJob({
  client,
  channelId,
  runJob: runNewsJob,
});

client.login(env.DISCORD_TOKEN);

async function cleanup() {
  logger.info("🛑 Shutting down gracefully...");

  try {
    periodicCrawler.stop();
    logger.info("✅ Periodic crawler stopped");

    newsCronTask.stop();
    logger.info("✅ News cron job stopped");

    await closeBrowser();
    logger.info("✅ Browser instance closed");

    if (client.readyAt) {
      client.destroy();
      logger.info("✅ Discord client destroyed");
    }

    logger.info("🔄 Cleanup completed");
  } catch (error) {
    logger.error({ err: error }, "❌ Error during cleanup");
  }
}

function setupGracefulShutdown() {
  const shutdownSignals: NodeJS.Signals[] = [
    "SIGTERM",
    "SIGINT",
    "SIGUSR1",
    "SIGUSR2",
  ];

  for (const signal of shutdownSignals) {
    process.on(signal, () => {
      cleanup().finally(() => {
        process.exit(0);
      });
    });
  }

  process.on("uncaughtException", (error) => {
    logger.error({ err: error }, "❌ Uncaught exception");
    cleanup().finally(() => {
      process.exit(1);
    });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "❌ Unhandled promise rejection");
    cleanup().finally(() => {
      process.exit(1);
    });
  });
}

setupGracefulShutdown();
