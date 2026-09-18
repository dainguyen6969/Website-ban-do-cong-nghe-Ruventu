import { readSharedState, writeSharedState } from '../sync/adminSync.js';

// VERIFIED ORDER LINK:
// Customer returns read the live OrderProvider collection (ruventu_orders_v1).
// Both "Tại quầy" and "Online" orders expose id, type, customerName,
// customerPhone, payment, total, createdDate and products[] with name, variant,
// quantity, unitPrice and subtotal. The real detail route is
// /admin/don-hang/danh-sach-don-hang/:orderId.

export const CUSTOMER_RETURNS_STORAGE_KEY = 'ruventu_customer_returns';
export const CUSTOMER_RETURNS_SYNC_SLICE = 'customer-returns';

export const RETURN_STATUS = {
  WAITING: 'cho_tiep_nhan',
  RECEIVED: 'da_nhan_hang',
  REFUNDED: 'da_hoan_tien',
};

const asGuest = (order) => !order?.customerId || /khách vãng lai|khách lẻ/i.test(order?.customerName || '');

export function orderCustomerName(order) {
  return asGuest(order) ? '' : order?.customerName || order?.recipient?.name || '';
}

export function orderPhone(order) {
  return order?.customerPhone || order?.recipient?.phone || '';
}

export function orderLineRef(product, index) {
  return product.barcode || product.id || `${product.name || 'san-pham'}::${product.variant || 'mac-dinh'}::${index}`;
}

export function readCustomerReturns(orders = []) {
  return readSharedState(CUSTOMER_RETURNS_STORAGE_KEY, seedCustomerReturns(orders));
}

export function saveCustomerReturns(records, action = 'updated', entityId = null) {
  writeSharedState(CUSTOMER_RETURNS_STORAGE_KEY, records, {
    slice: CUSTOMER_RETURNS_SYNC_SLICE,
    action,
    entityId,
  });
}

export function createReturnId(records) {
  const largest = records.reduce((max, record) => {
    const match = String(record.id || '').match(/^TH(\d+)$/);
    return Math.max(max, Number(match?.[1] || 0));
  }, 300);
  return `TH${String(largest + 1).padStart(6, '0')}`;
}

export function returnedQuantity(records, orderId, lineItemRef) {
  return records
    .filter((record) => record.orderId === orderId)
    .flatMap((record) => record.lineItems || [])
    .filter((item) => item.lineItemRef === lineItemRef)
    .reduce((sum, item) => sum + Number(item.slTra || 0), 0);
}

export function returnTotals(record) {
  const items = record?.lineItems || [];
  return {
    quantity: items.reduce((sum, item) => sum + Number(item.slTra || 0), 0),
    amount: items.reduce((sum, item) => sum + Number(item.thanhTienHoan || 0), 0),
  };
}

function snapshotLine(order, product, index) {
  const quantity = Math.max(1, Number(product.quantity || 1));
  const unitPrice = Number(product.unitPrice ?? ((Number(product.subtotal || 0) / quantity) || 0));
  return {
    lineItemRef: orderLineRef(product, index),
    sanPham: product.name || 'Sản phẩm',
    phienBan: product.variant || 'Mặc định',
    slDaMua: quantity,
    slConDuocTra: quantity,
    slTra: quantity,
    donGiaHoan: unitPrice,
    thanhTienHoan: unitPrice * quantity,
  };
}

function seedCustomerReturns(orders) {
  const paidOrders = orders.filter((order) => order.payment === 'Đã thanh toán' && order.products?.length).slice(-4).reverse();
  const reasons = ['Không phù hợp nhu cầu', 'Giao nhầm phiên bản', 'Sản phẩm lỗi màn hình', 'Khách không dùng được sản phẩm'];
  const statuses = [RETURN_STATUS.WAITING, RETURN_STATUS.WAITING, RETURN_STATUS.RECEIVED, RETURN_STATUS.REFUNDED];
  return paidOrders.map((order, index) => {
    const lineItems = order.products.slice(0, 1).map((product, productIndex) => snapshotLine(order, product, productIndex));
    const status = statuses[index] || RETURN_STATUS.WAITING;
    const created = new Date(2026, 8, 15 - index, 9, 0, 0);
    const record = {
      id: `TH${String(304 - index).padStart(6, '0')}`,
      orderId: order.id,
      orderType: order.type,
      khachHang: orderCustomerName(order),
      soDienThoai: orderPhone(order),
      lyDoTra: reasons[index] || reasons[0],
      lineItems,
      hinhThucHoanTienDuKien: index === 2 ? 'Chuyển khoản' : 'Tiền mặt',
      ghiChu: '',
      trangThai: status,
      createdAt: created.toISOString(),
    };
    if (status !== RETURN_STATUS.WAITING) {
      record.receiveResult = lineItems.map((item) => ({ lineItemRef: item.lineItemRef, slNguyenVen: item.slTra, slLoi: 0 }));
    }
    if (status === RETURN_STATUS.REFUNDED) {
      record.refund = { phuongThuc: 'Tiền mặt', ngayHoanTien: '2026-09-15', xacNhanDuTien: true };
    }
    return record;
  });
}
