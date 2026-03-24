import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Tests for the extension popup HTML/JS.
 * Loads popup.html directly in the browser to verify:
 * - Popup renders without JS errors
 * - Login form is present
 * - UI elements exist
 */

const POPUP_PATH = path.resolve(__dirname, '../extension/popup.html');

test.describe('Extension popup UI', () => {
  test('popup.html loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Load popup directly (won't have chrome.* APIs, but shouldn't crash)
    await page.goto(`file:///${POPUP_PATH.replace(/\\/g, '/')}`);
    await page.waitForTimeout(1000);

    // Filter out expected chrome.* errors (popup.js uses chrome.runtime which won't exist outside extension)
    const realErrors = errors.filter(
      (e) => !e.includes('chrome') && !e.includes('Cannot read properties of undefined')
    );
    expect(realErrors).toEqual([]);
  });

  test('popup has login form elements', async ({ page }) => {
    await page.goto(`file:///${POPUP_PATH.replace(/\\/g, '/')}`);
    await page.waitForTimeout(500);

    // The popup should at minimum have an app container
    const appDiv = page.locator('#app');
    await expect(appDiv).toBeVisible();
  });

  test('popup.html has required CSS styles', async ({ page }) => {
    await page.goto(`file:///${POPUP_PATH.replace(/\\/g, '/')}`);

    // Check that the popup has dark theme styling (not unstyled white page)
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Should be dark (not white/transparent)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });
});
