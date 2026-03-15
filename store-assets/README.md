# Store Assets — How to Generate Final PNGs

## Quick Steps

All assets are HTML files. Open each in Chrome and take a screenshot at the exact dimensions.

### 1. Store Icon (128x128)
- Already exists: `../extension/icons/icon128.png`
- Upgraded SVG version: `store-icon-128.svg`
- To convert SVG → PNG: open in browser, screenshot, or use any SVG-to-PNG tool

### 2. Screenshots (1280x800) — need at least 1, up to 5
Open each HTML file in Chrome and screenshot at exactly **1280x800**:

```
screenshot-1-video-capture.html   → "Save any video as inspiration"
screenshot-2-ai-ideas.html       → "AI turns inspo into your ideas"
screenshot-3-competitors.html    → "Track your competitors"
screenshot-4-bulk-import.html    → "Bulk import your bookmarks"
screenshot-5-download.html       → "Complete workflow overview"
```

**How to screenshot at exact size:**
1. Open the HTML file in Chrome
2. Open DevTools (F12) → click the device toolbar icon
3. Set dimensions to 1280x800
4. Right-click → "Capture screenshot"

### 3. Small Promo Tile (440x280)
- Open `small-promo-440x280.html` in Chrome
- DevTools → 440x280 → Capture screenshot

### 4. Marquee Promo Tile (1400x560)
- Open `marquee-promo-1400x560.html` in Chrome
- DevTools → 1400x560 → Capture screenshot

## Store Listing Copy
All text (title, descriptions, privacy info) is in `STORE-LISTING.md`.

## Chrome Web Store Submission Checklist
- [ ] Developer account ($5 one-time fee at https://chrome.google.com/webstore/devconsole)
- [ ] Store icon 128x128 PNG
- [ ] At least 1 screenshot 1280x800
- [ ] Small promo tile 440x280
- [ ] Marquee promo tile 1400x560 (optional but recommended)
- [ ] Fill in store listing from STORE-LISTING.md
- [ ] Privacy practices tab — use justifications from STORE-LISTING.md
- [ ] Upload extension ZIP (zip the `extension/` folder contents)
- [ ] Submit for review (typically 1-3 business days)
