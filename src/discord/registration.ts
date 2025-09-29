import type { Client, Message } from "discord.js";
import { Events } from "discord.js";
import { logger } from "#/config/logger";

export type CommandHandler = (message: Message) => Promise<void> | void;

export function registerCommandHandlers(
  client: Client,
  handlers: Record<string, CommandHandler>
) {
  client.on(Events.MessageCreate, async (message) => {
    const handler = handlers[message.content];

    if (!handler) {
      return;
    }

    try {
      await handler(message);
    } catch (error) {
      logger.error({ err: error }, "❌ Command handler execution failed.");
    }
  });
}
