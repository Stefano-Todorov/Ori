# Chrome Web Store Listing — Orianna

## Extension Name
Orianna — AI Content Coach for Creators

## Short Description (132 chars max)
AI-powered content coaching for TikTok & Instagram. Capture inspo, generate video ideas, track competitors, and download videos.

## Detailed Description
Orianna is your AI content coach that lives right in your browser. While you browse TikTok and Instagram, Orianna works alongside you — capturing inspiration, analyzing what makes videos go viral, and generating personalized content ideas tailored to your niche.

**Save Any Video as Inspiration**
See a video you love? One click saves it to your saved inspo videos with full metrics — views, likes, comments, engagement rate. Tag videos for easy recall later.

**AI-Powered Video Ideas**
Don't just save — create. Orianna analyzes competitor content and generates original video ideas matched to your style, niche, and audience. Get hooks, CTAs, and full concept breakdowns instantly.

**Track Competitors**
Add any creator as a competitor. Browse their top-performing content, sort by views/likes/comments, and export as CSV for deeper analysis. Know exactly what's working in your niche.

**Bulk Import Bookmarks**
Already have a collection of saved posts on TikTok or Instagram? Import them all at once. Orianna detects your bookmarks page and lets you select and import in bulk.

**Built for Creators Who Take Content Seriously**
Orianna connects to a full web dashboard where you can manage your ideas board, generate AI scripts, chat with your AI coach, and plan your content calendar. The extension is your capture tool — the dashboard is your command center.

Works on: TikTok, Instagram
Requires: Free Orianna account (sign up at ori-nine.vercel.app)

## Category
Productivity

## Language
English

---

## Small Promo Title (max 45 chars)
AI content coach for short-form creators

## Marquee Promo Title (max 45 chars)
Your AI coach for TikTok & Instagram

---

## Privacy Practices (for Chrome Web Store)

### Single Purpose Description
Orianna helps content creators capture inspiration from TikTok and Instagram, generate AI video ideas, and track competitor content — all from the browser toolbar.

### Permissions Justification

| Permission | Justification |
|---|---|
| activeTab | Read video metrics and captions from the current TikTok/Instagram page |
| storage | Store authentication tokens and user preferences locally |
| tabs | Query the active tab to extract post data, and open post URLs in new tabs |
| scripting | Dynamically inject content scripts when the pre-declared content script hasn't loaded yet (e.g., navigating within a TikTok SPA) |
| Host: tiktok.com | Extract video metrics, captions, and creator info from TikTok pages |
| Host: instagram.com | Extract video metrics, captions, and creator info from Instagram pages |
| Host: zpowetkkmppaffqbgvzq.supabase.co | Authenticate users via Supabase (our backend auth provider) |
| Host: ori-nine.vercel.app | Send captured data to the Orianna API for storage and AI processing |

### Data Usage Disclosure
- We collect: video URLs, captions, metrics, and creator handles from TikTok/Instagram pages the user explicitly interacts with
- We do NOT collect: browsing history, personal data, passwords, or any data from non-TikTok/Instagram pages
- Data is sent to our servers (ori-nine.vercel.app) only when the user explicitly saves a post or requests AI ideas
- User authentication tokens are stored locally via chrome.storage
