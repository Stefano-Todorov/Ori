import { test, expect } from '@playwright/test';

/**
 * Tests for all Chrome extension API endpoints.
 * These are the endpoints the extension calls — if any returns 500,
 * the extension breaks for users.
 *
 * Without auth: verifies endpoints return 401 (not 500/crash)
 * With auth: verifies endpoints return valid responses
 *
 * Set TEST_USER_EMAIL + TEST_USER_PASSWORD for authenticated tests.
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ──────────────────────────────────────────────────
// 1. Unauthenticated — all endpoints should return 401, not 500
// ──────────────────────────────────────────────────

test.describe('Extension APIs — unauthenticated (should 401, not crash)', () => {
  test('GET /api/extension/context — no token', async ({ request }) => {
    const res = await request.get('/api/extension/context');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/extension/save — no token', async ({ request }) => {
    const res = await request.post('/api/extension/save', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/ideas — no token', async ({ request }) => {
    const res = await request.post('/api/extension/ideas', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/ingest — no token', async ({ request }) => {
    const res = await request.post('/api/extension/ingest', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/sync-my-videos — no token', async ({ request }) => {
    const res = await request.post('/api/extension/sync-my-videos', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/sync-tags — no token', async ({ request }) => {
    const res = await request.post('/api/extension/sync-tags', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('POST /api/competitors/ideas — no token', async ({ request }) => {
    const res = await request.post('/api/competitors/ideas', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('POST /api/competitors/analyze — no token', async ({ request }) => {
    const res = await request.post('/api/competitors/analyze', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('GET /api/extension/context — invalid token', async ({ request }) => {
    const res = await request.get('/api/extension/context', {
      headers: { Authorization: 'Bearer invalid-garbage-token' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/save — invalid token', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      data: { type: 'inspiration' },
      headers: { Authorization: 'Bearer invalid-garbage-token' },
    });
    expect(res.status()).toBe(401);
  });
});

// ──────────────────────────────────────────────────
// 2. CORS preflight — extension needs these to work
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
    test(`OPTIONS ${endpoint} returns CORS headers`, async ({ request }) => {
      const res = await request.fetch(endpoint, { method: 'OPTIONS' });
      // Should not be 500
      expect(res.status()).toBeLessThan(500);
      const headers = res.headers();
      expect(headers['access-control-allow-origin']).toBeTruthy();
      expect(headers['access-control-allow-headers']).toContain('Authorization');
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
    // Get a real Supabase JWT token (same flow as the extension login)
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

  test('GET /api/extension/context — returns competitors, tags, social accounts', async ({ request }) => {
    const res = await request.get('/api/extension/context', { headers: authHeaders() });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should have expected shape
    expect(body).toHaveProperty('competitors');
    expect(body).toHaveProperty('tags');
    expect(Array.isArray(body.competitors)).toBe(true);
    expect(Array.isArray(body.tags)).toBe(true);
  });

  test('POST /api/extension/save — save inspiration with minimal data', async ({ request }) => {
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
    // Should return success or duplicate (both are valid, not crashes)
    expect(body.error).toBeFalsy();
  });

  test('POST /api/extension/ingest — bulk import with valid schema', async ({ request }) => {
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

  test('POST /api/extension/ingest — rejects invalid schema', async ({ request }) => {
    const res = await request.post('/api/extension/ingest', {
      headers: authHeaders(),
      data: {
        // missing required 'platform' field
        posts: [{ url: 'test' }],
      },
    });
    // Should be 400 (bad request), not 500 (crash)
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
    // Should return 200 with tags array, or handle gracefully
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/save — handles missing fields gracefully', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      headers: authHeaders(),
      data: {
        type: 'inspiration',
        // Minimal data — should not 500
      },
    });
    // Might be 400 (validation) but must NOT be 500
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/save — handles empty string URL', async ({ request }) => {
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
