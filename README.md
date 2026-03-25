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

- **Framework**: Next.js 16.1.6 (App Router)
- **Database & Auth**: Supabase (Postgres + Row Level Security)
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) — `src/lib/claude.ts`
- **Payments**: Stripe — subscription tiers, usage tracking
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Monitoring**: Sentry (error tracking, client + server + edge)
- **Email**: Resend
- **Notifications**: Telegram (via Telegraf)
- **Testing**: Playwright (e2e)
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
    (dashboard)/      # Main app: dashboard, coach, scripts, ideas, inspo, competitors, my-videos, schedule, settings
    api/              # 14 API route groups (coach, scripts, posts, extension, stripe, cron, etc.)
    onboarding/       # 4-step onboarding wizard
  components/
    coach/            # AI coach chat UI
    dashboard/        # Metrics cards, top posts, kanban board, calendar
    ideas/            # Ideas board with edit dialog
    layout/           # Sidebar navigation, usage bar
    posts/            # CSV import, competitor add
    schedule/         # Production tracker, recording days
    scripts/          # Script generator, saved scripts list
    settings/         # Profile settings, billing, theme toggle
    trending/         # Swipe file list, add swipe button
    ui/               # shadcn/ui components
  lib/
    claude.ts         # Anthropic SDK client + system prompt builder
    stripe.ts         # Stripe client + helpers
    knowledge.ts      # Loads coaching knowledge base
    supabase/         # Supabase clients (browser, server, service, middleware)
    types.ts          # All TypeScript types
    tiers.ts          # Subscription tier logic
    usage.ts          # Feature usage tracking
    utils.ts          # Utility functions
e2e/                  # Playwright e2e tests (5 spec files)
extension/            # Chrome extension (Manifest V3)
knowledge/            # AI coaching knowledge base (5 guides)
supabase/             # Database schema + 12 migrations
marketing/            # Brand assets and copy templates
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

The companion Chrome extension captures trending content and competitor posts directly into the app via `/api/extension/ingest`. Located in `extension/` (Manifest V3 — popup, content script, background service worker, TikTok bridge).

## E2E Tests

```bash
npx playwright test
```

5 spec files covering API health, auth flows, extension API, extension popup, and public pages. 36 tests passing.
