import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "#/db/index.js";
import type { articles } from "#/db/schema.js";
import {
  saveNewArticles,
  selectArticlesForContentScraping,
} from "./article.service.js";

type Article = typeof articles.$inferInsert;

// Mock database module
vi.mock("#/db/index.js", () => ({
  db: {
    query: {
      articles: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}));

// Mock logger to avoid logging when running tests
vi.mock("#/config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("article.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveNewArticles", () => {
    it("should call db.insert with the correct values", async () => {
      const mockArticles: Article[] = [
        {
          title: "Article 1",
          link: "http://a.com",
          sourceId: 1,
          pubDate: new Date(),
        },
      ];

      const mockReturning = vi
        .fn()
        .mockResolvedValue([{ insertedLink: "http://a.com" }]);
      const mockOnConflictDoNothing = vi.fn().mockReturnValue({
        returning: mockReturning,
      });
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoNothing: mockOnConflictDoNothing,
      });
      const mockInsert = vi.fn().mockReturnValue({
        values: mockValues,
      });
      db.insert = mockInsert;

      const count = await saveNewArticles(mockArticles);

      expect(mockInsert).toHaveBeenCalledWith(expect.any(Object));
      expect(mockValues).toHaveBeenCalledWith(mockArticles);
      expect(mockOnConflictDoNothing).toHaveBeenCalled();
      expect(mockReturning).toHaveBeenCalledWith({
        insertedLink: expect.any(Object),
      });
      expect(count).toBe(1);
    });
  });

  describe("selectArticlesForContentScraping", () => {
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
});
