import pino from "pino";
import { env } from "#/config/env.js";

// Configure Pino logger
export const logger = pino({
  // Set the minimum log level to display
  level: "info",

  // Configure pretty printing for development environment
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
