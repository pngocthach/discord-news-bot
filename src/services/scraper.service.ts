import axios from "axios";
import { load } from "cheerio";
import { logger } from "#/config/logger.js";
import type { articles, sources } from "#/db/schema.js";

type Source = typeof sources.$inferSelect;
type Article = typeof articles.$inferInsert;

export async function fetchScrapeSource(source: Source) {
  logger.info({ sourceName: source.name }, "Fetching scrape source...");
  // @ts-expect-error: Skip type check for options because we know it exists for source 'scrape'
  const selectors = source.options?.scrapeOptions.list;

  if (!selectors) {
    logger.error(
      { sourceName: source.name },
      "Scrape source is missing selectors configuration."
    );
    return [];
  }

  try {
    const response = await axios.get(source.url);
    const $ = load(response.data);
    const articlesResult: Article[] = [];

    $(selectors.container).each((_i, element) => {
      const title = $(element).find(selectors.title).text().trim();
      let link = $(element).find(selectors.link).attr("href") || "";
      const snippet = selectors.snippet
        ? $(element).find(selectors.snippet).text().trim()
        : "";

      // Handle relative link (e.g. /so-hoa/san-pham.html)
      if (link && !link.startsWith("http")) {
        link = new URL(link, source.url).href;
      }

      if (title && link) {
        articlesResult.push({
          sourceId: source.id,
          title,
          link,
          pubDate: new Date(), // Scrape is often difficult to get the exact pubDate, so use the current time
          snippet,
        });
      }
    });

    logger.info(
      { sourceName: source.name, count: articlesResult.length },
      "Fetched scrape source successfully."
    );
    return articlesResult;
  } catch (error) {
    logger.error(
      { err: error, sourceName: source.name },
      "Failed to fetch scrape source."
    );
    return [];
  }
}
