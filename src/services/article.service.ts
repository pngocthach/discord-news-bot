import { logger } from "#/config/logger.js";
import { db } from "#/db/index.js";
import { articles, type sources } from "#/db/schema.js";
import { fetchRssSource } from "./rss.service.js";
import { fetchScrapeSource, scrapeDetailContent } from "./scraper.service.js";
import { selectArticlesForContentScraping } from "./selection.service.js";

type Source = typeof sources.$inferSelect;
type NewArticle = typeof articles.$inferInsert;

/**
 * Fetch all articles from a list of sources.
 */
export async function fetchAllArticles(
  activeSources: Source[]
): Promise<NewArticle[]> {
  const allFetchedArticles: NewArticle[] = [];
  for (const source of activeSources) {
    let fetchedArticles: NewArticle[] = [];
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
    allFetchedArticles.push(...fetchedArticles);
  }
  logger.info(
    `Total articles fetched from all sources: ${allFetchedArticles.length}`
  );
  return allFetchedArticles;
}

/**
 * Save new articles to the database.
 * @returns - The number of articles that were successfully inserted.
 */
export async function saveNewArticles(
  newArticles: NewArticle[]
): Promise<number> {
  if (newArticles.length === 0) {
    logger.info("No new articles to insert.");
    return 0;
  }

  logger.info("Inserting new articles into the database...");
  const insertResult = await db
    .insert(articles)
    .values(newArticles)
    .onConflictDoNothing()
    .returning({ insertedLink: articles.link });

  logger.info(`Successfully inserted ${insertResult.length} new articles.`);
  return insertResult.length;
}

/**
 * Fetch the full content for a list of articles.
 */
export async function fetchContentForSelectedArticles() {
  const articlesToSummarize: Omit<NewArticle, "sourceId" | "pubDate">[] = [];
  const latestArticles = await selectArticlesForContentScraping();

  if (latestArticles.length > 0) {
    for (const article of latestArticles) {
      let fullContent = article.snippet ?? "";
      const contentSelector =
        // @ts-expect-error: Skip type check for options because we know it exists for source 'scrape'
        article.source.options?.scrapeOptions?.detail?.content;

      if (article.source.type === "scrape" && contentSelector) {
        fullContent = await scrapeDetailContent(article.link, contentSelector);
      }

      articlesToSummarize.push({
        title: article.title,
        link: article.link,
        content: fullContent,
      });
    }
    logger.info("Finished fetching full content for selected articles.");
  }
  return articlesToSummarize;
}
