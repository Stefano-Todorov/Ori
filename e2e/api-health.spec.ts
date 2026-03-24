import { test, expect } from '@playwright/test';

test.describe('API routes return valid responses (not 500)', () => {
  test('GET /api/usage returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get('/api/usage');
    // Should be 401 (unauthorized), NOT 500 (server error)
    expect(res.status()).toBe(401);
  });

  test('GET /api/insights returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get('/api/insights');
    expect(res.status()).toBe(401);
  });

  test('POST /api/scripts/generate returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/scripts/generate', {
      data: { topic: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/coach returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/coach', {
      data: { messages: [{ role: 'user', content: 'hello' }] },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/ingest returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/extension/ingest', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/extension/save returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/extension/save', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/ideas/generate returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/ideas/generate', {
      data: { type: 'hook' },
    });
    expect(res.status()).toBe(401);
  });
});
