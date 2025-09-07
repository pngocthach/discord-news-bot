import dotenv from "dotenv";
import { cleanEnv, str, url } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
  DATABASE_URL: url({
    desc: "The connection string for the Neon PostgreSQL database",
  }),

  DISCORD_TOKEN: str({
    desc: "The token for the Discord bot",
  }),

  CHANNEL_ID: str({
    desc: "The ID of the channel to send the messages to",
  }),

  GUILD_ID: str({
    desc: "The ID of the guild to send the messages to",
  }),

  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
    desc: "The running environment of the application",
  }),
});
