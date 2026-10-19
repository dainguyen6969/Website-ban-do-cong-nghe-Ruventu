import assert from 'node:assert/strict';
import test from 'node:test';
import { addProduct, createOrder, setProductQuantity, updateOrder } from './salesState.js';

const combo = { id: 747, type: 'BO_PC', serialManaged: true, stock: 10 };

test('changing combo quantity clears shared serial allocations and payment confirmation', () => {
  const cart = [{ product: combo, quantity: 2, serials: [] }];
  const original = { ...createOrder(1), cart, paid: 100, paymentReceived: true,
    preview: { data: { tong_thanh_toan: 100 } },
    serialSelections: { 'd747:10': [{ id: 101 }], 'd747:20': [{ id: 201 }], 'GIFT-1:99': [{ id: 999 }] } };
  for (const changedCart of [setProductQuantity(cart, 747, 1), addProduct(cart, combo)]) {
    const changed = updateOrder(original, { cart: changedCart });
    assert.deepEqual(changed.serialSelections, {});
    assert.equal(changed.preview, null);
    assert.equal(changed.paymentReceived, false);
    assert.equal(changed.paid, 0);
  }
  assert.equal(original.cart[0].quantity, 2);
  assert.equal(original.serialSelections['d747:10'][0].id, 101);
});

test('unrelated edits retain combo allocations while every financial edit requires reselection', () => {
  const order = { ...createOrder(1), serialSelections: { 'd747:10': [{ id: 101 }] } };
  assert.equal(updateOrder(order, { note: 'Ghi chú' }).serialSelections, order.serialSelections);
  for (const patch of [{ promotion: 'SALE' }, { customer: { id: 2 } }, { tax: true }, { priceList: 'dealer' }]) {
    assert.deepEqual(updateOrder(order, patch).serialSelections, {});
  }
});
