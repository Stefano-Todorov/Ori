import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const assets = [
  { file: 'store-icon-128.svg', out: 'store-icon-128.png', w: 128, h: 128 },
  { file: 'small-promo-440x280.html', out: 'small-promo-440x280.png', w: 440, h: 280 },
  { file: 'marquee-promo-1400x560.html', out: 'marquee-promo-1400x560.png', w: 1400, h: 560 },
  { file: 'screenshot-1-video-capture.html', out: 'screenshot-1-video-capture.png', w: 1280, h: 800 },
  { file: 'screenshot-2-ai-ideas.html', out: 'screenshot-2-ai-ideas.png', w: 1280, h: 800 },
  { file: 'screenshot-3-competitors.html', out: 'screenshot-3-competitors.png', w: 1280, h: 800 },
  { file: 'screenshot-4-bulk-import.html', out: 'screenshot-4-bulk-import.png', w: 1280, h: 800 },
  { file: 'screenshot-5-download.html', out: 'screenshot-5-download.png', w: 1280, h: 800 },
  { file: 'ss1-save-inspo-1280x800.html', out: 'ss1-save-inspo-1280x800.png', w: 1280, h: 800 },
  { file: 'ss2-ai-ideas-1280x800.html', out: 'ss2-ai-ideas-1280x800.png', w: 1280, h: 800 },
  { file: 'ss3-analyze-1280x800.html', out: 'ss3-analyze-1280x800.png', w: 1280, h: 800 },
  { file: 'ss4-bulk-import-1280x800.html', out: 'ss4-bulk-import-1280x800.png', w: 1280, h: 800 },
  { file: 'ss5-competitors-1280x800.html', out: 'ss5-competitors-1280x800.png', w: 1280, h: 800 },
  { file: 'ss1-extension-1280x800.html', out: 'ss1-extension-1280x800.png', w: 1280, h: 800 },
  { file: 'ss2-ai-coach-1280x800.html', out: 'ss2-ai-coach-1280x800.png', w: 1280, h: 800 },
  { file: 'ss3-competitors-1280x800.html', out: 'ss3-competitors-1280x800.png', w: 1280, h: 800 },
  { file: 'ss4-script-generator-1280x800.html', out: 'ss4-script-generator-1280x800.png', w: 1280, h: 800 },
  { file: 'ss5-ideas-board-1280x800.html', out: 'ss5-ideas-board-1280x800.png', w: 1280, h: 800 },
];

const browser = await puppeteer.launch({ headless: true });

for (const { file, out, w, h } of assets) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const filePath = `file://${path.resolve(__dirname, file).replace(/\\/g, '/')}`;
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 15000 });
  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));
  // omitBackground: false ensures no alpha channel (24-bit PNG)
  await page.screenshot({ path: path.join(__dirname, out), type: 'png', omitBackground: false });
  console.log(`OK: ${out}`);
  await page.close();
}

await browser.close();
console.log('Done!');
