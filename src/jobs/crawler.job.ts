import { and, desc, eq, isNull } from "drizzle-orm";
import { type ScheduledTask, schedule } from "node-cron";
import { logger } from "#/config/logger";
import { db } from "#/db/index";
import { articles, type sources } from "#/db/schema";
import { fetchAllArticles, saveNewArticles } from "#/services/article.service";
import { scrapeDetailContent } from "#/services/scraper.service";
import { getActiveSources } from "#/services/sources.service";

type Source = typeof sources.$inferSelect;

/**
 * Configuration for the crawler job
 */
const CRAWLER_CONFIG = {
  // Run every 30 minutes
  schedule: "*/30 * * * *",
  // Maximum articles to crawl content in one batch
  maxArticlesPerBatch: 30,
  // Priority crawling: how many articles to process at once
  batchSize: 1,
};

/**
 * Periodic crawler job that:
 * 1. Fetches new articles from RSS/scraping sources
 * 2. Saves new articles to database (avoiding duplicates)
 * 3. Crawls full content for articles that don't have content yet
 * 4. Prioritizes crawling from newest to oldest articles
 */
export class PeriodicCrawler {
  private isRunning = false;
  private cronJob: ScheduledTask | null = null;

  /**
   * Start the periodic crawler
   */
  start() {
    if (this.cronJob) {
      logger.warn("Crawler is already running");
      return;
    }

    logger.info("🕒 Starting periodic crawler...");
    this.cronJob = schedule(
      CRAWLER_CONFIG.schedule,
      async () => {
        await this.runCrawlerCycle();
      },
      {
        timezone: "Asia/Ho_Chi_Minh",
      }
    );

    logger.info(
      `✅ Periodic crawler started with schedule: ${CRAWLER_CONFIG.schedule}`
    );
  }

  /**
   * Stop the periodic crawler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info("🛑 Periodic crawler stopped");
    }
  }

  /**
   * Run one crawler cycle manually
   */
  async runCrawlerCycle() {
    if (this.isRunning) {
      logger.warn("Crawler cycle is already running, skipping...");
      return;
    }

    this.isRunning = true;
    logger.info("🚀 Starting crawler cycle...");

    try {
      // Step 1: Fetch and save new articles
      await this.fetchAndSaveNewArticles();

      // Step 2: Crawl content for articles without content (prioritize newest first)
      await this.crawlMissingContent();

      logger.info("✅ Crawler cycle completed successfully");
    } catch (error) {
      logger.error({ err: error }, "❌ Error during crawler cycle");
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch new articles from all active sources and save to database
   */
  private async fetchAndSaveNewArticles() {
    logger.info("📰 Fetching new articles from sources...");

    // Get active sources
    const activeSources = await getActiveSources();
    if (activeSources.length === 0) {
      logger.warn("No active sources found");
      return;
    }

    logger.info(`Found ${activeSources.length} active sources`);

    // Fetch articles from all sources
    const allArticles = await fetchAllArticles(activeSources);

    // Save new articles (database will handle duplicates)
    const savedCount = await saveNewArticles(allArticles);

    logger.info(
      `💾 Saved ${savedCount} new articles out of ${allArticles.length} fetched`
    );
  }

  /**
   * Crawl full content for articles that don't have content yet
   * Prioritizes from newest to oldest articles
   */
  private async crawlMissingContent() {
    logger.info("🔍 Crawling missing content for articles...");

    // Find articles without content, ordered by newest first (priority crawling)
    const articlesWithoutContent = await db.query.articles.findMany({
      where: and(
        isNull(articles.content)
        // Only crawl articles that were recently fetched (within last 24 hours)
        // to avoid crawling very old articles
      ),
      orderBy: [desc(articles.pubDate), desc(articles.fetchedAt)],
      limit: CRAWLER_CONFIG.maxArticlesPerBatch,
      with: {
        source: true,
      },
    });

    if (articlesWithoutContent.length === 0) {
      logger.info("No articles found that need content crawling");
      return;
    }

    logger.info(
      `Found ${articlesWithoutContent.length} articles without content`
    );

    // Process articles in batches (from top to bottom priority)
    for (
      let i = 0;
      i < articlesWithoutContent.length;
      i += CRAWLER_CONFIG.batchSize
    ) {
      const batch = articlesWithoutContent.slice(
        i,
        i + CRAWLER_CONFIG.batchSize
      );
      await this.crawlContentBatch(batch);
    }

    logger.info("✅ Finished crawling missing content");
  }

  /**
   * Crawl content for a batch of articles
   */
  private async crawlContentBatch(
    articleBatch: Array<{
      id: number;
      title: string;
      link: string;
      snippet: string | null;
      source: Source;
    }>
  ) {
    logger.info(
      `📄 Processing batch of ${articleBatch.length} articles for content crawling`
    );

    for (const article of articleBatch) {
      const articleInfo = {
        id: article.id,
        title: article.title,
        source: article.source.name,
        link: article.link,
      };

      logger.info(
        { article: articleInfo },
        `🚀 Starting to crawl content for article: ${article.title}`
      );

      try {
        // Check if this source supports detail content scraping
        const contentSelector =
          // @ts-expect-error: Skip type check for options because we know it exists for source 'scrape'
          article.source.options?.scrapeOptions?.detail?.content;

        if (!contentSelector) {
          // Skip crawling if no content selector available - keep content as null
          logger.info(
            { article: articleInfo },
            `⏭️ Skipping content crawl for article (no selector): ${article.title}`
          );
          continue;
        }

        // Scrape detailed content
        logger.info(
          { article: articleInfo },
          `🔗 Scraping detail content from: ${article.link}`
        );
        const fullContent = await scrapeDetailContent(
          article.link,
          contentSelector
        );

        // Only update content if scraping was successful (not empty)
        if (fullContent?.trim()) {
          await db
            .update(articles)
            .set({ content: fullContent })
            .where(eq(articles.id, article.id));

          logger.info(
            {
              article: articleInfo,
              contentLength: fullContent.length,
            },
            `✅ Successfully crawled content for article: ${article.title} (${fullContent.length} chars)`
          );
        } else {
          logger.warn(
            { article: articleInfo },
            `⚠️ No content found for article: ${article.title} - keeping content as null`
          );
        }

        // Small delay to be respectful to the source server
        const DELAY_BETWEEN_REQUESTS = 1000;
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
        );
      } catch (error) {
        logger.error(
          {
            err: error,
            article: articleInfo,
          },
          `❌ Failed to crawl content for article: ${article.title} - keeping content as null`
        );
        // Don't update content on error - keep it as null so it can be retried later
      }
    }
  }

  /**
   * Get crawler status
   */
  getStatus() {
    return {
      isScheduled: !!this.cronJob,
      isRunning: this.isRunning,
      schedule: CRAWLER_CONFIG.schedule,
      config: CRAWLER_CONFIG,
    };
  }
}

// Export singleton instance
export const periodicCrawler = new PeriodicCrawler();
