// State helpers for the admin point-of-sale workflow.
import { mockEmployees } from '../../../../data/mockEmployees.js';

export function createOrder(sequence) {
  return { id: sequence, code: `DH-${String(sequence).padStart(3, '0')}`, customer: null, cart: [], tax: true,
    priceList: 'retail', employee: mockEmployees[0], discount: 0, paymentMethod: 'cash', paid: 0 };
}

export function resetOrder(order) {
  return { ...createOrder(order.id), code: order.code };
}

export function closeOrderTab(orders, activeId, removedId, nextSequence) {
  const index = orders.findIndex((order) => order.id === removedId);
  const remaining = orders.filter((order) => order.id !== removedId);
  if (!remaining.length) {
    const next = createOrder(nextSequence);
    return { orders: [next], activeId: next.id };
  }
  return { orders: remaining, activeId: removedId === activeId ? remaining[Math.max(0, index - 1)].id : activeId };
}

export function finalizeOrder(order) {
  const totals = orderTotals(order);
  return { ...order, ...totals, change: order.paid - totals.total, status: 'completed' };
}

export function orderTotals(order) {
  const subtotal = order.cart.reduce((sum, item) => sum + item.product.prices[order.priceList] * item.quantity, 0);
  const vat = order.tax ? order.cart.reduce((sum, item) => sum + Math.round(item.product.prices[order.priceList] * item.quantity * item.product.vatRate / 100), 0) : 0;
  const discountAmount = Math.round((subtotal + vat) * order.discount / 100);
  return { subtotal, vat, discountAmount, total: subtotal + vat - discountAmount };
}

export function updateOrder(order, patch) {
  const next = { ...order, ...patch };
  if (['cart', 'tax', 'priceList', 'discount'].some((field) => Object.hasOwn(patch, field))) next.paid = orderTotals(next).total;
  return next;
}

export function addProduct(cart, product) {
  return cart.some((item) => item.product.id === product.id)
    ? cart.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...cart, { product, quantity: 1 }];
}
