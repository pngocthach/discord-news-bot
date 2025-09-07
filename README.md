# Installation

```
npm install
npm run dev
```

```
open http://localhost:3000
```

# Environment Variables

```
DISCORD_TOKEN=
CHANNEL_ID=
GUILD_ID=
```

# Project Structure

```
/my-news-bot
├── /dist/                     // Compiled JavaScript output
├── /node_modules/             // Project dependencies
├── /src/                      // All application source code resides here
│   ├── /config/               // Environment variable management and validation
│   │   └── index.ts           // Loads, validates, and exports type-safe config variables
│   │
│   ├── /db/                   // Database-related files (Drizzle ORM)
│   │   ├── migrations/        // Auto-generated migration files by Drizzle Kit
│   │   ├── schema.ts          // Database schema definition (Tables: Sources, Articles, Summaries, Destinations)
│   │   └── index.ts           // Drizzle client initialization and export
│   │
│   ├── /services/             // Core, reusable business logic
│   │   ├── scraper.service.ts // HTML scraping logic
│   │   ├── rss.service.ts     // RSS feed processing logic
│   │   └── summarizer.service.ts // LLM communication logic
│   │
│   ├── /messengers/           // Handles sending output notifications
│   │   ├── discord.messenger.ts  // Logic for sending messages via Discord Webhook
│   │   ├── telegram.messenger.ts // Logic for sending messages via Telegram Bot
│   │   └── index.ts             // Main dispatcher that invokes the correct messenger
│   │
│   └── /jobs/                 // Runnable scripts that orchestrate workflows
│       └── fetch-summarize-notify.job.ts // The main entry point for the entire fetch->summarize->notify process
│
├── .env                       // Stores secrets and environment variables (DO NOT COMMIT)
├── .gitignore                 // Specifies files and directories to be ignored by Git
├── drizzle.config.ts          // Configuration for Drizzle Kit
├── package.json               // Project dependencies and scripts
└── tsconfig.json              // TypeScript compiler options
```
