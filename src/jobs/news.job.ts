import type { DailyDigest } from "#/baml_client/types";
import { logger } from "#/config/logger.js";
import {
  fetchAllArticles,
  fetchContentForSelectedArticles,
  saveNewArticles,
  selectRecentArticles,
} from "#/services/article.service.js";
import { getArticlesSummaries } from "#/services/llm.service";
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
      await fetchContentForSelectedArticles();
    }

    // TODO: 5. Send latest articles to LLM
    const latestArticles = await selectRecentArticles();
    if (latestArticles.length > 0) {
      const summaries = await getArticlesSummaries(latestArticles);
      logger.info({ summaries }, "Summaries of latest articles.");
      return formatSummaries(summaries);
    }
  } catch (error) {
    logger.error({ err: error }, "An error occurred during job execution.");
  }
  logger.info("✅ Job finished.");
}

function formatSummaries(summaries: DailyDigest): string {
  let markdown = `# ${summaries.digest_title}\n\n`;

  // Add overview section
  markdown += `## Overview\n${summaries.overview}\n\n`;

  // Add main stories section
  if (summaries.main_stories.length > 0) {
    markdown += "## Main Stories\n\n";
    for (const story of summaries.main_stories) {
      markdown += `### ${story.headline}\n`;
      if (story.category) {
        markdown += `*Category: ${story.category}*\n\n`;
      }
      markdown += `${story.summary}\n\n`;
      markdown += `<${story.source_link})>\n`;
    }
  }

  // Add other topics section
  if (summaries.other_topics.length > 0) {
    markdown += "## Other Topics\n\n";
    for (const topic of summaries.other_topics) {
      markdown += `### ${topic.topic}\n`;
      markdown += `${topic.brief_update}\n\n`;
      markdown += `<${topic.source_link}>)\n\n`;
    }
  }

  return markdown;
}
