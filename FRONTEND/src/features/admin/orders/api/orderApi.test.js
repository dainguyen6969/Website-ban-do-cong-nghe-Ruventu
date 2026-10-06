import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => 'test-token' };

test('order lifecycle actions use the documented endpoints and request shapes', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: JSON.parse(options.body), ...(options.headers['Idempotency-Key'] ? { key: options.headers['Idempotency-Key'] } : {}) });
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  };
  const api = await import('./orderApi.js');
  await api.approveOrder(7);
  await api.startFulfillment(7);
  await api.setPackingStatus(7, 'DA_DONG_GOI');
  await api.startOrderDelivery(7, 12, 25000);
  const payment = { nguon_thu: 'KHACH_HANG', phuong_thuc_thanh_toan: 'TIEN_MAT', so_tien_thanh_toan: 5000, ngay_thanh_toan: '2026-10-05T08:00:00+07:00', ma_giao_dich_thanh_toan: null };
  await api.confirmOrderPayment(7, payment, 'payment-key');
  await api.confirmPickup(7);
  await api.cancelOrder(7, 'test');
  await api.setDeliveryStatus(12, 'GIAO_THANH_CONG', true);
  const refund = { phuong_thuc_hoan: 'TIEN_MAT', ngay_hoan_tien: payment.ngay_thanh_toan, ma_giao_dich: null };
  await api.refundOrder(7, refund, 'refund-key');
  assert.deepEqual(calls, [
    { url: '/api/v1/admin/orders/7/approve', method: 'POST', body: { xac_nhan: true } },
    { url: '/api/v1/admin/orders/7/fulfillment', method: 'POST', body: { xac_nhan: true } },
    { url: '/api/v1/admin/orders/7/packing-status', method: 'PATCH', body: { trang_thai_dong_goi: 'DA_DONG_GOI' } },
    { url: '/api/v1/admin/orders/7/delivery/start', method: 'POST', body: { xac_nhan: true, doi_tac_van_chuyen_id: 12, phi_tra_doi_tac: 25000 } },
    { url: '/api/v1/admin/orders/7/payment/confirm', method: 'POST', body: { ...payment, xac_nhan_da_nhan_tien: true }, key: 'payment-key' },
    { url: '/api/v1/admin/orders/7/pickup/confirm', method: 'POST', body: { xac_nhan_da_nhan_hang: true } },
    { url: '/api/v1/admin/orders/7/cancel', method: 'POST', body: { ly_do: 'test' } },
    { url: '/api/v1/admin/deliveries/12/status', method: 'PATCH', body: { trang_thai_giao_hang: 'GIAO_THANH_CONG', xac_nhan_da_thu_cod: true } },
    { url: '/api/v1/admin/orders/7/refund', method: 'POST', body: { ...refund, xac_nhan_da_hoan_tien: true }, key: 'refund-key' },
  ]);
});

test('edits stay locked and store receipts follow the customer payment and COD states', async () => {
  const { canEditOnlineOrder, paymentSource } = await import('./orderApi.js');
  const draft = { loai_don_hang: 'ONLINE', trang_thai_don_hang: 'CHO_DUYET', trang_thai_thanh_toan: 'CHUA_THANH_TOAN', trang_thai_dong_goi: 'CHUA_DONG_GOI', trang_thai_xuat_kho: 'CHUA_XUAT_KHO', tong_thanh_toan: 5000 };
  assert.equal(canEditOnlineOrder(draft), true);
  for (const change of [{ loai_don_hang: 'TAI_QUAY' }, { trang_thai_thanh_toan: 'DA_THANH_TOAN' }, { trang_thai_xuat_kho: 'DA_XUAT_KHO' }, { trang_thai_don_hang: 'CHO_DONG_GOI', trang_thai_dong_goi: 'HUY_DONG_GOI' }]) assert.equal(canEditOnlineOrder({ ...draft, ...change }), false);
  assert.equal(paymentSource(draft), null);
  const approved = { ...draft, trang_thai_don_hang: 'CHO_DONG_GOI' };
  assert.deepEqual(paymentSource(approved), { nguon_thu: 'KHACH_HANG' });
  for (const status of ['DA_NHAN_HANG', 'DANG_GIAO', 'CHO_HOAN_HANG']) assert.equal(paymentSource({ ...approved, phieu_giao_hang: [{ id: 12, trang_thai_giao_hang: status, tien_thu_ho_cod: 5000 }] }), null);
  const completedCod = { ...approved, trang_thai_don_hang: 'HOAN_THANH', trang_thai_thanh_toan: 'DA_THANH_TOAN', trang_thai_xuat_kho: 'DA_XUAT_KHO', phieu_giao_hang: [{ id: 12, trang_thai_giao_hang: 'GIAO_THANH_CONG', tien_thu_ho_cod: 5000 }] };
  assert.deepEqual(paymentSource(completedCod), { nguon_thu: 'DOI_TAC_GIAO_HANG', phieu_giao_hang_id: 12 });
  assert.deepEqual(paymentSource({ ...completedCod, da_ghi_nhan_thu_cod: false }), { nguon_thu: 'DOI_TAC_GIAO_HANG', phieu_giao_hang_id: 12 });
  assert.equal(paymentSource({ ...completedCod, da_ghi_nhan_thu_cod: true }), null);
  for (const change of [{ trang_thai_don_hang: 'DANG_GIAO_HANG' }, { trang_thai_thanh_toan: 'CHUA_THANH_TOAN' }, { trang_thai_xuat_kho: 'CHUA_XUAT_KHO' }, { phieu_giao_hang: [{ id: 12, trang_thai_giao_hang: 'GIAO_THANH_CONG', tien_thu_ho_cod: 0 }] }, { phieu_giao_hang: [{ id: 12, trang_thai_giao_hang: 'GIAO_THANH_CONG', tien_thu_ho_cod: 4999 }] }]) assert.equal(paymentSource({ ...completedCod, ...change }), null);
  assert.equal(paymentSource({ ...approved, trang_thai_thanh_toan: 'DA_THANH_TOAN' }), null);
  for (const change of [{ trang_thai_don_hang: 'HUY_HANG' }, { trang_thai_don_hang: 'HOAN_THANH' }, { trang_thai_xuat_kho: 'DA_HOAN_KHO' }]) assert.equal(paymentSource({ ...approved, ...change }), null);
  assert.equal(paymentSource({ ...approved, tong_thanh_toan: 0 }), null);
});

test('create/edit omit preview-only fields and preserve confirmed server totals', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response(JSON.stringify({ data: {} }), { status: 200 }); };
  const api = await import('./onlineOrderApi.js');
  const form = { options: { kho_mac_dinh_id: 1, bang_gia: ['BAN_LE'] }, customerId: 2, applyVat: false, vatMode: 'CHUA_BAO_GOM', promotion: 'SALE', shippingFee: 0, items: [{ id: 3, quantity: 1 }], recipient: { name: 'Test', phone: '0901234567', address: 'Test' }, delivery: 'GIAO_HANG', payment: 'TIEN_MAT', note: '' };
  await api.createOnlineOrder(form, 5000);
  await api.updateOnlineOrder(7, form, 5000);
  assert.equal(api.buildPreviewBody(form).loai_don_hang, 'ONLINE');
  for (const call of calls) { assert.equal('loai_don_hang' in call.body, false); assert.equal(call.body.tong_thanh_toan_xac_nhan, 5000); }
  assert.equal(calls[0].body.ma_chuong_trinh, 'SALE');
  assert.equal(calls[1].body.ma_chuong_trinh, null);
});
