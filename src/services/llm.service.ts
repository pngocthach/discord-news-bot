import { b } from "#/baml_client";
import type { articles as _articles } from "#/db/schema";

type Article = typeof _articles.$inferSelect;

export async function getArticlesSummaries(articles: Article[]) {
  return await b.SummarizeArticle(
    articles.map((article) => ({
      title: article.title,
      snippet: article.snippet ?? "",
      content: article.content,
      source_link: article.link,
    }))
  );
}
