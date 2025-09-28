import type { NewsSummaryWithCategory } from "#/baml_client/types";
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

function formatSummaries(summaries: NewsSummaryWithCategory[]): string {
  if (summaries.length === 0) {
    return "Không tìm thấy tin tức nào để tóm tắt.";
  }

  let markdown = "# Bản tin tổng hợp\n\n";

  for (const summary of summaries) {
    markdown += `## ${summary.category}\n`;
    markdown += `${summary.summary}\n\n`;

    if (summary.important_source_link.length > 0) {
      markdown += "Nguồn quan trọng:\n";
      for (const link of summary.important_source_link) {
        markdown += `- <${link}>\n`;
      }
      markdown += "\n";
    }
  }

  return markdown.trimEnd();
}
