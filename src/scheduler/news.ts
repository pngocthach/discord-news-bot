import type { Client, TextChannel } from "discord.js";
import cron, { type ScheduledTask } from "node-cron";
import { logger } from "#/config/logger";
import { fetchTextChannel } from "#/discord/channel";
import { splitMessage } from "#/discord/message-utils";

export const DEFAULT_NEWS_CRON = "0 7,13,22 * * *";
export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export type RunNewsJob = () => Promise<string | null>;

export type NewsSchedulerDeps = {
  client: Client;
  channelId: string;
  schedule?: string;
  timezone?: string;
  runJob: RunNewsJob;
};

async function sendSummaries(channel: TextChannel, summaries: string) {
  const chunks = splitMessage(summaries);

  for (const chunk of chunks) {
    await channel.send(chunk);
  }
}

async function executeNewsJob(
  client: Client,
  channelId: string,
  runJob: RunNewsJob
) {
  logger.info("⏰ Cron job triggered! Running the news job now...");

  try {
    const summaries = await runJob();

    if (!summaries) {
      logger.warn("⚠️ No summaries generated. Skipping scheduled delivery.");
      return;
    }

    const channel = await fetchTextChannel(client, channelId);

    if (!channel) {
      return;
    }

    await sendSummaries(channel, summaries);
    logger.info("✅ Scheduled news job completed successfully.");
  } catch (error) {
    logger.error({ err: error }, "❌ Scheduled news job failed.");
  }
}

export function scheduleNewsJob({
  client,
  channelId,
  schedule = DEFAULT_NEWS_CRON,
  timezone = DEFAULT_TIMEZONE,
  runJob,
}: NewsSchedulerDeps): ScheduledTask {
  logger.info(`📰 News job scheduled. Cron expression: ${schedule}`);

  return cron.schedule(
    schedule,
    () => executeNewsJob(client, channelId, runJob),
    { timezone }
  );
}
