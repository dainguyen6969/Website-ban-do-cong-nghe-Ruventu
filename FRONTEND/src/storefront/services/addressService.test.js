import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-address-cache-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const { getAddressSuggestions } = await vite.ssrLoadModule('/src/storefront/services/addressService.js');
after(() => vite.close());

test('repeated address queries share results and an outdated input cannot cancel a newer consumer', async t => {
  let complete;
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { complete = resolve; }));
  const controller = new AbortController();
  const first = getAddressSuggestions('https://example.test/address?q=test', controller.signal);
  const second = getAddressSuggestions('https://example.test/address?q=test');
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  complete(Response.json({ predictions: [{ description: 'Test address' }] }));
  assert.deepEqual(await second, [{ description: 'Test address' }]);
  await getAddressSuggestions('https://example.test/address?q=test');
  assert.equal(fetch.mock.calls.length, 1);
  fetch.mock.mockImplementation(async () => Response.json({}, { status: 429 }));
  await assert.rejects(getAddressSuggestions('https://example.test/address?q=other'), /Không tải/);
  fetch.mock.mockImplementation(async () => Response.json({ predictions: [] }));
  assert.deepEqual(await getAddressSuggestions('https://example.test/address?q=other'), []);
});
