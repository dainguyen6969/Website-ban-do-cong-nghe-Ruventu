import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-sales-test', server: { middlewareMode: true }, appType: 'custom' });
const api = await server.ssrLoadModule('/src/features/admin/orders/api/onlineOrderApi.js');
const { buildPosCheckoutBody, buildPreviewBody, checkoutPosOrder, normalizeSalesCustomer, normalizeSalesProduct } = api;
after(() => server.close());

const quote = (san_pham, total) => ({ san_pham, tong_thanh_toan: total,
  ma_xac_nhan_gia: 'test-quote', het_han_xac_nhan_gia: new Date(Date.now() + 60000).toISOString() });

test('merged POS contract rejects expired prices, missing component serials and cross-line reuse', () => {
  const options = { kho_mac_dinh_id: 1, bang_gia: ['BAN_LE'] };
  const preview = quote([
    { ma_dong: 'd747', serial_requirements: [{ phien_ban_id: 10, so_luong_can_serial: 1 }] },
    { ma_dong: 'GIFT-1', la_qua_tang: true, serial_requirements: [{ phien_ban_id: 10, so_luong_can_serial: 1 }] },
  ], 100);
  const order = { cart: [], serialSelections: { 'd747:10': [{ id: 101 }], 'GIFT-1:10': [{ id: 102 }] } };
  assert.throws(() => buildPosCheckoutBody(order, options, { ...preview, het_han_xac_nhan_gia: '2020-01-01' }), error => error.status === 409);
  assert.throws(() => buildPosCheckoutBody({ ...order, serialSelections: {} }, options, preview), /Cần chọn đủ/);
  assert.throws(() => buildPosCheckoutBody({ ...order, serialSelections: { 'd747:10': [{ id: 101 }], 'GIFT-1:10': [{ id: 101 }] } }, options, preview), /Một serial/);
});

test('POS combo checkout allocates only component versions under their purchased combo row', () => {
  const order = { paymentMethod: 'cash', paid: 100, cart: [
    { product: { id: 747, type: 'BO_PC' }, quantity: 2, serials: [{ id: 999 }], componentSerials: { 10: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }], 20: [{ id: 201 }, { id: 202 }], 99: [{ id: 999 }] } },
    { product: { id: 30, type: 'DON' }, quantity: 1, serials: [{ id: 301 }] },
  ], serialSelections: { 'd747:10': [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }],
    'd747:20': [{ id: 201 }, { id: 202 }], 'd30:30': [{ id: 301 }], 'OLD:99': [{ id: 999 }] } };
  const preview = quote([
    { ma_dong: 'd747', serial_requirements: [{ phien_ban_id: 10, so_luong_can_serial: 4 }, { phien_ban_id: 20, so_luong_can_serial: 2 }] },
    { ma_dong: 'd30', serial_requirements: [{ phien_ban_id: 30, so_luong_can_serial: 1 }] },
  ], 100);
  const body = buildPosCheckoutBody(order, { kho_mac_dinh_id: 1, bang_gia: ['BAN_LE'] }, preview);
  assert.deepEqual(body.phan_bo_serial, [
    { ma_dong: 'd747', phien_ban_id: 10, serial_ids: [101, 102, 103, 104] },
    { ma_dong: 'd747', phien_ban_id: 20, serial_ids: [201, 202] },
    { ma_dong: 'd30', phien_ban_id: 30, serial_ids: [301] },
  ]);
  assert.deepEqual(body.san_pham, [{ ma_dong: 'd747', phien_ban_id: 747, so_luong: 2 }, { ma_dong: 'd30', phien_ban_id: 30, so_luong: 1 }]);
});

test('sales customer lookup keeps the real backend id and contact fields', () => {
  assert.deepEqual(normalizeSalesCustomer({
    id: 12, ho_ten: 'Nguyễn Văn An', so_dien_thoai: '0901234567', email: 'an@example.com',
  }), { id: 12, name: 'Nguyễn Văn An', phone: '0901234567', email: 'an@example.com' });
});

test('POS checkout sends real serial IDs, payment fields and an unchanged key/body on retry', async () => {
  const order = { customer: null, employee: { id: 1 }, tax: true, paymentMethod: 'cash', paid: 2100000, paymentReceived: true, cart: [{ product: { id: 101 }, quantity: 2 }], serialSelections: { 'd101:101': [{ id: 501 }, { id: 502 }] }, note: 'Khách nhận tại quầy' };
  const options = { kho_mac_dinh_id: 1, bang_gia: ['BAN_LE'] };
  const preview = quote([{ ma_dong: 'd101', serial_requirements: [{ phien_ban_id: 101, so_luong_can_serial: 2 }] }], 2090000);
  const body = buildPosCheckoutBody(order, options, preview, '2026-09-14T11:00:00+07:00');
  assert.equal(body.ma_xac_nhan_gia, preview.ma_xac_nhan_gia);
  assert.equal(body.tong_thanh_toan_xac_nhan, 2090000);
  assert.equal(body.khach_hang_id, null);
  assert.deepEqual(body.san_pham, [{ ma_dong: 'd101', phien_ban_id: 101, so_luong: 2 }]);
  assert.deepEqual(body.phan_bo_serial, [{ ma_dong: 'd101', phien_ban_id: 101, serial_ids: [501, 502] }]);
  assert.deepEqual(body.thanh_toan, { phuong_thuc: 'TIEN_MAT', tien_khach_dua: 2100000, ngay_thanh_toan: '2026-09-14T11:00:00+07:00', ma_giao_dich: null, xac_nhan_da_nhan_tien: true });
  for (const [method, code] of [['transfer', 'CHUYEN_KHOAN'], ['card', 'THE']]) {
    const payment = buildPosCheckoutBody({ ...order, paymentMethod: method, paid: 2090000, transactionCode: ' TX-1 ' }, options, preview).thanh_toan;
    assert.equal(payment.phuong_thuc, code);
    assert.equal(payment.so_tien_da_nhan, 2090000);
    assert.equal(payment.ma_giao_dich, 'TX-1');
    assert.equal(Object.hasOwn(payment, 'tien_khach_dua'), false);
  }
  const fetchBefore = globalThis.fetch;
  const storageBefore = globalThis.localStorage;
  const calls = [];
  try {
    globalThis.localStorage = { getItem: () => 'test-token' };
    globalThis.fetch = async (url, options) => {
      calls.push({ url, key: options.headers['Idempotency-Key'], body: options.body });
      if (calls.length === 1) throw new TypeError('Network interrupted');
      return new Response(JSON.stringify({ data: { id: 5001, trang_thai_don_hang: 'HOAN_THANH' } }), { status: 201 });
    };
    const key = '8f4b6a10-8632-4c37-8797-b47f371f14fa';
    await assert.rejects(checkoutPosOrder(body, key), /Network interrupted/);
    assert.equal((await checkoutPosOrder(body, key)).id, 5001);
    assert.deepEqual(calls[0], calls[1]);
    assert.equal(calls[0].url, '/api/v1/admin/pos/checkout');
  } finally { globalThis.fetch = fetchBefore; globalThis.localStorage = storageBefore; }
});

test('online order keeps backend sales inventory and serial metadata', () => {
  const product = normalizeSalesProduct({ san_pham_id: 7, phien_ban_id: 42, loai_san_pham: 'BO_PC', thue_vat: 10, quan_ly_serial: true, ton_co_the_ban: 0 });
  assert.equal(product.id, 42);
  assert.equal(product.stock, 0);
  assert.equal(product.type, 'BO_PC');
  assert.equal(product.vatRate, 10);
  assert.equal(product.serialManaged, true);
  assert.deepEqual(buildPreviewBody({
    customerId: 1, options: { kho_mac_dinh_id: 2, bang_gia: ['BAN_LE'] }, applyVat: false,
    vatMode: 'CHUA_BAO_GOM', promotion: '', shippingFee: 0, items: [{ ...product, quantity: 1 }],
  }).san_pham, [{ ma_dong: 'd42', phien_ban_id: 42, so_luong: 1 }]);
});

test('one promotion reaches both previews and commits; gift allocations never become purchased lines', async () => {
  const options = { kho_mac_dinh_id: 1, bang_gia: ['BAN_LE'] };
  const order = { tax: false, promotion: ' SALE ', paymentMethod: 'cash', paid: 99000, paymentReceived: true,
    cart: [{ product: { id: 10 }, quantity: 1, serials: [] }],
    preview: { data: { san_pham: [{ ma_dong: 'GIFT-7-20', phien_ban_id: 20, la_qua_tang: true, serial_requirements: [{ phien_ban_id: 20, so_luong_can_serial: 1 }] }] } },
    serialSelections: { 'GIFT-7-20:20': [{ id: 500 }], 'GIFT-OLD:99': [{ id: 900 }] },
  };
  const form = { options, promotion: ' SALE ', customerId: 1, applyVat: false, vatMode: 'CHUA_BAO_GOM', shippingFee: 0,
    items: [{ id: 10, quantity: 1 }], recipient: { name: 'Test', phone: '0900000000', address: '' }, delivery: 'NHAN_TAI_CUA_HANG', payment: 'TIEN_MAT', note: '' };
  const preview = quote(order.preview.data.san_pham, 99000);
  const pos = buildPosCheckoutBody(order, options, preview);
  assert.equal(pos.ma_chuong_trinh, 'SALE');
  assert.deepEqual(pos.san_pham, [{ ma_dong: 'd10', phien_ban_id: 10, so_luong: 1 }]);
  assert.deepEqual(pos.phan_bo_serial, [{ ma_dong: 'GIFT-7-20', phien_ban_id: 20, serial_ids: [500] }]);
  const before = { fetch: globalThis.fetch, storage: globalThis.localStorage };
  const calls = [];
  const signal = new AbortController().signal;
  try {
    globalThis.localStorage = { getItem: () => 'test-token' };
    globalThis.fetch = async (url, request) => { calls.push({ url, request, body: JSON.parse(request.body) }); return new Response(JSON.stringify({ data: { tien_chiet_khau: 1000, tong_thanh_toan: 99000 } })); };
    await api.previewOnlineOrder(buildPreviewBody(form), signal);
    await api.previewPosOrder(order, options, signal);
    await api.createOnlineOrder(form, preview, 'online-key');
    await checkoutPosOrder(pos, 'pos-key');
    assert.deepEqual(calls.map(call => call.url), ['/api/v1/admin/sales/preview', '/api/v1/admin/sales/preview', '/api/v1/admin/orders', '/api/v1/admin/pos/checkout']);
    assert.ok(calls.every(call => call.body.ma_chuong_trinh === 'SALE' && !Array.isArray(call.body.ma_chuong_trinh)));
    assert.equal(calls[0].body.loai_don_hang, 'ONLINE');
    assert.equal(calls[1].body.loai_don_hang, 'TAI_QUAY');
    assert.equal(calls[1].request.signal, signal);
    assert.equal(calls[2].body.tong_thanh_toan_xac_nhan, 99000);
    for (const status of [404, 409]) {
      const message = status === 404 ? 'Mã khuyến mại không tồn tại' : 'Khuyến mại chưa bắt đầu, đã hết hạn hoặc hết lượt';
      globalThis.fetch = async () => new Response(JSON.stringify({ message }), { status });
      for (const action of [() => api.previewOnlineOrder(buildPreviewBody(form)), () => api.previewPosOrder(order, options), () => api.createOnlineOrder(form, preview, 'online-key'), () => checkoutPosOrder(pos, 'pos-key')]) await assert.rejects(action, error => error.status === status && error.message === message);
    }
  } finally { globalThis.fetch = before.fetch; globalThis.localStorage = before.storage; }
});
