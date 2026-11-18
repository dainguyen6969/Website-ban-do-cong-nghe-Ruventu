import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import axios from 'axios';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-category-options-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const { categoryService } = await server.ssrLoadModule('/src/shared/services/categoryService.js');
const useCatalogOptions = (await server.ssrLoadModule('/src/storefront/hooks/useCatalogOptions.js')).default;
after(() => server.close());
const oldOptions = { danhMuc: [{ id: 1, tenDanhMuc: 'CPU' }], thuongHieu: [{ id: 2, tenThuongHieu: 'Intel' }] };
let storage, previousStorage;
beforeEach(() => {
  previousStorage = globalThis.sessionStorage;
  storage = new Map();
  globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  categoryService.clearCache();
});
afterEach(() => { globalThis.sessionStorage = previousStorage; });

function CurrentOptions() {
  const { categories, brands, loading } = useCatalogOptions();
  return React.createElement('span', null, `${categories[0]?.tenDanhMuc}:${brands[0]?.tenThuongHieu}:${loading}`);
}

test('warm metadata renders synchronously and sequential navigation reuses it', async t => {
  const get = t.mock.method(axios, 'get', async () => ({ data: { data: oldOptions } }));
  assert.equal(categoryService.getCachedOptions(), null);
  assert.equal(renderToStaticMarkup(React.createElement(CurrentOptions)), '<span>undefined:undefined:true</span>');
  await categoryService.getOptions();
  assert.deepEqual(categoryService.getCachedOptions(), oldOptions);
  assert.equal(renderToStaticMarkup(React.createElement(CurrentOptions)), '<span>CPU:Intel:false</span>');
  await categoryService.getOptions();
  assert.equal(get.mock.calls.length, 1);
  let complete;
  get.mock.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const fresh = categoryService.getOptions({ force: true });
  assert.equal(fresh, categoryService.getOptions({ force: true }));
  const next = { ...oldOptions, danhMuc: [{ id: 1, tenDanhMuc: 'Tên mới' }] };
  complete({ data: { data: next } });
  assert.deepEqual(await fresh, next);
  assert.deepEqual(categoryService.getCachedOptions(), next);
  assert.equal(get.mock.calls.length, 2);
});

test('snapshots expire after five minutes and memory works with disabled storage', async t => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(axios, 'get', async () => ({ data: { data: oldOptions } }));
  await categoryService.getOptions();
  const key = [...storage.keys()][0];
  assert.match(key, /catalog-options:v2:.*\/api\/v1$/);
  now += 5 * 60 * 1000;
  assert.equal(categoryService.getCachedOptions(), null);
  sessionStorage.getItem = () => { throw new Error('disabled'); };
  sessionStorage.setItem = () => { throw new Error('full'); };
  assert.equal(categoryService.getCachedOptions(), null);
  assert.deepEqual(await categoryService.getOptions(), oldOptions);
  assert.deepEqual(categoryService.getCachedOptions(), oldOptions);
});

test('failed or invalid responses never replace a good snapshot and allow a later retry', async t => {
  const get = t.mock.method(axios, 'get', async () => ({ data: { data: oldOptions } }));
  await categoryService.getOptions();
  get.mock.mockImplementation(async () => ({ data: { data: { danhMuc: [] } } }));
  await assert.rejects(categoryService.getOptions({ force: true }), /không hợp lệ/);
  assert.deepEqual(categoryService.getCachedOptions(), oldOptions);
  get.mock.mockImplementation(async () => { throw new Error('offline'); });
  await assert.rejects(categoryService.getOptions({ force: true }), /offline/);
  get.mock.mockImplementation(async () => ({ data: { data: oldOptions } }));
  assert.deepEqual(await categoryService.getOptions(), oldOptions);
});
