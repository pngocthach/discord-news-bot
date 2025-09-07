// File: src/db/seed.ts

import { logger } from "#/config/logger.js";
import { db } from "./index.js";
import { destinations, sources } from "./schema.js";

async function seed() {
  logger.info("🌱 Starting database seeding...");

  // Dữ liệu mẫu cho bảng sources
  const seedSources: (typeof sources.$inferInsert)[] = [
    {
      name: "VnExpress Số hóa",
      url: "https://vnexpress.net/so-hoa",
      type: "scrape",
      options: {
        scrapeOptions: {
          list: {
            container: "article.item-news",
            title: "h3.title-news a",
            link: "h3.title-news a",
            snippet: "p.description a",
          },
          detail: { content: "article.fck_detail p" },
        },
      },
      isActive: true,
    },
    {
      name: "Tuổi Trẻ - Khoa học",
      url: "https://tuoitre.vn/rss/khoa-hoc.rss",
      type: "rss",
      options: null, // Nguồn RSS không cần options
      isActive: true,
    },
  ];

  // Dữ liệu mẫu cho bảng destinations
  const seedDestinations: (typeof destinations.$inferInsert)[] = [
    {
      name: "Kênh Tin Tức Discord",
      platform: "discord",
      config: {
        webhookEnvVar: "DISCORD_WEBHOOK_NEWS_CHANNEL",
      },
      isActive: true,
    },
  ];

  // Chèn dữ liệu vào bảng sources
  logger.info("Seeding sources...");
  await db.insert(sources).values(seedSources).onConflictDoNothing();

  // Chèn dữ liệu vào bảng destinations
  logger.info("Seeding destinations...");
  await db.insert(destinations).values(seedDestinations).onConflictDoNothing();

  logger.info("✅ Database seeding finished successfully!");
}

seed().catch((err) => {
  logger.error("❌ Error during database seeding:", err);
  process.exit(1);
});
