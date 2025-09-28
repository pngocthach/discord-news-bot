import { b } from "#/baml_client";
import type { SummaryOutput } from "#/baml_client/types";
import type { articles as _articles } from "#/db/schema";

type Article = typeof _articles.$inferSelect;

const INVALID_CONTENT_VALUES = new Set([
  "No content available",
  "Content crawling failed",
]);

const sanitizeText = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  if (INVALID_CONTENT_VALUES.has(trimmed)) {
    return null;
  }

  return trimmed;
};

export async function getArticlesSummaries(
  articles: Article[]
): Promise<SummaryOutput> {
  const formattedArticles = articles.map((article) => {
    const sanitizedSnippet = sanitizeText(article.snippet) ?? "";
    const resolvedContent = sanitizeText(article.content) ?? sanitizedSnippet;

    return {
      title: article.title,
      snippet: sanitizedSnippet,
      content: resolvedContent,
      source_link: article.link,
    };
  });

  return await b.SummarizeArticle(formattedArticles);
}
