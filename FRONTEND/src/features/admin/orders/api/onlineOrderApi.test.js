import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreviewBody, normalizeSalesProduct } from './onlineOrderApi.js';

test('online order sends only the backend variant id and keeps out-of-stock products visible', () => {
  const product = normalizeSalesProduct({ san_pham_id: 7, phien_ban_id: 42, loai_san_pham: 'BO_PC', ton_co_the_ban: 0 });
  assert.equal(product.id, 42);
  assert.equal(product.stock, 0);
  assert.equal(product.type, 'BO_PC');
  assert.deepEqual(buildPreviewBody({
    customerId: 1, options: { kho_mac_dinh_id: 2, bang_gia: ['BAN_LE'] }, applyVat: false,
    vatMode: 'CHUA_BAO_GOM', promotion: '', shippingFee: 0, items: [{ ...product, quantity: 1 }],
  }).san_pham, [{ ma_dong: 'd42', phien_ban_id: 42, so_luong: 1 }]);
});
