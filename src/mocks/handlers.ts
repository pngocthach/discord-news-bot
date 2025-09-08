import fs from "node:fs";
import { HttpResponse, http } from "msw";

const fakeRssXml = fs.readFileSync(
  new URL("./data/fake.rss", import.meta.url),
  "utf8"
);

const fakeScrapeHtml = fs.readFileSync(
  new URL("./data/fake.html", import.meta.url),
  "utf8"
);

const fakeArticleDetailHtml = fs.readFileSync(
  new URL("./data/fake-detail.html", import.meta.url),
  "utf8"
);

const vnexpressHtml = fs.readFileSync(
  new URL("./data/vnexpress.html", import.meta.url),
  "utf8"
);

export const handlers = [
  http.get("http://mock.dev/rss", () => {
    return new HttpResponse(fakeRssXml, {
      headers: { "Content-Type": "application/xml" },
    });
  }),

  http.get("http://mock.dev/scrape", () => {
    return HttpResponse.html(fakeScrapeHtml);
  }),

  http.get("http://mock.dev/scrape-detail", () => {
    return HttpResponse.html(fakeArticleDetailHtml);
  }),

  http.get("http://mock.dev/scrape-detail-2", () => {
    return HttpResponse.html(vnexpressHtml);
  }),
];
