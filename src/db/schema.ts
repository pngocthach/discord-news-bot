import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  serial,
  pgTable as table,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const platform = pgEnum("platform", ["discord", "telegram"]);
export const sourceType = pgEnum("type", ["rss", "scrape"]);

export const sources = table("sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  type: sourceType().notNull(),
  options: jsonb("options"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Destination to send notifications (Discord, Telegram)
 */
export const destinations = table("destinations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: platform().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Table containing all articles that have been scraped
 */
export const articles = table("articles", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id")
    .references(() => sources.id)
    .notNull(),
  title: text("title").notNull(),
  link: text("link").notNull().unique(),
  pubDate: timestamp("pub_date", { withTimezone: true }).notNull(),
  snippet: text("snippet"),
  content: text("content"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Table containing all summaries that have been created by LLM
 */
export const summaries = table("summaries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  // Use JSONB to save an array of article IDs that have been used to summarize
  articleIds: jsonb("article_ids").$type<number[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
