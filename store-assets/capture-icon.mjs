import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 1 });
const fp = `file://${path.resolve(__dirname, 'store-icon-128.svg').replace(/\\/g, '/')}`;
await page.goto(fp, { waitUntil: 'networkidle0' });
await page.screenshot({ path: path.join(__dirname, 'store-icon-128.png'), type: 'png', omitBackground: true });
console.log('OK: store-icon-128.png');
await browser.close();
