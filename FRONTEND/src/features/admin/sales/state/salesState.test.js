// Tests for point-of-sale state helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addProduct, closeOrderTab, createOrder, finalizeOrder, findIncompleteSerialLine, findStockIssue, giftSerialRequirements, nextOrderNumber, orderTotals, resetOrder, setProductQuantity, updateOrder } from './salesState.js';

const product = { id: 'VGA', vatRate: 10, prices: { retail: 24990000, dealer: 23000000, business: 22000000 } };

test('VAT and percentage discount use the tax-inclusive order amount', () => {
  const order = updateOrder(createOrder(1), { cart: addProduct([], product), discount: 10 });
  assert.deepEqual(orderTotals(order), { subtotal: 24990000, vat: 2499000, discountAmount: 2748900, total: 24740100 });
  assert.equal(order.paid, 24740100);
  const exempt = updateOrder(order, { tax: false });
  assert.deepEqual(orderTotals(exempt), { subtotal: 24990000, vat: 0, discountAmount: 2499000, total: 22491000 });
  assert.equal(exempt.paid, 22491000);
});

test('backend unit price and tax-included mode do not add VAT twice', () => {
  const order = updateOrder(createOrder(1), { cart: addProduct([], { id: 42, unitPrice: 110000, vatRate: 10 }), taxMode: 'DA_BAO_GOM' });
  assert.deepEqual(orderTotals(order), { subtotal: 110000, vat: 10000, discountAmount: 0, total: 110000 });
});

test('duplicate products increment one row and preserve the original cart', () => {
  const original = addProduct([], product);
  const cart = addProduct(original, product);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);
  assert.equal(original[0].quantity, 1);
});

test('serial-managed lines stay blocked until quantity and selected serials match', () => {
  const line = { ...addProduct([], { ...product, serialManaged: true })[0], quantity: 2, serialAvailable: 1 };
  assert.equal(findIncompleteSerialLine([line]), line);
  assert.equal(findIncompleteSerialLine([{ ...line, serials: [{ id: 1 }, { id: 2 }] }]), null);
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
  assert.deepEqual(next, { id: 2, code: 'DH-002', customer: null, cart: [], tax: true, priceList: 'retail', employee: null, discount: 0, promotion: '', paymentMethod: 'cash', paid: 0 });
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

test('closing the last tab reuses number one with the logged-in employee', () => {
  const employee = { id: 9, ho_ten: 'Nhân viên thật' };
  const old = updateOrder(createOrder(5, employee), { cart: addProduct([], product) });
  const next = closeOrderTab([old], 5, 5, 6);
  assert.deepEqual(next, { orders: [createOrder(1, employee)], activeId: 1 });
  assert.equal(next.orders[0].employee, employee);
});

test('deleted tabs reuse the lowest unused number repeatedly, including gaps', () => {
  let orders = [createOrder(1), createOrder(2)];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    orders = closeOrderTab(orders, 2, 2).orders;
    orders.push(createOrder(nextOrderNumber(orders)));
    assert.deepEqual(orders.map((order) => order.code), ['DH-001', 'DH-002']);
  }
  assert.equal(nextOrderNumber([createOrder(1), createOrder(3), createOrder(5)]), 2);
  assert.equal(nextOrderNumber([createOrder(3)]), 1);
});

test('quantity above real available stock is reported', () => {
  const line = { ...addProduct([], { ...product, stock: 3 })[0], quantity: 4 };
  assert.equal(findStockIssue([line]), line);
  assert.equal(findStockIssue([{ ...line, quantity: 3 }]), null);
});

test('quantity entry is clamped to real available stock and trims serials', () => {
  const line = { ...addProduct([], { ...product, stock: 6 })[0], serials: Array.from({ length: 6 }, (_, id) => ({ id })) };
  assert.equal(setProductQuantity([line], 'VGA', 99)[0].quantity, 6);
  const reduced = setProductQuantity([line], 'VGA', 3)[0];
  assert.equal(reduced.quantity, 3);
  assert.equal(reduced.serials.length, 3);
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
  const employee = { id: 3, ho_ten: 'Nhân viên đăng nhập' };
  const order = updateOrder(createOrder(7, employee), { customer: { id: 'KH006' }, cart: addProduct([], product), tax: false, priceList: 'business', discount: 15, paymentMethod: 'transfer' });
  const receipt = finalizeOrder(order);
  const reset = resetOrder(order);
  assert.deepEqual(reset, createOrder(7, employee));
  assert.equal(receipt.cart.length, 1);
  assert.ok(receipt.total > 0);
  assert.equal(receipt.code, reset.code);
});

test('server totals include pre-VAT promotion allocation and changing pricing invalidates payment confirmation', () => {
  const order = { ...createOrder(1), cart: addProduct([], product), promotion: 'SALE', paymentReceived: true,
    preview: { data: { tong_tien_hang: 100000, tien_chiet_khau: 10000, tong_tien_vat: 9000, tong_thanh_toan: 99000 } }, giftSerials: { gift: [{ id: 1 }] } };
  assert.deepEqual(orderTotals(order), { subtotal: 100000, discountAmount: 10000, vat: 9000, total: 99000 });
  assert.equal(updateOrder(order, { note: 'Unrelated' }).preview, order.preview);
  for (const patch of [{ promotion: 'OTHER' }, { cart: [] }, { tax: false }, { customer: { id: 2 } }]) {
    const changed = updateOrder(order, patch);
    assert.equal(changed.preview, null);
    assert.equal(changed.paymentReceived, false);
    assert.deepEqual(changed.giftSerials, {});
  }
  assert.equal(resetOrder(order).promotion, '');
});

test('gift serials use server gift row and component IDs, separate from purchased variant IDs', () => {
  assert.deepEqual(giftSerialRequirements({ san_pham: [
    { ma_dong: 'd10', la_qua_tang: false, serial_requirements: [{ phien_ban_id: 10, so_luong_can_serial: 1 }] },
    { ma_dong: 'GIFT-7-20', la_qua_tang: true, serial_requirements: [{ phien_ban_id: 21, so_luong_can_serial: 2 }, { phien_ban_id: 22, so_luong_can_serial: 1 }] },
  ] }), [{ key: 'GIFT-7-20:21', variantId: 21, quantity: 2 }, { key: 'GIFT-7-20:22', variantId: 22, quantity: 1 }]);
});
