import axios from "axios";
import { load } from "cheerio";
import puppeteer, { type Browser } from "puppeteer";
import { logger } from "#/config/logger.js";
import type { articles, sources } from "#/db/schema.js";

type Source = typeof sources.$inferSelect;
type Article = typeof articles.$inferInsert;

const browserHeaders = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

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
    const response = await axios.get(source.url, { headers: browserHeaders });
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

/**
 * Scrape content from the URL of an article.
 * @param url - The URL of the article
 * @param contentSelector - CSS selector for the area containing the main content
 * @param maxContentLength - The maximum length of the content
 * @returns - A string containing the cleaned content
 */
export async function scrapeDetailContent(
  url: string,
  contentSelector: string,
  maxContentLength = 20_000
): Promise<string> {
  let browser: Browser | null = null;
  try {
    logger.info({ url }, "Launching browser to scrape detail content...");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded" });
    const html = await page.content();
    const $ = load(html);
    const content = $(contentSelector).text().trim();

    const truncatedContent = content
      .substring(0, maxContentLength)
      .trim()
      .replace(/\s+/g, " ");

    logger.info(
      { url, length: content.length },
      "Successfully scraped detail content with Puppeteer."
    );
    return truncatedContent;
  } catch (error) {
    logger.error(
      { err: error, url },
      "Failed to scrape detail content with Puppeteer."
    );
    return "";
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
