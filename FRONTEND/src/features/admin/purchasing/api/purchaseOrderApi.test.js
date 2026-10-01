import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePurchaseOrder, saveBody } from './purchaseOrderApi.js';

test('maps the backend contract without recomputing authoritative totals', () => {
  const order = normalizePurchaseOrder({
    id: 1, ma_don_nhap: 'DN1', tong_tien: 110, tien_hang: 100, tien_thue: 10,
    so_tien_da_thanh_toan: 40, so_tien_con_no: 70, trang_thai_nhap: 'DAT_HANG',
    trang_thai_thanh_toan: 'TRA_MOT_PHAN', items: [{ id: 2, phien_ban_id: 3, so_luong: 2, gia_nhap: 50, thanh_tien: 100 }],
  });
  assert.equal(order.total, 110);
  assert.equal(order.debt, 70);
  assert.equal(order.items[0].lineTotal, 100);
});

test('save payload contains only fields accepted by create and update', () => {
  assert.deepEqual(saveBody({ supplierId: 1, warehouseId: 2, applyTax: true, items: [{ versionId: 3, qty: 4, unitPrice: 5 }] }), {
    nha_cung_cap_id: 1, kho_hang_id: 2, ap_dung_thue: true,
    items: [{ phien_ban_id: 3, so_luong: 4, gia_nhap: 5 }],
  });
});
