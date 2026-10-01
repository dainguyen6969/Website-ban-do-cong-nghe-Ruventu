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

const priceOf = (product, priceList) => Number(product.unitPrice ?? product.prices?.[priceList] ?? 0);

export function orderTotals(order) {
  const subtotal = order.cart.reduce((sum, item) => sum + priceOf(item.product, order.priceList) * item.quantity, 0);
  const included = order.taxMode === 'DA_BAO_GOM';
  const vat = order.tax ? order.cart.reduce((sum, item) => {
    const line = priceOf(item.product, order.priceList) * item.quantity;
    return sum + Math.round(included ? line - line / (1 + item.product.vatRate / 100) : line * item.product.vatRate / 100);
  }, 0) : 0;
  const gross = subtotal + (included ? 0 : vat);
  const discountAmount = Math.round(gross * order.discount / 100);
  return { subtotal, vat, discountAmount, total: gross - discountAmount };
}

export function updateOrder(order, patch) {
  const next = { ...order, ...patch };
  if (['cart', 'tax', 'taxMode', 'priceList', 'discount'].some((field) => Object.hasOwn(patch, field))) next.paid = orderTotals(next).total;
  return next;
}

export function addProduct(cart, product) {
  return cart.some((item) => item.product.id === product.id)
    ? cart.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...cart, { product, quantity: 1, serials: [] }];
}

export const findIncompleteSerialLine = (cart) => cart.find(
  (item) => item.product.serialManaged && (item.serials?.length || 0) !== item.quantity,
) || null;
