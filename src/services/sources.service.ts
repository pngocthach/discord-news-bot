import { eq } from "drizzle-orm";
import { db } from "#/db/index.js";
import { sources } from "#/db/schema.js";

/**
 * Get all active sources from the database.
 */
export async function getActiveSources() {
  return await db.query.sources.findMany({ where: eq(sources.isActive, true) });
}
