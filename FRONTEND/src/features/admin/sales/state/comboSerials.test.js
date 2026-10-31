import assert from 'node:assert/strict';
import test from 'node:test';
import { addProduct, applyOrderPreview, closeOrderTab, createOrder, setProductQuantity, updateOrder } from './salesState.js';

const combo = { id: 747, type: 'BO_PC', serialManaged: true, stock: 10 };

test('changing combo quantity keeps allocations until the new requirements arrive', () => {
  const cart = [{ product: combo, quantity: 2, serials: [] }];
  const original = { ...createOrder(1), cart, paid: 100, paymentReceived: true,
    preview: { data: { tong_thanh_toan: 100 } },
    serialSelections: { 'd747:10': [{ id: 101 }], 'd747:20': [{ id: 201 }], 'GIFT-1:99': [{ id: 999 }] } };
  for (const changedCart of [setProductQuantity(cart, 747, 1), addProduct(cart, combo)]) {
    const changed = updateOrder(original, { cart: changedCart });
    assert.deepEqual(changed.serialSelections, original.serialSelections);
    assert.equal(changed.preview, null);
    assert.equal(changed.paymentReceived, false);
    assert.equal(changed.paid, 0);
  }
  assert.equal(original.cart[0].quantity, 2);
  assert.equal(original.serialSelections['d747:10'][0].id, 101);
});

test('VAT and financial edits retain serials while invalidating the quote and payment confirmation', () => {
  const order = { ...createOrder(1), serialSelections: { 'd747:10': [{ id: 101 }] } };
  assert.equal(updateOrder(order, { note: 'Ghi chú' }).serialSelections, order.serialSelections);
  for (const patch of [{ promotion: 'SALE' }, { customer: { id: 2 } }, { tax: true }, { priceList: 'dealer' }]) {
    assert.equal(updateOrder(order, patch).serialSelections, order.serialSelections);
    assert.equal(updateOrder(order, patch).paymentReceived, false);
    assert.equal(updateOrder(order, patch).preview, null);
  }
});

const preview = (quantity = 1) => ({ tong_thanh_toan: 110, san_pham: [
  { ma_dong: 'd747', serial_requirements: [{ phien_ban_id: 10, so_luong_can_serial: quantity }] },
] });

test('fresh VAT or checkout quotes keep valid serials, trim reduced quantity and remove obsolete gifts', () => {
  const original = { ...createOrder(1), paid: 100, preview: { data: { tong_thanh_toan: 100 } },
    serialSelections: { 'd747:10': [{ id: 101 }, { id: 102 }], 'GIFT-OLD:99': [{ id: 999 }] } };
  const refreshed = applyOrderPreview(original, 'vat', preview(2));
  assert.deepEqual(refreshed.serialSelections, { 'd747:10': [{ id: 101 }, { id: 102 }] });
  assert.equal(refreshed.paid, 110);
  assert.deepEqual(applyOrderPreview(refreshed, 'reduced', preview()).serialSelections, { 'd747:10': [{ id: 101 }] });
  assert.equal(original.serialSelections['d747:10'].length, 2);
  assert.equal(applyOrderPreview({ ...original, paid: 200 }, 'refresh', preview()).paid, 200);
});

test('switching to a new tab and refreshing after a rejected checkout preserves each draft', () => {
  const first = { ...createOrder(1), serialSelections: { 'd747:10': [{ id: 101 }] }, note: 'Giữ đơn' };
  const second = { ...createOrder(2), serialSelections: { 'd747:10': [{ id: 102 }] } };
  const orders = [first, second];
  const revisited = applyOrderPreview(first, 'switch-back', preview());
  const retry = applyOrderPreview({ ...revisited, preview: null, paymentReceived: false }, 'retry', preview());
  assert.deepEqual(retry.serialSelections, first.serialSelections);
  assert.equal(retry.note, 'Giữ đơn');
  assert.equal(closeOrderTab(orders, 2, 2).orders[0], first);
  assert.deepEqual(orders[1].serialSelections, second.serialSelections);
});
