import { adminRequest, getAllVersions, getWarehouses } from '../../catalog/products/api/versionApi.js';

const PATH = '/api/v1/admin/purchase-orders';

export const IMPORT_STATUS = {
  DAT_HANG: 'Đặt hàng', DA_DUYET: 'Đã duyệt', NHAP_MOT_PHAN: 'Nhập một phần',
  DA_NHAP_KHO: 'Đã nhập kho', HOAN_TRA_MOT_PHAN: 'Hoàn trả một phần',
  HOAN_TRA_TOAN_BO: 'Hoàn trả toàn bộ', HUY: 'Đã hủy',
};
export const PAYMENT_STATUS = { CHUA_TRA: 'Chưa trả', TRA_MOT_PHAN: 'Trả một phần', DA_TRA: 'Đã trả' };

export const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '—';
const number = (value) => Number(value || 0);
const supplier = (item = {}) => ({
  id: number(item.id), code: item.ma_nha_cung_cap || '', name: item.ten_nha_cung_cap || '',
  phone: item.so_dien_thoai || '', email: item.email || '', address: item.dia_chi || '',
});
const warehouse = (item = {}) => ({ id: number(item.id), code: item.ma_kho || '', name: item.ten_kho || '' });

export function normalizePurchaseOrder(item) {
  return {
    id: number(item.id), code: item.ma_don_nhap || '', supplier: supplier(item.nha_cung_cap),
    warehouse: warehouse(item.kho_hang), importStatus: item.trang_thai_nhap,
    importStatusLabel: IMPORT_STATUS[item.trang_thai_nhap] || item.trang_thai_nhap,
    paymentStatus: item.trang_thai_thanh_toan,
    paymentStatusLabel: PAYMENT_STATUS[item.trang_thai_thanh_toan] || item.trang_thai_thanh_toan,
    applyTax: Boolean(item.ap_dung_thue), taxRate: number(item.thue_vat), goodsTotal: number(item.tien_hang),
    taxTotal: number(item.tien_thue), total: number(item.tong_tien), paid: number(item.so_tien_da_thanh_toan),
    debt: number(item.so_tien_con_no), createdAt: item.ngay_tao, createdAtLabel: formatDate(item.ngay_tao),
    items: (item.items || []).map((line) => ({
      id: number(line.id), versionId: number(line.phien_ban_id), name: line.ten_phien_ban || '',
      qty: number(line.so_luong), unitPrice: number(line.gia_nhap), lineTotal: number(line.thanh_tien),
      received: number(line.so_luong_da_nhap_kho), returned: number(line.so_luong_da_tra),
      serialManaged: line.quan_ly_serial, serialModeEstablished: Boolean(line.che_do_serial_da_xac_lap),
    })),
  };
}

export async function getPurchaseOrderPage(filters, signal) {
  const params = new URLSearchParams({ page: String(Math.max(0, Number(filters.page || 1) - 1)), limit: '10' });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.supplierId) params.set('nha_cung_cap_id', filters.supplierId);
  if (filters.importStatus) params.set('trang_thai_nhap', filters.importStatus);
  if (filters.paymentStatus) params.set('trang_thai_thanh_toan', filters.paymentStatus);
  const data = await adminRequest(`${PATH}?${params}`, { signal });
  return {
    items: (data?.items || []).map(normalizePurchaseOrder),
    totalItems: number(data?.pagination?.total_elements), totalPages: number(data?.pagination?.total_pages),
  };
}

export const getPurchaseOrder = async (id, signal) => normalizePurchaseOrder(
  await adminRequest(`${PATH}/${encodeURIComponent(id)}`, { signal }),
);
export const createPurchaseOrder = (body) => adminRequest(PATH, { method: 'POST', body: JSON.stringify(body) });
export const updatePurchaseOrder = (id, body) => adminRequest(`${PATH}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const approvePurchaseOrder = (id) => adminRequest(`${PATH}/${id}/approve`, { method: 'POST' });
export const cancelPurchaseOrder = (id) => adminRequest(`${PATH}/${id}/cancel`, { method: 'POST' });
export const payPurchaseOrder = (id, key, body) => adminRequest(`${PATH}/${id}/payments`, {
  method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body),
});
export const receivePurchaseOrder = (id, body) => adminRequest(`${PATH}/${id}/receive`, { method: 'POST', body: JSON.stringify(body) });
export const returnPurchaseOrder = (id, body) => adminRequest(`${PATH}/${id}/returns`, { method: 'POST', body: JSON.stringify(body) });

async function allPages(path, params, signal) {
  const items = [];
  for (let page = 0, pages = 1; page < pages; page += 1) {
    const query = new URLSearchParams({ ...params, page: String(page), limit: '100' });
    const data = await adminRequest(`${path}?${query}`, { signal });
    items.push(...(data?.items || []));
    pages = number(data?.pagination?.total_pages);
  }
  return items;
}

export async function getSupplierOptions(signal) {
  return (await allPages('/api/v1/admin/suppliers', { trang_thai: '1' }, signal)).map(supplier);
}
export const getSupplierDetail = async (id, signal) => supplier(
  await adminRequest(`/api/v1/admin/suppliers/${encodeURIComponent(id)}?page=0&limit=1`, { signal }),
);
export async function getPurchaseOptions(signal) {
  const [warehouses, versionData] = await Promise.all([getWarehouses(signal), getAllVersions(null, signal, false)]);
  return {
    warehouses,
    versions: versionData.versions.map((item) => ({ id: item.id, name: item.displayName, sku: item.sku })),
  };
}

export const saveBody = ({ supplierId, warehouseId, applyTax, items }) => ({
  nha_cung_cap_id: number(supplierId), kho_hang_id: number(warehouseId), ap_dung_thue: Boolean(applyTax),
  items: items.map((item) => ({ phien_ban_id: number(item.versionId), so_luong: number(item.qty), gia_nhap: number(item.unitPrice) })),
});

export function generateSerialValues(items, modes, prefix) {
  let next = 1;
  return Object.fromEntries(items.filter((item) => modes[item.id] === 'true').map((item) => [
    item.id,
    Array.from({ length: item.qty }, () => `${prefix.trim()}${next++}`).join('\n'),
  ]));
}
