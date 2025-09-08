import { desc } from "drizzle-orm";
import { logger } from "#/config/logger.js";
import { db } from "#/db/index.js";
import { articles } from "#/db/schema.js";

const ARTICLES_TO_SELECT = 5;

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
