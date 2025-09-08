import { beforeEach, describe, expect, it, vi } from "vitest";
import { runNewsJob } from "./news.job.js";

// Mock the services and DB
vi.mock("#/db/index.js");
vi.mock("#/services/scraper.service.js");
vi.mock("#/services/selection.service.js");
vi.mock("#/config/logger.js");

describe("runNewsJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the selection service and then scrape content", async () => {
    // Import the mocked modules
    const { db } = await import("#/db/index.js");
    const { scrapeDetailContent } = await import(
      "#/services/scraper.service.js"
    );
    const { selectArticlesForContentScraping } = await import(
      "#/services/selection.service.js"
    );

    // Mock data that we expect the selection service to return
    const mockSelectedArticles = [
      {
        id: 101,
        title: "Test Article",
        link: "http://example.com",
        pubDate: new Date(),
        source: {
          type: "scrape",
          options: { scrapeOptions: { detail: { content: ".content" } } },
        },
      },
    ];

    // Setup the mock
    // @ts-expect-error
    db.query = { sources: { findMany: vi.fn().mockResolvedValue([]) } }; // Mock the return value to an empty array to avoid running the fetch part
    // @ts-expect-error
    db.insert.mockReturnValue({
      onConflictDoNothing: vi
        .fn()
        .mockResolvedValue({ length: 1, command: "INSERT", rowCount: 1 }),
    });
    vi.mocked(selectArticlesForContentScraping).mockResolvedValue(
      // @ts-expect-error
      mockSelectedArticles
    );
    vi.mocked(scrapeDetailContent).mockResolvedValue("Scraped content");

    // Run the job
    await runNewsJob();

    // Check if the selection service was called
    expect(selectArticlesForContentScraping).toHaveBeenCalledOnce();
    // Check if the scrape service was called with the selected article
    expect(scrapeDetailContent).toHaveBeenCalledOnce();
  });
});
