import { logger } from "#/config/logger.js";
import {
  fetchAllArticles,
  fetchContentForSelectedArticles,
  saveNewArticles,
} from "#/services/article.service.js";
import { getActiveSources } from "#/services/sources.service.js";

export async function runNewsJob() {
  logger.info("🚀 Starting job...");
  try {
    // 1. Get active sources
    const activeSources = await getActiveSources();
    if (activeSources.length === 0) {
      logger.warn("No active sources found. Exiting job.");
      return;
    }
    logger.info(`Found ${activeSources.length} active sources.`);

    // 2. Get all articles
    const allArticles = await fetchAllArticles(activeSources);

    // 3. Save new articles
    const insertedCount = await saveNewArticles(allArticles);

    // 4. Get detailed content (only when there are new articles)
    if (insertedCount > 0) {
      const articlesToSummarize = await fetchContentForSelectedArticles();

      if (articlesToSummarize.length > 0) {
        const MAX_CONTENT_LENGTH = 100;
        logger.debug(
          {
            title: articlesToSummarize[0].title,
            contentSnippet: `${articlesToSummarize[0].content?.substring(0, MAX_CONTENT_LENGTH)}...`,
          },
          "Sample of scraped content"
        );
      }

      // TODO: 5. Send articlesToSummarize to LLM
    }
  } catch (error) {
    logger.error({ err: error }, "An error occurred during job execution.");
  }
  logger.info("✅ Job finished.");
}
