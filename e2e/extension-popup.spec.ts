import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Tests for the extension popup HTML/JS.
 * Loads popup.html directly — chrome.* APIs won't exist,
 * so we just verify the HTML structure and styles load.
 */

const POPUP_PATH = path.resolve(__dirname, '../extension/popup.html');

test.describe('Extension popup UI', () => {
  test('popup.html loads without fatal errors', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => {
      // Ignore chrome.* API errors (expected outside extension context)
      if (
        err.message.includes('chrome') ||
        err.message.includes('Cannot read properties of undefined') ||
        err.message.includes('is not defined')
      ) {
        return;
      }
      fatalErrors.push(err.message);
    });

    await page.goto(`file:///${POPUP_PATH.replace(/\\/g, '/')}`);
    await page.waitForTimeout(1000);

    expect(fatalErrors).toEqual([]);
  });

  test('popup.html has dark background (not unstyled)', async ({ page }) => {
    await page.goto(`file:///${POPUP_PATH.replace(/\\/g, '/')}`);
    await page.waitForTimeout(500);

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Should not be default white
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('popup.html contains #app div', async ({ page }) => {
    await page.goto(`file:///${POPUP_PATH.replace(/\\/g, '/')}`);
    const appDiv = page.locator('#app');
    // Just check it exists in the DOM (may not be visible if JS didn't run)
    await expect(appDiv).toHaveCount(1);
  });
});
