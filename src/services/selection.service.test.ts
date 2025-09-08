import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "#/db/index.js";
import { selectArticlesForContentScraping } from "./selection.service.js";

// Mock database module
vi.mock("#/db/index.js", () => ({
  db: {
    query: {
      articles: {
        findMany: vi.fn(),
      },
    },
  },
}));

// Mock logger to avoid logging when running tests
vi.mock("#/config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("selection.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should select the latest 5 articles from the database with their sources", async () => {
    // Mock data that we expect the DB to return
    const mockArticles = [
      { id: 1, title: "Article 1" },
      { id: 2, title: "Article 2" },
    ];
    // @ts-expect-error
    vi.mocked(db.query.articles.findMany).mockResolvedValue(mockArticles);

    // Call the function we want to test
    const selectedArticles = await selectArticlesForContentScraping();

    // Check the result
    expect(db.query.articles.findMany).toHaveBeenCalledOnce();
    expect(db.query.articles.findMany).toHaveBeenCalledWith({
      orderBy: expect.any(Array),
      limit: 5,
      with: { source: true },
    });
    expect(selectedArticles).toEqual(mockArticles);
  });
});
