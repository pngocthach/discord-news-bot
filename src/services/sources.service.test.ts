import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "#/db/index.js";
import { sources } from "#/db/schema.js";
import { getActiveSources } from "./sources.service.js";

vi.mock("#/db/index.js");

describe("getActiveSources", () => {
  it("should call db.query.sources.findMany with correct parameters", async () => {
    const mockSources = [
      {
        id: 1,
        name: "Test Source",
        type: "rss" as const,
        url: "http://test.com",
        isActive: true,
        options: null,
        createdAt: new Date(),
      },
    ];

    const mockFindMany = vi.fn().mockResolvedValue(mockSources);
    db.query = {
      // @ts-expect-error: Mocking for test
      sources: { findMany: mockFindMany },
    };

    const result = await getActiveSources();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: eq(sources.isActive, true),
    });
    expect(result).toEqual(mockSources);
  });
});
