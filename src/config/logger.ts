import pino from "pino";
import { env } from "#/config/env.js";

// Configure transport targets based on environment
const targets: pino.TransportTargetOptions[] = [];

// Better Stack integration for production and development
if (env.BETTER_STACK_SOURCE) {
  targets.push({
    target: "@logtail/pino",
    options: {
      sourceToken: env.BETTER_STACK_SOURCE,
      options: {
        endpoint: env.BETTER_STACK_KEY,
      },
    },
  });
}

// Pretty printing for development
if (env.NODE_ENV === "development") {
  targets.push({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
      ignore: "pid,hostname",
    },
  });
}

const transport = pino.transport({
  targets,
});

// Configure Pino logger
export const logger = pino(
  {
    level: process.env.PINO_LOG_LEVEL || "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);
