import { readSharedState, writeSharedState } from '../sync/adminSync.js';
import { PROTOTYPE_RETURNS } from './customerReturnsPrototype.js';

// Customer returns module - UC-027 TH001-TH005 integration
export const CUSTOMER_RETURNS_STORAGE_KEY = 'ruventu_customer_returns';
export const CUSTOMER_RETURNS_SYNC_SLICE = 'customer-returns';

export const RETURN_STATUS = {
  WAITING: 'CHO_TIEP_NHAN',
  RECEIVED: 'DA_NHAN_HANG',
  REFUNDED: 'DA_HOAN_TIEN',
  OLD_REFUNDED: 'DA_HOAN_TIEN_CU',
};

const asGuest = (order) =>
  !order?.customerId || /khách vãng lai|khách lẻ/i.test(order?.customerName || '');

export function orderCustomerName(order) {
  return asGuest(order) ? '' : order?.customerName || order?.recipient?.name || '';
}

export function orderPhone(order) {
  return order?.customerPhone || order?.recipient?.phone || '';
}

export function orderLineRef(product, index) {
  return (
    product.barcode ||
    product.id ||
    `${product.name || 'san-pham'}::${product.variant || 'mac-dinh'}::${index}`
  );
}

export function readCustomerReturns(orders = []) {
  const records = readSharedState(CUSTOMER_RETURNS_STORAGE_KEY, null);
  if (!records || !Array.isArray(records) || records.length === 0) {
    saveCustomerReturns(PROTOTYPE_RETURNS, 'init');
    return PROTOTYPE_RETURNS;
  }
  return records.map((record) => ({ ...record, trangThai: record.trangThai?.toUpperCase() }));
}

export function saveCustomerReturns(records, action = 'updated', entityId = null) {
  writeSharedState(CUSTOMER_RETURNS_STORAGE_KEY, records, {
    slice: CUSTOMER_RETURNS_SYNC_SLICE,
    action,
    entityId,
  });
}

export function createReturnId(records = []) {
  const largest = (records || []).reduce((max, record) => {
    const match = String(record.id || '').match(/^TH(\d+)$/);
    return Math.max(max, Number(match?.[1] || 0));
  }, 304);
  return `TH${String(largest + 1).padStart(6, '0')}`;
}

export function returnedQuantity(records, orderId, lineItemRef) {
  return (records || [])
    .filter((record) => record.orderId === orderId)
    .flatMap((record) => record.lineItems || [])
    .filter((item) => item.lineItemRef === lineItemRef)
    .reduce((sum, item) => sum + Number(item.slTra || 0), 0);
}

export function returnTotals(record) {
  const items = record?.lineItems || [];
  const lineAmount = items.reduce((sum, item) => sum + Number(item.thanhTienHoan || 0), 0);
  return {
    quantity: items.reduce((sum, item) => sum + Number(item.slTra || 0), 0),
    amount: record?.tongTienHoan != null ? Number(record.tongTienHoan) : lineAmount,
  };
}

export function matchesReturnStatus(record, status) {
  if (!status || status === 'Tất cả trạng thái') return true;
  const statusUpper = status.toUpperCase();
  if (statusUpper === 'CHO_TIEP_NHAN' || status === 'Chờ tiếp nhận') {
    return record.trangThai === 'CHO_TIEP_NHAN';
  }
  if (statusUpper === 'DA_NHAN_HANG' || status === 'Đã nhận hàng') {
    return record.trangThai === 'DA_NHAN_HANG';
  }
  if (statusUpper === 'DA_HOAN_TIEN' || status === 'Đã hoàn tiền') {
    return record.trangThai === 'DA_HOAN_TIEN' || record.trangThai === 'DA_HOAN_TIEN_CU';
  }
  if (statusUpper === 'DA_HOAN_TIEN_CU' || status === 'Đã hoàn tiền - Nhận cũ') {
    return record.trangThai === 'DA_HOAN_TIEN_CU';
  }
  return record.trangThai === statusUpper;
}
