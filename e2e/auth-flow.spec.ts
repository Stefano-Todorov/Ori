import { test, expect } from '@playwright/test';

// Set these env vars to run authenticated tests:
//   TEST_USER_EMAIL=your-test-account@email.com
//   TEST_USER_PASSWORD=your-test-password
const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.describe('Authenticated flows', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run');

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('dashboard loads after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Should see sidebar navigation
    await expect(page.getByText('Orianna')).toBeVisible();
  });

  test('scripts page loads', async ({ page }) => {
    await page.goto('/dashboard/scripts');
    await page.waitForLoadState('networkidle');
    // Page should not show an error
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('ideas page loads', async ({ page }) => {
    await page.goto('/dashboard/ideas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('inspo/swipe file page loads', async ({ page }) => {
    await page.goto('/dashboard/inspo');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('competitors page loads', async ({ page }) => {
    await page.goto('/dashboard/competitors');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('coach page loads', async ({ page }) => {
    await page.goto('/dashboard/coach');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
    // Should see input bar
    await expect(page.locator('input[type="text"], textarea').first()).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('my-videos page loads', async ({ page }) => {
    await page.goto('/dashboard/my-videos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('schedule page loads', async ({ page }) => {
    await page.goto('/dashboard/schedule');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});
