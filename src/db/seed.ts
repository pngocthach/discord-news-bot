// File: src/db/seed.ts

import { logger } from "#/config/logger.js";
import { db } from "./index.js";
import { destinations, sources } from "./schema.js";

async function seed() {
  logger.info("🌱 Starting database seeding...");

  // Dữ liệu mẫu cho bảng sources
  const seedSources: (typeof sources.$inferInsert)[] = [
    {
      name: "Tin mới nhất - VnExpress RSS",
      url: "https://vnexpress.net/rss/tin-moi-nhat.rss",
      type: "rss",
      options: null,
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
