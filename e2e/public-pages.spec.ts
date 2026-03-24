import { test, expect } from '@playwright/test';

test.describe('Public pages load correctly', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Orianna/);
    // Check key elements exist
    await expect(page.getByText('Orianna')).toBeVisible();
  });

  test('login page loads with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('signup page loads with form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('login shows error on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('fake@test.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should show error, not crash
    await expect(page.getByText(/invalid|error|credentials/i)).toBeVisible({ timeout: 10000 });
  });

  test('signup link works from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Get started free').click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('login link works from signup', async ({ page }) => {
    await page.goto('/signup');
    await page.getByText('Sign in').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
