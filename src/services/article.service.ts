import { desc, eq, gte } from "drizzle-orm";
import { logger } from "#/config/logger.js";
import { db } from "#/db/index.js";
import { articles, type sources } from "#/db/schema.js";
import { fetchRssSource } from "./rss.service.js";
import { fetchScrapeSource, scrapeDetailContent } from "./scraper.service.js";

const ARTICLES_TO_SELECT = 5;

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
 * Select articles to fetch full content.
 * Currently: Select 5 latest articles.
 * @returns - An array of articles with source information.
 */
export async function selectArticlesForContentScraping() {
  logger.info(
    `Selecting ${ARTICLES_TO_SELECT} latest articles to fetch full content...`
  );

  const latestArticles = await db.query.articles.findMany({
    orderBy: [desc(articles.pubDate)],
    limit: ARTICLES_TO_SELECT,
    with: {
      source: true,
    },
  });

  logger.info(
    {
      count: latestArticles.length,
      titles: latestArticles.map((a) => a.title),
    },
    "Selected articles for processing."
  );

  return latestArticles;
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

      if (contentSelector) {
        logger.info({ url: article.link }, "Scraping detail content...");
        fullContent = await scrapeDetailContent(article.link, contentSelector);
      }

      articlesToSummarize.push({
        title: article.title,
        link: article.link,
        content: fullContent,
      });

      await db
        .update(articles)
        .set({ content: fullContent })
        .where(eq(articles.id, article.id));
    }
    logger.info("Finished fetching full content for selected articles.");
  }
  return articlesToSummarize;
}

/**
 * Get all articles published in the last N hours.
 * @param hours - The number of hours to calculate from the current time. Default is 24.
 * @returns - An array of articles.
 */
export async function selectRecentArticles(hours = 24) {
  logger.info(`Selecting articles from the last ${hours} hours...`);

  const dateOffset = new Date();
  dateOffset.setHours(dateOffset.getHours() - hours);

  const recentArticles = await db.query.articles.findMany({
    where: gte(articles.pubDate, dateOffset),
    orderBy: [desc(articles.pubDate)],
    with: {
      source: true,
    },
  });

  logger.info(
    `Found ${recentArticles.length} articles from the last ${hours} hours.`
  );
  return recentArticles;
}
