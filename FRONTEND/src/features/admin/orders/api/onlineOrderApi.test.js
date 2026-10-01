import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreviewBody, normalizeSalesCustomer, normalizeSalesProduct } from './onlineOrderApi.js';

test('sales customer lookup keeps the real backend id and contact fields', () => {
  assert.deepEqual(normalizeSalesCustomer({
    id: 12, ho_ten: 'Nguyễn Văn An', so_dien_thoai: '0901234567', email: 'an@example.com',
  }), { id: 12, name: 'Nguyễn Văn An', phone: '0901234567', email: 'an@example.com' });
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
