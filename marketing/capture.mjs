/**
 * Capture all HTML marketing templates as PNGs using Puppeteer.
 * Usage: node marketing/capture.mjs
 * Requires: npm install puppeteer (or npx puppeteer)
 */

import { launch } from 'puppeteer'
import { readdir } from 'fs/promises'
import { resolve, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const templates = [
  { file: 'ig-post-1080x1080.html', width: 1080, height: 1080 },
  { file: 'ig-story-1080x1920.html', width: 1080, height: 1920 },
  { file: 'twitter-card-1200x675.html', width: 1200, height: 675 },
  { file: 'tiktok-cover-1080x1920.html', width: 1080, height: 1920 },
  { file: 'og-image-1200x630.html', width: 1200, height: 630 },
]

async function capture() {
  const browser = await launch({ headless: true })

  for (const t of templates) {
    const page = await browser.newPage()
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: 1 })

    const filePath = resolve(join(__dirname, 'templates', t.file))
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle2' })

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready)
    await new Promise(r => setTimeout(r, 500))

    const outName = t.file.replace('.html', '.png')
    const outPath = resolve(join(__dirname, 'templates', outName))
    await page.screenshot({ path: outPath, type: 'png' })

    console.log(`Captured: ${outName} (${t.width}x${t.height})`)
    await page.close()
  }

  await browser.close()
  console.log('\nDone! All PNGs saved to marketing/templates/')
}

capture().catch(console.error)
