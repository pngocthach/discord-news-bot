import dotenv from "dotenv";
import { cleanEnv, num, str, url } from "envalid";

dotenv.config({ quiet: true });

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

  PORT: num({
    desc: "The port to run the server on",
    default: 10_000,
  }),

  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
    desc: "The running environment of the application",
  }),
});
