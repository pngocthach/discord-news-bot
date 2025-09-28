import type { SummaryOutput } from "#/baml_client/types";
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
    const MAX_ARTICLES = 150;
    const latestArticles = await selectRecentArticles();

    if (latestArticles.length === 0) {
      logger.warn("No recent articles found for summary generation.");
      return null;
    }

    logger.info(
      `Found ${latestArticles.length} recent articles. Proceeding with fallback to snippets when content is missing.`
    );

    // Generate summaries using LLM
    const summaries = await getArticlesSummaries(
      latestArticles.slice(0, MAX_ARTICLES)
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

function formatSummaries(summaries: SummaryOutput): string {
  if (summaries.news_summary_with_category.length === 0) {
    return "Không tìm thấy tin tức nào để tóm tắt.";
  }

  let markdown = `## Overview\n${summaries.overview}\n\n`;

  const sortedSummaries = [...summaries.news_summary_with_category].sort(
    (a, b) => a.priority - b.priority
  );

  for (const summary of sortedSummaries) {
    markdown += `## ${summary.category}\n`;
    markdown += `${summary.summary}\n\n`;

    if (summary.important_source_link.length > 0) {
      markdown += "Links:\n";
      for (const link of summary.important_source_link) {
        markdown += `- <${link}>\n`;
      }
      markdown += "\n";
    }
  }

  return markdown.trimEnd();
}
