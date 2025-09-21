import type { DailyDigest } from "#/baml_client/types";
import { logger } from "#/config/logger";
import { selectRecentArticles } from "#/services/article.service";
import { getArticlesSummaries } from "#/services/llm.service";

/**
 * Generate news summary from articles that have been crawled by the periodic crawler.
 * This job no longer handles crawling - that's done by the periodic crawler.
 */
export async function runNewsJob() {
  logger.info("📰 Starting news summary generation...");
  try {
    // Get recent articles with content (should be already crawled by periodic crawler)
    const MAX_ARTICLES = 100;
    const latestArticles = await selectRecentArticles();

    if (latestArticles.length === 0) {
      logger.warn("No recent articles found for summary generation.");
      return null;
    }

    // Filter articles that have content (crawled by periodic crawler)
    const articlesWithContent = latestArticles.filter(
      (article) =>
        article.content &&
        article.content.trim() !== "" &&
        article.content !== "No content available" &&
        article.content !== "Content crawling failed"
    );

    if (articlesWithContent.length === 0) {
      logger.warn(
        "No recent articles with content found. Periodic crawler may need more time."
      );
      return null;
    }

    logger.info(
      `Found ${articlesWithContent.length} articles with content out of ${latestArticles.length} recent articles`
    );

    // Generate summaries using LLM
    const summaries = await getArticlesSummaries(
      articlesWithContent.slice(0, MAX_ARTICLES)
    );

    logger.info({ summaries }, "Generated summaries for latest articles.");
    return formatSummaries(summaries);
  } catch (error) {
    logger.error(
      { err: error },
      "An error occurred during news summary generation."
    );
    return null;
  } finally {
    logger.info("✅ News summary generation finished.");
  }
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
      markdown += `<${story.source_link}>\n`;
    }
  }

  // Add other topics section
  if (summaries.other_topics.length > 0) {
    markdown += "## Other Topics\n\n";
    for (const topic of summaries.other_topics) {
      markdown += `### ${topic.topic}\n`;
      markdown += `${topic.brief_update}\n\n`;
      markdown += `<${topic.source_link}>\n`;
    }
  }

  return markdown;
}
