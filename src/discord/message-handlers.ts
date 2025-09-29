import type { Message, TextChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { splitMessage } from "#/discord/message-utils";
import { periodicCrawler } from "#/jobs/crawler.job";
import { runNewsJob } from "#/jobs/news.job";

export async function handleNewsCommand(message: Message) {
  const summaries = await runNewsJob();

  if (!summaries) {
    await message.reply(
      "⏳ No articles with content found. The periodic crawler may need more time to crawl content."
    );
    return;
  }

  const chunks = splitMessage(summaries);

  if (chunks.length === 0) {
    await message.reply("No summaries found");
    return;
  }

  await message.reply(chunks[0]);

  if (!message.channel || message.channel.type !== ChannelType.GuildText) {
    return;
  }

  const textChannel = message.channel as TextChannel;

  for (let index = 1; index < chunks.length; index++) {
    await textChannel.send(chunks[index]);
  }
}

export async function handleCrawlerStatusCommand(message: Message) {
  const status = periodicCrawler.getStatus();
  const statusMessage = `🤖 **Crawler Status**
**Running:** ${status.isRunning ? "✅ Yes" : "❌ No"}
**Scheduled:** ${status.isScheduled ? "✅ Yes" : "❌ No"}
**Schedule:** ${status.schedule}
**Max Articles per Batch:** ${status.config.maxArticlesPerBatch}
**Batch Size:** ${status.config.batchSize}`;

  await message.reply(statusMessage);
}

export async function handleCrawlerRunCommand(message: Message) {
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
