// State helpers for the admin point-of-sale workflow.
export function createOrder(sequence, employee = null) {
  return { id: sequence, code: `DH-${String(sequence).padStart(3, '0')}`, customer: null, cart: [], tax: true,
    priceList: 'retail', employee, discount: 0, paymentMethod: 'cash', paid: 0 };
}

export function resetOrder(order) {
  return { ...createOrder(order.id, order.employee), code: order.code };
}

export function closeOrderTab(orders, activeId, removedId, nextSequence) {
  const index = orders.findIndex((order) => order.id === removedId);
  const remaining = orders.filter((order) => order.id !== removedId);
  if (!remaining.length) {
    const next = createOrder(nextSequence, orders[0]?.employee);
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
    ? cart.map((item) => item.product.id === product.id ? { ...item, product, quantity: clampQuantity(product, item.quantity + 1) } : item)
    : [...cart, { product, quantity: 1, serials: [] }];
}

const clampQuantity = (product, value) => {
  const stock = Number(product.stock);
  return Math.min(Number.isFinite(stock) ? Math.max(1, Math.trunc(stock)) : Infinity, Math.max(1, Math.trunc(Number(value)) || 1));
};

export const setProductQuantity = (cart, id, value) => cart.map((item) => {
  if (item.product.id !== id) return item;
  const quantity = clampQuantity(item.product, value);
  return { ...item, quantity, serials: (item.serials || []).slice(0, quantity) };
});

export const findIncompleteSerialLine = (cart) => cart.find(
  (item) => item.product.serialManaged && (item.serials?.length || 0) !== item.quantity,
) || null;

export const findStockIssue = (cart) => cart.find((item) => item.quantity > item.product.stock) || null;
