import { describe, expect, it } from "vitest";
import { fetchRssSource } from "./rss.service.js";

describe("rss.service", () => {
  it("should fetch and parse an RSS feed correctly", async () => {
    const mockSource = {
      id: 1,
      name: "Fake RSS",
      url: "http://mock.dev/rss",
      type: "rss" as const,
      options: null,
      isActive: true,
      createdAt: new Date(),
    };

    const articles = await fetchRssSource(mockSource);

    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].title).toBe("David Beckham tự làm mứt");
    expect(articles[0].link).toBe(
      "https://vnexpress.net/david-beckham-tu-lam-mut-4936239.html"
    );
    expect(articles[0].snippet).toBe(
      "Cựu danh thủ David Beckham gây chú ý với fan khi khoe mẻ mứt mận tự làm tại điền trang ở Cotswolds."
    );
  });
});
