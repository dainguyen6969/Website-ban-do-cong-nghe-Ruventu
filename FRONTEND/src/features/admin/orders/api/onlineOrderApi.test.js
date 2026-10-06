import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPosCheckoutBody, buildPreviewBody, checkoutPosOrder, normalizeSalesCustomer, normalizeSalesProduct } from './onlineOrderApi.js';

test('sales customer lookup keeps the real backend id and contact fields', () => {
  assert.deepEqual(normalizeSalesCustomer({
    id: 12, ho_ten: 'Nguyễn Văn An', so_dien_thoai: '0901234567', email: 'an@example.com',
  }), { id: 12, name: 'Nguyễn Văn An', phone: '0901234567', email: 'an@example.com' });
});

test('POS checkout sends real serial IDs, payment fields and an unchanged key/body on retry', async () => {
  const order = { customer: null, employee: { id: 1 }, tax: true, paymentMethod: 'cash', paid: 2100000, paymentReceived: true, cart: [{ product: { id: 101 }, quantity: 2, serials: [{ id: 501 }, { id: 502 }] }], note: 'Khách nhận tại quầy' };
  const options = { kho_mac_dinh_id: 1, bang_gia: ['BAN_LE'] };
  const body = buildPosCheckoutBody(order, options, 2090000, '2026-09-14T11:00:00+07:00');
  assert.equal(body.khach_hang_id, null);
  assert.deepEqual(body.san_pham, [{ ma_dong: 'd101', phien_ban_id: 101, so_luong: 2 }]);
  assert.deepEqual(body.phan_bo_serial, [{ ma_dong: 'd101', phien_ban_id: 101, serial_ids: [501, 502] }]);
  assert.deepEqual(body.thanh_toan, { phuong_thuc: 'TIEN_MAT', tien_khach_dua: 2100000, ngay_thanh_toan: '2026-09-14T11:00:00+07:00', ma_giao_dich: null, xac_nhan_da_nhan_tien: true });
  for (const [method, code] of [['transfer', 'CHUYEN_KHOAN'], ['card', 'THE']]) {
    const payment = buildPosCheckoutBody({ ...order, paymentMethod: method, paid: 2090000, transactionCode: ' TX-1 ' }, options, 2090000).thanh_toan;
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
