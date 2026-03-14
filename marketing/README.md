# Orianna Marketing Kit

Everything you need to promote Orianna across social media, ads, and launch platforms.

## Folder Structure

```
marketing/
  copy/
    instagram-captions.md    - Instagram post captions + carousel ideas
    tiktok-scripts.md        - TikTok video scripts for promoting Orianna
    twitter-threads.md       - Twitter/X threads and tweets
    product-hunt.md          - Product Hunt launch copy
    reddit-posts.md          - Reddit posts for relevant subreddits
  templates/
    ig-post-1080x1080.html   - Instagram square post
    ig-story-1080x1920.html  - Instagram story ad
    twitter-card-1200x675.html - Twitter/X card image
    tiktok-cover-1080x1920.html - TikTok video cover
    og-image-1200x630.html   - Open Graph / link preview image
  pomelli-prompts.md         - Ready-to-paste prompts for Google Pomelli
```

## How to Use

### HTML Templates → PNG
1. Open any `.html` file in Chrome
2. Open DevTools (F12) → click device toolbar
3. Set to the dimensions in the filename
4. Right-click → "Capture screenshot"

Or use the capture script:
```bash
node marketing/capture.mjs
```

### Pomelli (AI-generated visuals)
1. Go to https://labs.google.com/pomelli
2. Enter your site: ori-nine.vercel.app
3. Use prompts from `pomelli-prompts.md`
4. Download generated assets

### Social Copy
Each file in `copy/` has ready-to-post content. Just copy-paste.

## Brand Guidelines (for consistency)

- **Primary color:** #7c3aed (purple)
- **Gradient:** #7c3aed → #a855f7
- **Background (dark):** #0a0a0f
- **Font:** Inter (or system sans-serif)
- **Tone:** Direct, confident, creator-friendly. No corporate speak.
- **Key phrases:** "AI content coach", "stop guessing, start creating", "built for short-form creators"
