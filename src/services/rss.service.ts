import RssParser from "rss-parser";
import { logger } from "#/config/logger.js";
import type { sources } from "#/db/schema.js";

type Source = typeof sources.$inferSelect;

const parser = new RssParser();

export async function fetchRssSource(source: Source) {
  logger.info({ sourceName: source.name }, "Fetching RSS source...");
  try {
    const feed = await parser.parseURL(source.url);
    if (!feed.items) {
      logger.warn({ sourceName: source.name }, "RSS feed is empty.");
      return [];
    }

    const articles = feed.items
      .map((item) => ({
        sourceId: source.id,
        title: item.title ?? "No title",
        link: item.link ?? "",
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        snippet: item.contentSnippet ?? "",
      }))
      .filter((article) => article.link);

    logger.info(
      { sourceName: source.name, count: articles.length },
      "Fetched RSS source successfully."
    );
    return articles;
  } catch (error) {
    logger.error(
      { err: error, sourceName: source.name },
      "Failed to fetch RSS source."
    );
    return [];
  }
}
