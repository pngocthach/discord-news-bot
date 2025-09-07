CREATE TYPE "public"."platform" AS ENUM('discord', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."type" AS ENUM('rss', 'scrape');--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "config" jsonb;