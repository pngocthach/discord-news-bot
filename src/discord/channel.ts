import type { Client, TextChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { logger } from "#/config/logger";

export async function fetchTextChannel(client: Client, channelId: string) {
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    logger.warn(
      { channelId },
      "❌ Discord channel not found. Skipping scheduled news delivery."
    );
    return null;
  }

  if (channel.type !== ChannelType.GuildText) {
    logger.warn(
      { channelId, channelType: channel.type },
      "❌ Discord channel is not a guild text channel. Skipping scheduled news delivery."
    );
    return null;
  }

  return channel as TextChannel;
}
