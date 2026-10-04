import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => 'test-token' };

test('order lifecycle actions use the documented endpoints and request shapes', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  };
  const api = await import('./orderApi.js');
  await api.approveOrder(7);
  await api.startFulfillment(7, { doi_tac_van_chuyen_id: null, phi_tra_doi_tac: null });
  await api.setPackingStatus(7, 'DA_DONG_GOI');
  await api.setDeliveryStatus(12, 'DA_NHAN_HANG');
  await api.confirmOrderPayment(7);
  await api.confirmPickup(7);
  await api.cancelOrder(7, 'test');
  await api.setDeliveryStatus(12, 'GIAO_THANH_CONG', true);
  assert.deepEqual(calls, [
    { url: '/api/v1/admin/orders/7/approve', method: 'POST', body: { xac_nhan: true } },
    { url: '/api/v1/admin/orders/7/fulfillment', method: 'POST', body: { xac_nhan: true, doi_tac_van_chuyen_id: null, phi_tra_doi_tac: null } },
    { url: '/api/v1/admin/orders/7/packing-status', method: 'PATCH', body: { trang_thai_dong_goi: 'DA_DONG_GOI' } },
    { url: '/api/v1/admin/deliveries/12/status', method: 'PATCH', body: { trang_thai_giao_hang: 'DA_NHAN_HANG' } },
    { url: '/api/v1/admin/orders/7/payment/confirm', method: 'POST', body: { xac_nhan: true } },
    { url: '/api/v1/admin/orders/7/pickup/confirm', method: 'POST', body: { xac_nhan_da_nhan_hang: true } },
    { url: '/api/v1/admin/orders/7/cancel', method: 'POST', body: { ly_do: 'test' } },
    { url: '/api/v1/admin/deliveries/12/status', method: 'PATCH', body: { trang_thai_giao_hang: 'GIAO_THANH_CONG', xac_nhan_da_thu_cod: true } },
  ]);
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

