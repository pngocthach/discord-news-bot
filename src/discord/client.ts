import { Client, Events, GatewayIntentBits, IntentsBitField } from "discord.js";
import { logger } from "#/config/logger";
import type { PeriodicCrawler } from "#/jobs/crawler.job";

type ReadyListenerOptions = {
  client: Client;
  channelId: string;
  periodicCrawler: PeriodicCrawler;
};

export function createDiscordClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.GuildMembers,
    ],
  });
}

export function registerReadyListener({
  client,
  channelId,
  periodicCrawler,
}: ReadyListenerOptions) {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.displayName}`);
    const channel = readyClient.channels.cache.get(channelId);
    logger.info(`Channel: ${channel}`);

    periodicCrawler.start();
    logger.info("🤖 Periodic crawler started automatically");
  });
}
