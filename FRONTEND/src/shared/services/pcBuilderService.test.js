import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createServer } from 'vite';

test('Hợp đồng API public, giỏ khách và giỏ đăng nhập dùng đúng body/cookie/token', async () => {
  const original = { adapter: axios.defaults.adapter, fetch: globalThis.fetch, storage: globalThis.localStorage, window: globalThis.window };
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  globalThis.window = { dispatchEvent: () => {} };
  const calls = [];
  axios.defaults.adapter = async config => {
    calls.push(config);
    return { data: { data: { ok: true } }, status: 200, config, headers: {} };
  };
  const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-pc-builder-test', server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { pcBuilderService, pcBuilderError } = await server.ssrLoadModule('/src/shared/services/pcBuilderService.js');
    const { cartService } = await server.ssrLoadModule('/src/shared/services/cartService.js');
    const signal = new AbortController().signal;
    store.set('accessToken', 'old-token');
    await pcBuilderService.options(signal);
    const filters = { ma_hang_muc: 'MAIN', keyword: 'B760', thuong_hieu_id: 2, gia_tu: 1000, gia_den: 5000, tinh_trang_hang: 'CON_HANG', sap_xep: 'GIA_TANG', page: 1, limit: 20, phien_ban_doi_chieu_id: 9, chi_khop_socket: true };
    await pcBuilderService.products(filters, signal);
    const previewBody = { items: [{ ma_hang_muc: 'MAIN', phien_ban_id: 7, so_luong: 2 }] };
    await pcBuilderService.preview(previewBody, signal);
    assert.equal(calls[0].url, '/options');
    assert.equal(calls[0].signal, signal);
    assert.equal(calls[0].withCredentials, true);
    assert.equal(calls[0].headers.Authorization, undefined);
    assert.deepEqual(calls[1].params, filters);
    assert.deepEqual(JSON.parse(calls[2].data), previewBody);

    store.clear();
    const body = { items: [{ ...previewBody.items[0], don_gia_xac_nhan: 2500 }] };
    await cartService.getCurrentCart();
    await pcBuilderService.addToCart('same-uuid', body);
    assert.equal(calls.at(-2).method, 'get');
    assert.equal(calls.at(-1).url, '/pc-build');
    assert.equal(calls.at(-1).headers['Idempotency-Key'], 'same-uuid');
    assert.equal(calls.at(-1).withCredentials, true);
    assert.deepEqual(JSON.parse(calls.at(-1).data), body);

    store.set('accessToken', 'old-token');
    const fetchCalls = [];
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, ...options });
      if (url.endsWith('/auth/refresh')) return Response.json({ data: { access_token: 'renewed-token' } });
      if (fetchCalls.length === 1) return Response.json({ message: 'Hết hạn' }, { status: 401 });
      return Response.json({ status: 200, data: { so_hang_muc_da_them: 1 } });
    };
    const result = await pcBuilderService.addToCart('same-uuid', body);
    assert.equal(result.so_hang_muc_da_them, 1);
    assert.equal(fetchCalls.length, 3);
    assert.equal(fetchCalls[0].credentials, 'include');
    assert.equal(fetchCalls[0].headers.get('Authorization'), 'Bearer old-token');
    assert.equal(fetchCalls[2].headers.get('Authorization'), 'Bearer renewed-token');
    assert.equal(fetchCalls[0].body, fetchCalls[2].body);
    assert.equal(fetchCalls[2].headers.get('Idempotency-Key'), 'same-uuid');
    const guestCalls = calls.length;
    globalThis.fetch = async () => Response.json({ message: 'Không có quyền' }, { status: 403 });
    await assert.rejects(pcBuilderService.addToCart('same-uuid', body), { status: 403 });
    assert.equal(calls.length, guestCalls, 'Không tự chuyển lỗi xác thực sang giỏ khách');

    globalThis.fetch = async () => Response.json({ success: true, soLuongMoi: 3 });
    assert.deepEqual((await cartService.addItem(7, 2)).data, { success: true, soLuongMoi: 3 }, 'Giữ nguyên response trần của API thêm một món');
    assert.equal(pcBuilderError({ isAxiosError: true, message: 'Network Error' }), 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    assert.equal(pcBuilderError({ response: { data: { message: 'Giá đã thay đổi' } } }), 'Giá đã thay đổi');
  } finally {
    axios.defaults.adapter = original.adapter;
    globalThis.fetch = original.fetch;
    globalThis.localStorage = original.storage;
    globalThis.window = original.window;
    await server.close();
  }
});
