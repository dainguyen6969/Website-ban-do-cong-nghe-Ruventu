// State helpers for the admin point-of-sale workflow.
export function createOrder(sequence, employee = null) {
  return {
    id: sequence,
    code: `DH-${String(sequence).padStart(3, "0")}`,
    customer: null,
    cart: [],
    serialSelections: {},
    tax: false,
    taxMode: "CHUA_BAO_GOM",
    priceList: "retail",
    employee,
    discount: 0,
    promotion: "",
    paymentMethod: "cash",
    paid: 0,
    paymentReceived: false,
    transactionCode: "",
    note: "",
  };
}

export function resetOrder(order) {
  return { ...createOrder(order.id, order.employee), code: order.code };
}

export function nextOrderNumber(orders) {
  let number = 1;
  while (orders.some((order) => order.id === number)) number += 1;
  return number;
}

export function closeOrderTab(orders, activeId, removedId) {
  const index = orders.findIndex((order) => order.id === removedId);
  const remaining = orders.filter((order) => order.id !== removedId);
  if (!remaining.length) {
    const next = createOrder(1, orders[0]?.employee);
    return { orders: [next], activeId: next.id };
  }
  return {
    orders: remaining,
    activeId:
      removedId === activeId ? remaining[Math.max(0, index - 1)].id : activeId,
  };
}

export function finalizeOrder(order) {
  const totals = orderTotals(order);
  return {
    ...order,
    ...totals,
    change: order.paid - totals.total,
    status: "completed",
  };
}

const priceOf = (product, priceList) =>
  Number(product.unitPrice ?? product.prices?.[priceList] ?? 0);

export function orderTotals(order) {
  if (!order.cart.length) {
    return {
      subtotal: 0,
      vat: 0,
      discountAmount: 0,
      total: 0,
    };
  }

  if (order.preview && !order.discount) {
    const data = order.preview.data;

    return {
      subtotal: Number(data.tong_tien_hang),
      vat: Number(data.tong_tien_vat),
      discountAmount: Number(data.tien_chiet_khau),
      total: Number(data.tong_thanh_toan),
    };
  }

  return {
    subtotal: order.cart.reduce(
      (sum, item) =>
        sum + priceOf(item.product, order.priceList) * item.quantity,
      0,
    ),
    vat: null,
    discountAmount: null,
    total: null,
  };
}

export function updateOrder(order, patch) {
  const next = { ...order, ...patch };

  const financialChanged = [
    "cart",
    "tax",
    "taxMode",
    "priceList",
    "discount",
    "promotion",
    "customer",
  ].some((field) => Object.hasOwn(patch, field));

  if (financialChanged) {
    next.preview = null;
    next.serialSelections = {};
    next.paymentReceived = false;
    next.paid = 0;
  }

  return next;
}

export function addProduct(cart, product) {
  return cart.some((item) => item.product.id === product.id)
    ? cart.map((item) =>
        item.product.id === product.id
          ? {
              ...item,
              product,
              quantity: clampQuantity(product, item.quantity + 1),
            }
          : item,
      )
    : [...cart, { product, quantity: 1, serials: [] }];
}

const clampQuantity = (product, value) => {
  const stock = Number(product.stock);
  return Math.min(
    Number.isFinite(stock) ? Math.max(1, Math.trunc(stock)) : Infinity,
    Math.max(1, Math.trunc(Number(value)) || 1),
  );
};

export const setProductQuantity = (cart, id, value) =>
  cart.map((item) => {
    if (item.product.id !== id) return item;
    const quantity = clampQuantity(item.product, value);
    return {
      ...item,
      quantity,
      serials: (item.serials || []).slice(0, quantity),
    };
  });

export const findIncompleteSerialLine = (cart) =>
  cart.find(
    (item) =>
      item.product.serialManaged &&
      (item.serials?.length || 0) !== item.quantity,
  ) || null;

export const findStockIssue = (cart) =>
  cart.find((item) => item.quantity > item.product.stock) || null;

export const giftSerialRequirements = (preview) =>
  (preview?.san_pham || [])
    .filter((line) => line.la_qua_tang)
    .flatMap((line) =>
      line.serial_requirements.map((requirement) => ({
        key: `${line.ma_dong}:${requirement.phien_ban_id}`,
        variantId: requirement.phien_ban_id,
        quantity: requirement.so_luong_can_serial,
      })),
    );
