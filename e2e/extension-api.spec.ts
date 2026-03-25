import { test, expect } from '@playwright/test';

/**
 * Tests for all Chrome extension API endpoints.
 * Verifies endpoints don't crash (500) and handle auth properly.
 *
 * Set TEST_USER_EMAIL + TEST_USER_PASSWORD + NEXT_PUBLIC_SUPABASE_URL +
 * NEXT_PUBLIC_SUPABASE_ANON_KEY for authenticated tests.
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ──────────────────────────────────────────────────
// 1. Unauthenticated — endpoints should not crash
// ──────────────────────────────────────────────────

test.describe('Extension APIs — no crash without auth', () => {
  const endpoints = [
    { method: 'GET' as const, path: '/api/extension/context' },
    { method: 'POST' as const, path: '/api/extension/save', data: {} },
    { method: 'POST' as const, path: '/api/extension/ideas', data: {} },
    { method: 'POST' as const, path: '/api/extension/ingest', data: {} },
    { method: 'POST' as const, path: '/api/extension/sync-my-videos', data: {} },
    { method: 'POST' as const, path: '/api/extension/sync-tags', data: {} },
    { method: 'POST' as const, path: '/api/competitors/ideas', data: {} },
    { method: 'POST' as const, path: '/api/competitors/analyze', data: {} },
  ];

  for (const ep of endpoints) {
    test(`${ep.method} ${ep.path} — no 500`, async ({ request }) => {
      const res =
        ep.method === 'GET'
          ? await request.get(ep.path)
          : await request.post(ep.path, { data: ep.data });
      expect(res.status()).toBeLessThan(500);
    });
  }

  test('GET /api/extension/context — invalid Bearer token does not crash', async ({ request }) => {
    const res = await request.get('/api/extension/context', {
      headers: { Authorization: 'Bearer invalid-garbage-token' },
    });
    // May return 401 or fall back to cookie auth (200) — either is fine, just not 500
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/save — invalid Bearer token does not crash', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      data: { type: 'inspiration' },
      headers: { Authorization: 'Bearer invalid-garbage-token' },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ──────────────────────────────────────────────────
// 2. CORS preflight — extension needs these headers
// ──────────────────────────────────────────────────

test.describe('Extension APIs — CORS preflight', () => {
  const endpoints = [
    '/api/extension/context',
    '/api/extension/save',
    '/api/extension/ideas',
    '/api/extension/ingest',
    '/api/extension/sync-my-videos',
    '/api/extension/sync-tags',
    '/api/competitors/ideas',
    '/api/competitors/analyze',
  ];

  for (const endpoint of endpoints) {
    test(`OPTIONS ${endpoint} — no crash`, async ({ request }) => {
      // Simulate CORS preflight with Origin header
      const res = await request.fetch(endpoint, {
        method: 'OPTIONS',
        headers: {
          Origin: 'chrome-extension://test',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Authorization, Content-Type',
        },
      });
      expect(res.status()).toBeLessThan(500);
    });
  }
});

// ──────────────────────────────────────────────────
// 3. Authenticated — verify real responses
// ──────────────────────────────────────────────────

test.describe('Extension APIs — authenticated', () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'Set TEST_USER_EMAIL, TEST_USER_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );

  let accessToken = '';

  test.beforeAll(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      }
    );
    const data = await res.json();
    if (!data.access_token) {
      throw new Error(`Failed to get token: ${JSON.stringify(data)}`);
    }
    accessToken = data.access_token;
  });

  function authHeaders() {
    return { Authorization: `Bearer ${accessToken}` };
  }

  test('GET /api/extension/context — returns competitors and tags', async ({ request }) => {
    const res = await request.get('/api/extension/context', { headers: authHeaders() });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('competitors');
    expect(body).toHaveProperty('allTags');
    expect(Array.isArray(body.competitors)).toBe(true);
    expect(Array.isArray(body.allTags)).toBe(true);
  });

  test('POST /api/extension/save — save inspiration', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      headers: authHeaders(),
      data: {
        type: 'inspiration',
        platform: 'tiktok',
        handle: 'playwright_test_user',
        url: `https://tiktok.com/@test/video/${Date.now()}`,
        caption: 'Playwright test post — safe to delete',
        views: 1000,
        likes: 100,
        comments: 10,
        shares: 5,
        saves: 3,
        hashtags: ['test'],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.error).toBeFalsy();
  });

  test('POST /api/extension/ingest — bulk import', async ({ request }) => {
    const res = await request.post('/api/extension/ingest', {
      headers: authHeaders(),
      data: {
        platform: 'tiktok',
        is_trending: true,
        posts: [
          {
            url: `https://tiktok.com/@test/video/${Date.now()}`,
            caption: 'Playwright bulk test',
            views: 500,
            likes: 50,
            comments: 5,
          },
        ],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ingested');
  });

  test('POST /api/extension/ingest — rejects invalid schema (no 500)', async ({ request }) => {
    const res = await request.post('/api/extension/ingest', {
      headers: authHeaders(),
      data: { posts: [{ url: 'test' }] }, // missing platform
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/sync-my-videos — sync with valid data', async ({ request }) => {
    const res = await request.post('/api/extension/sync-my-videos', {
      headers: authHeaders(),
      data: {
        platform: 'tiktok',
        follower_count: 1000,
        posts: [
          {
            url: `https://tiktok.com/@me/video/${Date.now()}`,
            caption: 'My test video',
            views: 200,
            likes: 20,
            comments: 2,
          },
        ],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('synced');
  });

  test('POST /api/extension/sync-tags — list tags', async ({ request }) => {
    const res = await request.post('/api/extension/sync-tags', {
      headers: authHeaders(),
      data: { action: 'list' },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/save — handles missing fields (no 500)', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      headers: authHeaders(),
      data: { type: 'inspiration' },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/save — handles empty URL (no 500)', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      headers: authHeaders(),
      data: {
        type: 'inspiration',
        platform: 'instagram',
        handle: 'test',
        url: '',
        caption: 'empty url test',
      },
    });
    expect(res.status()).toBeLessThan(500);
  });
});
