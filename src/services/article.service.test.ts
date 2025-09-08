import { describe, expect, it, vi } from "vitest";
import { db } from "#/db/index.js";
import type { articles } from "#/db/schema.js";
import { saveNewArticles } from "./article.service.js";

type Article = typeof articles.$inferInsert;

vi.mock("#/db/index.js");
vi.mock("#/config/logger.js");

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
