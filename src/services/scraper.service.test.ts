import { describe, expect, it } from "vitest";
import { fetchScrapeSource } from "./scraper.service.js";

describe("scraper.service", () => {
  it("should fetch and scrape an HTML page correctly", async () => {
    // Dữ liệu source giả, trỏ đến URL và selectors tương ứng
    const mockSource = {
      id: 2,
      name: "Fake Scrape Site",
      url: "http://mock.dev/scrape", // <-- URL giả
      type: "scrape" as const,
      options: {
        // <-- Selectors khớp với HTML giả trong handlers.ts
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

    // Kiểm tra kết quả
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe("Test Scrape Article");
    expect(articles[0].link).toBe("http://example.com/scrape-article");
    expect(articles[1].title).toBe("Second Scrape Article");
  });
});
