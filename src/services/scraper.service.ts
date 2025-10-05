import axios from "axios";
import { load } from "cheerio";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { logger } from "#/config/logger";
import type { articles, sources } from "#/db/schema";

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

// Browser management configuration
const SCRAPER_CONFIG = {
  // Page timeout in milliseconds - Increased for low-memory environments like Render.com
  PAGE_TIMEOUT: 90_000, // 90 seconds for slow servers
  // Navigation timeout
  NAVIGATION_TIMEOUT: 60_000, // 60 seconds
  // Maximum content length
  MAX_CONTENT_LENGTH: 20_000,
  // Browser launch args for memory optimization (especially for 500MB RAM)
  BROWSER_ARGS: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    "--memory-pressure-off",
    "--max_old_space_size=256", // Reduced for 500MB RAM environment
    "--disable-extensions",
    "--disable-plugins",
    "--disable-images",
    "--disable-javascript", // We don't need JS for content scraping
    "--disable-gpu",
    "--single-process", // Use single process to reduce memory
  ],
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

// Browser singleton to ensure only one browser instance at a time
class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private isLaunching = false;

  private constructor() {}

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  async getBrowser(): Promise<Browser> {
    // If browser exists and is connected, return it
    if (this.browser?.connected) {
      return this.browser;
    }

    // If browser is currently launching, wait for it
    if (this.isLaunching) {
      const WAIT_INTERVAL = 100; // milliseconds
      while (this.isLaunching) {
        await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL));
      }
      if (this.browser?.connected) {
        return this.browser;
      }
    }

    // Launch new browser
    return this.launchBrowser();
  }

  private async launchBrowser(): Promise<Browser> {
    this.isLaunching = true;

    try {
      logger.debug(
        "🚀 Launching single browser instance with memory optimization..."
      );

      this.browser = await puppeteer.launch({
        headless: true,
        args: SCRAPER_CONFIG.BROWSER_ARGS,
      });

      // Handle browser disconnection
      this.browser.on("disconnected", () => {
        logger.debug("🔌 Browser disconnected");
        this.browser = null;
      });

      logger.debug("✅ Browser launched successfully");
      return this.browser;
    } finally {
      this.isLaunching = false;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser?.connected) {
      logger.debug("🧹 Closing browser instance...");
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Create and configure a page with proper settings for low-memory environment
 */
async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  // Set user agent
  await page.setUserAgent(SCRAPER_CONFIG.USER_AGENT);

  // Set viewport for consistent rendering (smaller for memory)
  await page.setViewport({ width: 1280, height: 720 });

  // Disable request interception since we already disabled JS and images in browser args
  // This reduces overhead in low-memory environments

  return page;
}

/**
 * Scrape content from the URL of an article with proper memory management.
 * Uses singleton browser to ensure only one browser instance at a time.
 * @param url - The URL of the article
 * @param contentSelector - CSS selector for the area containing the main content
 * @param maxContentLength - The maximum length of the content
 * @returns - A string containing the cleaned content, or empty string if failed
 */
export async function scrapeDetailContent(
  url: string,
  contentSelector: string,
  maxContentLength = SCRAPER_CONFIG.MAX_CONTENT_LENGTH
): Promise<string> {
  const browserManager = BrowserManager.getInstance();
  let page: Page | null = null;

  try {
    logger.debug({ url }, "🌐 Starting to scrape detail content...");

    // Get singleton browser instance
    const browser = await browserManager.getBrowser();

    // Create and configure page
    page = await createPage(browser);

    // Navigate to URL with timeout
    logger.debug({ url }, "📄 Navigating to page...");
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: SCRAPER_CONFIG.NAVIGATION_TIMEOUT,
    });

    // Extract content
    logger.debug(
      { url, selector: contentSelector },
      "🔍 Extracting content..."
    );
    const content = await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        return "";
      }
      
      // Extract text from all matching elements and join them
      const textContent = Array.from(elements)
        .map(element => element.textContent?.trim() || "")
        .filter(text => text.length > 0) // Remove empty elements
        .join("\n"); // Join with double newlines for readability
      
      return textContent;
    }, contentSelector);

    if (!content) {
      logger.warn(
        { url, selector: contentSelector },
        "⚠️ No content found with selector"
      );
      return "";
    }

    // Clean and truncate content
    const truncatedContent = content
      .substring(0, maxContentLength)
      .trim()
      .replace(/\s+/g, " ");

    logger.info(
      {
        url,
        originalLength: content.length,
        truncatedLength: truncatedContent.length,
        selector: contentSelector,
      },
      "✅ Successfully scraped detail content"
    );

    return truncatedContent;
  } catch (error) {
    logger.error(
      {
        err: error,
        url,
        selector: contentSelector,
      },
      "❌ Failed to scrape detail content"
    );
    return "";
  } finally {
    // Only close the page, keep browser alive for reuse
    try {
      if (page && !page.isClosed()) {
        logger.debug("🧹 Closing page...");
        await page.close();
      }
    } catch (pageError) {
      logger.warn({ err: pageError }, "⚠️ Error closing page");
    }

    logger.debug("🔄 Page resources cleaned up (browser kept alive)");
  }
}

/**
 * Cleanup function to close the singleton browser instance
 * Should be called during application shutdown
 */
export async function closeBrowser(): Promise<void> {
  const browserManager = BrowserManager.getInstance();
  await browserManager.closeBrowser();
}
