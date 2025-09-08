import { describe, expect, it, vi } from "vitest";
import { fetchScrapeSource, scrapeDetailContent } from "./scraper.service.js";

vi.mock("#/config/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("fetchScrapeSource", () => {
  it("should fetch and scrape an HTML page correctly", async () => {
    const mockSource = {
      id: 2,
      name: "Fake Scrape Site",
      url: "http://mock.dev/scrape",
      type: "scrape" as const,
      options: {
        scrapeOptions: {
          list: {
            container: "article.item-news",
            title: "h3.title-news a",
            link: "h3.title-news a",
            snippet: "p.description a",
          },
        },
      },
      isActive: true,
      createdAt: new Date(),
    };
    const articles = await fetchScrapeSource(mockSource);
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("Test Scrape Article");
  });
});

describe("scrapeDetailContent", () => {
  it("should scrape the main content from a detail page", async () => {
    const url = "http://mock.dev/scrape-detail";
    const selector = "main.fck_detail";
    const content = await scrapeDetailContent(url, selector);
    const expectedContent = "Đây là nội dung chi tiết của bài báo";
    expect(content).toContain(expectedContent);
  });

  it("should scrape the main content from a VnExpress detail page", async () => {
    const url = "http://mock.dev/scrape-detail-2";
    const selector = "article.fck_detail";
    const content = await scrapeDetailContent(url, selector);
    expect(content).toBeDefined();
  });

  it("should scrape the main content from real VnExpress detail page", async () => {
    const url = "https://vnexpress.net/david-beckham-tu-lam-mut-4936239.html";
    const selector = "article.fck_detail";
    const content = await scrapeDetailContent(url, selector);
    expect(content).toBeDefined();
  });
});

describe("scraper.service", () => {
  it("should fetch and scrape an HTML page correctly", async () => {
    // Mock data that we expect the DB to return
    const mockSource = {
      id: 2,
      name: "Fake Scrape Site",
      url: "http://mock.dev/scrape", // <-- Mock URL
      type: "scrape" as const,
      options: {
        // <-- Selectors match the mock HTML in handlers.ts
        scrapeOptions: {
          list: {
            container: "article.item-news",
            title: "h3.title-news a",
            link: "h3.title-news a",
            snippet: "p.description a",
          },
        },
      },
      isActive: true,
      createdAt: new Date(),
    };

    const articles = await fetchScrapeSource(mockSource);

    // Check the result
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("Test Scrape Article");
    expect(articles[0].link).toBe("http://example.com/scrape-article");
    expect(articles[1].title).toBe("Second Scrape Article");
  });
});
