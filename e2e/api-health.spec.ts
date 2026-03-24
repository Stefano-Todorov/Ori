import { test, expect } from '@playwright/test';

test.describe('API routes do not crash (no 500s)', () => {
  test('GET /api/usage', async ({ request }) => {
    const res = await request.get('/api/usage');
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/insights', async ({ request }) => {
    const res = await request.get('/api/insights');
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/scripts/generate', async ({ request }) => {
    const res = await request.post('/api/scripts/generate', {
      data: { topic: 'test' },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/coach', async ({ request }) => {
    const res = await request.post('/api/coach', {
      data: { messages: [{ role: 'user', content: 'hello' }] },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/ingest', async ({ request }) => {
    const res = await request.post('/api/extension/ingest', { data: {} });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/extension/save', async ({ request }) => {
    const res = await request.post('/api/extension/save', { data: {} });
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/ideas/generate', async ({ request }) => {
    const res = await request.post('/api/ideas/generate', {
      data: { type: 'hook' },
    });
    expect(res.status()).toBeLessThan(500);
  });
});
