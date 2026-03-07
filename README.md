# Orianna

An AI-powered content coaching platform for short-form video creators on TikTok, Instagram Reels, and YouTube Shorts.

## What It Does

Orianna helps creators grow by combining their own post analytics with AI coaching and script generation:

- **AI Coach** — Conversational coach powered by Claude AI. Knows your niche, goals, and recent post performance. Gives data-backed growth advice.
- **Script Generator** — Generate full video scripts (hook, body, CTA, hashtags) with multiple hook variants. Saves to your library.
- **Post Analytics** — Import your post data via CSV. See views, likes, comments, shares, saves, and engagement rate in one place.
- **Competitor Tracking** — Track competitor accounts and their top-performing posts.
- **Trending Content** — Capture trending videos via browser extension for inspiration.
- **Onboarding** — 4-step setup: niche, goals, platforms, posting frequency.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase (Postgres + Row Level Security)
- **AI**: Anthropic Claude (claude-sonnet-4-5)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd orianna
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com)
- Get your Supabase keys at your project dashboard under **Settings > API**

### 3. Set up the database

Run the SQL in `supabase/schema.sql` in the Supabase SQL editor (Dashboard > SQL Editor > New query).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/           # Login, signup pages
    (dashboard)/      # Main app: dashboard, coach, scripts, posts, competitors, trending, settings
    api/              # API routes: coach, scripts, posts/upload-csv, extension/ingest, auth/callback
    onboarding/       # 4-step onboarding wizard
  components/
    coach/            # AI coach chat UI
    dashboard/        # Metrics cards, top posts
    layout/           # Sidebar navigation
    posts/            # CSV import button, competitor add
    scripts/          # Script generator form, saved scripts list
    settings/         # Profile settings form
    ui/               # shadcn/ui components
  lib/
    claude.ts         # Anthropic SDK client + system prompt builder
    supabase/         # Supabase client (browser, server, middleware)
    types.ts          # All TypeScript types
    utils.ts          # Utility functions
```

## Database Schema

See `supabase/schema.sql` for the full schema. Tables:

| Table | Description |
|---|---|
| `profiles` | User profiles — niche, goals, platforms, posting target |
| `posts` | Post analytics — views, likes, comments, engagement, etc. |
| `scripts` | Generated video scripts with hook variants |
| `competitors` | Tracked competitor accounts |
| `coach_messages` | AI coach conversation history |
| `content_ideas` | Saved content ideas |

## CSV Import

The post import accepts CSV exports from TikTok, Instagram, and YouTube. Supported column names are normalized automatically (e.g. `Video views`, `Plays`, `Views` all map to `views`).

## Browser Extension

The companion browser extension can push competitor posts and trending content directly to the app via `/api/extension/ingest`. Extension setup coming soon.
