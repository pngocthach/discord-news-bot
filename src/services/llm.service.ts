import { b } from "#/baml_client";
import type { SummaryOutput } from "#/baml_client/types";
import type { articles as _articles } from "#/db/schema";

type Article = typeof _articles.$inferSelect;

export async function getArticlesSummaries(
  articles: Article[]
): Promise<SummaryOutput> {
  const formattedArticles = articles.map((article) => ({
    title: article.title,
    snippet: article.snippet ?? "",
    content: article.content,
    source_link: article.link,
  }));

  return await b.SummarizeArticle(formattedArticles);
}
