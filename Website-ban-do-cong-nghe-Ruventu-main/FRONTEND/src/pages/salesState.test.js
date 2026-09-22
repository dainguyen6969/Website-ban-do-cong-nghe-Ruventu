import test from 'node:test';
import assert from 'node:assert/strict';
import { addProduct, closeOrderTab, createOrder, finalizeOrder, orderTotals, resetOrder, updateOrder } from './salesState.js';
import { mockEmployees } from '../data/mockEmployees.js';

const product = { id: 'VGA', vatRate: 10, prices: { retail: 24990000, dealer: 23000000, business: 22000000 } };

test('VAT and percentage discount use the tax-inclusive order amount', () => {
  const order = updateOrder(createOrder(1), { cart: addProduct([], product), discount: 10 });
  assert.deepEqual(orderTotals(order), { subtotal: 24990000, vat: 2499000, discountAmount: 2748900, total: 24740100 });
  assert.equal(order.paid, 24740100);
  const exempt = updateOrder(order, { tax: false });
  assert.deepEqual(orderTotals(exempt), { subtotal: 24990000, vat: 0, discountAmount: 2499000, total: 22491000 });
  assert.equal(exempt.paid, 22491000);
});

test('duplicate products increment one row and preserve the original cart', () => {
  const original = addProduct([], product);
  const cart = addProduct(original, product);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);
  assert.equal(original[0].quantity, 1);
});

test('manual payment survives unrelated changes and recalculates with pricing or cart changes', () => {
  const order = updateOrder(createOrder(1), { cart: addProduct([], product) });
  const paid = updateOrder(order, { paid: 30000000 });
  assert.equal(updateOrder(paid, { employee: 'Vi Nhật Minh', paymentMethod: 'transfer' }).paid, 30000000);
  assert.equal(updateOrder(paid, { priceList: 'dealer' }).paid, 25300000);
  assert.equal(updateOrder(paid, { cart: [] }).paid, 0);
});

test('new orders reset defaults without changing existing order data', () => {
  const first = updateOrder(createOrder(1), { cart: addProduct([], product), customer: { id: 'KH004' }, tax: false, priceList: 'dealer', discount: 5, employee: 'Vi Nhật Minh', paymentMethod: 'transfer' });
  const next = createOrder(2);
  assert.deepEqual(next, { id: 2, code: 'DH-002', customer: null, cart: [], tax: true, priceList: 'retail', employee: mockEmployees[0], discount: 0, paymentMethod: 'cash', paid: 0 });
  const changed = updateOrder(next, { cart: addProduct([], { ...product, id: 'CPU' }) });
  assert.equal(first.cart[0].product.id, 'VGA');
  assert.equal(first.customer.id, 'KH004');
  assert.equal(changed.cart[0].product.id, 'CPU');
});

test('closing active and inactive tabs preserves other orders and selects a neighbor', () => {
  const orders = [createOrder(1), updateOrder(createOrder(2), { cart: addProduct([], product) }), createOrder(3)];
  const inactive = closeOrderTab(orders, 2, 1, 4);
  assert.equal(inactive.activeId, 2);
  assert.equal(inactive.orders[0], orders[1]);
  const active = closeOrderTab(orders, 2, 2, 4);
  assert.equal(active.activeId, 1);
  assert.deepEqual(active.orders.map((order) => order.id), [1, 3]);
  assert.equal(closeOrderTab(orders, 1, 1, 4).activeId, 2);
});

test('closing the last tab creates a fresh sequential order with the first employee', () => {
  const old = updateOrder(createOrder(5), { cart: addProduct([], product), employee: mockEmployees[3] });
  const next = closeOrderTab([old], 5, 5, 6);
  assert.deepEqual(next, { orders: [createOrder(6)], activeId: 6 });
  assert.equal(next.orders[0].employee, 'Nguyễn Huy Hoàng');
});

test('receipt records exact, overpaid and underpaid change without mutating the order', () => {
  const order = updateOrder(createOrder(1), { cart: addProduct([], product), discount: 10 });
  assert.equal(finalizeOrder(order).change, 0);
  assert.equal(finalizeOrder({ ...order, paid: order.paid + 100000 }).change, 100000);
  assert.equal(finalizeOrder({ ...order, paid: order.paid - 100000 }).change, -100000);
  assert.equal(finalizeOrder(order).status, 'completed');
  assert.equal(order.status, undefined);
});

test('payment reset retains the tab code, restores every default and preserves the receipt', () => {
  const order = updateOrder(createOrder(7), { customer: { id: 'KH006' }, cart: addProduct([], product), tax: false, priceList: 'business', employee: mockEmployees[2], discount: 15, paymentMethod: 'transfer' });
  const receipt = finalizeOrder(order);
  const reset = resetOrder(order);
  assert.deepEqual(reset, createOrder(7));
  assert.equal(receipt.cart.length, 1);
  assert.ok(receipt.total > 0);
  assert.equal(receipt.code, reset.code);
});
