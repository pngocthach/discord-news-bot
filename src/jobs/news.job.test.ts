import { describe, expect, it, vi } from "vitest";
import { runNewsJob } from "./news.job.js";

vi.mock("#/services/article.service.js");
vi.mock("#/services/sources.service.js");
vi.mock("#/config/logger.js");

describe("runNewsJob", () => {
  it("should run the full workflow correctly", async () => {
    const articleService = await import("#/services/article.service.js");
    const sourcesService = await import("#/services/sources.service.js");

    vi.spyOn(sourcesService, "getActiveSources").mockResolvedValue([
      {
        id: 1,
        name: "Test Source",
        type: "rss",
        url: "http://test.com",
        isActive: true,
        options: null,
        createdAt: new Date(),
      },
    ]);
    vi.spyOn(articleService, "fetchAllArticles").mockResolvedValue([
      { title: "A", link: "http://a.com", sourceId: 1, pubDate: new Date() },
    ]);
    vi.spyOn(articleService, "saveNewArticles").mockResolvedValue(1);
    vi.spyOn(
      articleService,
      "fetchContentForSelectedArticles"
    ).mockResolvedValue([]);

    await runNewsJob();

    expect(sourcesService.getActiveSources).toHaveBeenCalledOnce();
    expect(articleService.fetchAllArticles).toHaveBeenCalledOnce();
    expect(articleService.saveNewArticles).toHaveBeenCalledOnce();
    expect(
      articleService.fetchContentForSelectedArticles
    ).toHaveBeenCalledOnce();
  });
});
