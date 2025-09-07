import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "#/config/env.js";
import { logger } from "#/config/logger.js";
// biome-ignore lint/performance/noNamespaceImport: to import schema
import * as schema from "./schema.js";

const sql = neon(env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });

logger.info("Database connected successfully");
