import { eq } from "drizzle-orm";
import { logger } from "#/config/logger.js";
import { db } from "#/db/index.js";
import { articles, sources } from "#/db/schema.js";
import { fetchRssSource } from "#/services/rss.service.js";
import {
  fetchScrapeSource,
  scrapeDetailContent,
} from "#/services/scraper.service.js";
import { selectArticlesForContentScraping } from "#/services/selection.service.js";

type Article = typeof articles.$inferInsert;

export async function runNewsJob() {
  logger.info("🚀 Starting job: Fetch, Summarize, and Notify...");
  const allNewArticles: Article[] = [];

  try {
    // 1. Get all active sources
    const activeSources = await db.query.sources.findMany({
      where: eq(sources.isActive, true),
    });

    if (activeSources.length === 0) {
      logger.warn("No active sources found. Exiting job.");
      return;
    }
    logger.info(`Found ${activeSources.length} active sources to process.`);

    // 2. Get articles from all active sources
    for (const source of activeSources) {
      let fetchedArticles: Article[] = [];
      switch (source.type) {
        case "rss":
          fetchedArticles = await fetchRssSource(source);
          break;
        case "scrape":
          fetchedArticles = await fetchScrapeSource(source);
          break;
        default:
          logger.warn(
            { sourceName: source.name, type: source.type },
            "Unknown source type."
          );
          break;
      }
      allNewArticles.push(...fetchedArticles);
    }

    logger.info(
      `Total articles fetched from all sources: ${allNewArticles.length}`
    );

    // 3. Save new articles to database
    if (allNewArticles.length > 0) {
      logger.info("Inserting new articles into the database...");

      // Drizzle will try to insert all articles in the array.
      // onConflictDoNothing() will skip articles that already exist in the DB (based on 'link' UNIQUE).
      const insertResult = await db
        .insert(articles)
        .values(allNewArticles)
        .onConflictDoNothing()
        .returning({ insertedLink: articles.link }); // Return the link of the articles that were successfully inserted

      logger.info(`Successfully inserted ${insertResult.length} new articles.`);

      // TODO: 4. Get articles content
      const articlesToSummarize: Article[] = [];

      if (insertResult.length > 0) {
        logger.info("Selecting latest articles to fetch full content...");

        const articlesToScrape = await selectArticlesForContentScraping();

        logger.info(
          { titles: articlesToScrape.map((a) => a.title) },
          "Found latest articles for summarization."
        );

        for (const article of articlesToScrape) {
          let fullContent = article.snippet ?? "";
          const contentSelector =
            // @ts-expect-error: Skip type check for options because we know it exists for source 'scrape'
            article.source.options?.scrapeOptions?.detail?.content;

          if (article.source.type === "scrape" && contentSelector) {
            fullContent = await scrapeDetailContent(
              article.link,
              contentSelector
            );
          }

          articlesToSummarize.push({
            title: article.title,
            link: article.link,
            content: fullContent,
            sourceId: article.sourceId,
            pubDate: article.pubDate,
          });
        }
        logger.info("Finished fetching full content for selected articles.");
      }

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

      // TODO: 5. Gọi service tóm tắt
    } else {
      logger.info("No new articles to insert.");
    }
  } catch (error) {
    logger.error({ err: error }, "An error occurred during the job execution.");
  }

  logger.info("✅ Job finished.");
}
