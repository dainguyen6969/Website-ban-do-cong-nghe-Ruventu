import test from 'node:test';
import assert from 'node:assert/strict';

const values = new Map([['accessToken', 'expired']]);
globalThis.localStorage = {
  getItem: (key) => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};

test('admin request refreshes an expired access token once and retries', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (calls.length === 1) return new Response(JSON.stringify({ message: 'expired' }), { status: 401 });
    if (calls.length === 2) return new Response(JSON.stringify({ data: { access_token: 'fresh' } }), { status: 200 });
    return new Response(JSON.stringify({ data: { items: [1] } }), { status: 200 });
  };

  const { adminRequest } = await import('./versionApi.js');
  assert.deepEqual(await adminRequest('/api/v1/admin/orders'), { items: [1] });
  assert.equal(calls[1].url, '/api/v1/auth/refresh');
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(calls[2].options.headers.Authorization, 'Bearer fresh');
});
