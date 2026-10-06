import { adminRequest, getWarehouses } from '../../catalog/products/api/versionApi.js';
import {
  formatDateTimeVN,
} from '../../../../shared/services/mutationUtils';

const PATH = '/api/v1/admin/orders';

const query = (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value != null) params.set(key, String(value));
  });
  return params;
};

export const getOrders = (filters, signal) => adminRequest(`${PATH}?${query(filters)}`, { signal });
export const getOrder = (id, signal) => adminRequest(`${PATH}/${encodeURIComponent(id)}`, { signal });
export const getOrderHistory = (id, signal) => adminRequest(`${PATH}/${encodeURIComponent(id)}/history`, { signal });
export const approveOrder = (id) => action(id, 'approve', { xac_nhan: true });
export const startFulfillment = (id, body) => action(id, 'fulfillment', { xac_nhan: true, ...body });
export const setPackingStatus = (id, status) => action(id, 'packing-status', { trang_thai_dong_goi: status }, 'PATCH');
export const getSerialRequirements = (id) => adminRequest(`${PATH}/${encodeURIComponent(id)}/warehouse/serial-requirements`);
export const getExportVariant = (id) => adminRequest(`/api/v1/admin/inventory/items/${encodeURIComponent(id)}?loai_doi_tuong=PHIEN_BAN`);
export const getSerialCandidates = (id, values, signal) => adminRequest(`${PATH}/${encodeURIComponent(id)}/warehouse/serial-candidates?${query(values)}`, { signal });
export const exportOrder = (id, body) => action(id, 'warehouse/export', body);
export const confirmOrderPayment = (id, key, body) =>
  adminRequest(
    `${PATH}/${encodeURIComponent(id)}/payment/confirm`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    },
  );export const cancelOrder = (id, reason) => action(id, 'cancel', { ly_do: reason });
export const confirmPickup = (id) => action(id, 'pickup/confirm', { xac_nhan_da_nhan_hang: true });
export const refundOrder = (id, key, body) =>
  adminRequest(
    `${PATH}/${encodeURIComponent(id)}/refund`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    },
  );export const setDeliveryStatus = (id, status, confirmedCod) => adminRequest(`/api/v1/admin/deliveries/${encodeURIComponent(id)}/status`, {
  method: 'PATCH', body: JSON.stringify({ trang_thai_giao_hang: status, ...(confirmedCod === undefined ? {} : { xac_nhan_da_thu_cod: confirmedCod }) }),
});

export const searchDeliveryPartners = (keyword, signal) => adminRequest(`/api/v1/admin/shipping-partners?${query({ keyword, trang_thai: 1, page: 0, limit: 100 })}`, { signal });

const action = (id, suffix, body, method = 'POST') => adminRequest(`${PATH}/${encodeURIComponent(id)}/${suffix}`, {
  method, body: JSON.stringify(body),
});

export async function getOrderOptions(signal) {
  const [warehouses, partners, sales] = await Promise.all([
    getWarehouses(signal),
    adminRequest('/api/v1/admin/shipping-partners?trang_thai=1&page=0&limit=100', { signal }),
    adminRequest('/api/v1/admin/sales/options', { signal }),
  ]);
  return { warehouses: warehouses.filter((warehouse) => warehouse.id === Number(sales.kho_mac_dinh_id)), partners: partners?.items || [] };
}

export const labels = {
  ONLINE: 'Online', TAI_QUAY: 'Tại quầy', CHO_DUYET: 'Chờ duyệt', CHO_THANH_TOAN: 'Chờ thanh toán',
  CHO_DONG_GOI: 'Chờ đóng gói', CHO_LAY_HANG: 'Chờ lấy hàng', DANG_GIAO_HANG: 'Đang giao hàng',
  HOAN_THANH: 'Hoàn thành', HUY_HANG: 'Đã hủy', CHUA_THANH_TOAN: 'Chưa thanh toán', DA_THANH_TOAN: 'Đã thanh toán',
  CHUA_DONG_GOI: 'Chưa đóng gói', DANG_DONG_GOI: 'Đang đóng gói', DA_DONG_GOI: 'Đã đóng gói',
  HUY_DONG_GOI: 'Hủy đóng gói', CHUA_XUAT_KHO: 'Chưa xuất kho', DA_XUAT_KHO: 'Đã xuất kho', DA_HOAN_KHO: 'Đã hoàn kho',
  CHO_GIAO: 'Chờ giao', DA_NHAN_HANG: 'Đã nhận hàng', DANG_GIAO: 'Đang giao',
  GIAO_THANH_CONG: 'Giao thành công', GIAO_THAT_BAI: 'Giao thất bại', CHO_HOAN_HANG: 'Chờ hoàn hàng',
  DA_HOAN_HANG: 'Đã hoàn hàng', HUY_GIAO_HANG: 'Hủy giao hàng',
  NHAN_TAI_CUA_HANG: 'Nhận tại cửa hàng', GIAO_HANG: 'Giao hàng', TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', THE: 'Thẻ',
};

export const label = (value) => labels[value] || value || '—';
export const money = (value) => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`;
export const dateTime = formatDateTimeVN;