import { eq } from "drizzle-orm";
import { logger } from "#/config/logger.js";
import { db } from "#/db/index.js";
import { sources } from "#/db/schema.js";

export async function runNewsJob() {
  logger.info("🚀 Starting job: Fetch, Summarize, and Notify...");

  try {
    const activeSources = await db.query.sources.findMany({
      where: eq(sources.isActive, true),
    });

    if (activeSources.length === 0) {
      logger.warn("No active sources found. Exiting job.");
      return;
    }

    logger.info(`Found ${activeSources.length} active sources to process.`);
    logger.info(
      activeSources.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        url: s.url,
      }))
    );

    // ... Các bước xử lý tiếp theo ...
  } catch (error) {
    logger.error({ err: error }, "An error occurred during the job execution.");
  }

  logger.info("✅ Job finished.");
}
