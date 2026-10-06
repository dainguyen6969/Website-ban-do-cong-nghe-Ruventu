import { adminRequest, getWarehouses } from '../../catalog/products/api/versionApi.js';

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
export const startFulfillment = (id) => action(id, 'fulfillment', { xac_nhan: true });
export const startOrderDelivery = (id, partnerId, fee) => action(id, 'delivery/start', { xac_nhan: true, doi_tac_van_chuyen_id: partnerId, phi_tra_doi_tac: fee });
export const setPackingStatus = (id, status) => action(id, 'packing-status', { trang_thai_dong_goi: status }, 'PATCH');
export const getSerialRequirements = (id) => adminRequest(`${PATH}/${encodeURIComponent(id)}/warehouse/serial-requirements`);
export const getExportVariant = (id) => adminRequest(`/api/v1/admin/inventory/items/${encodeURIComponent(id)}?loai_doi_tuong=PHIEN_BAN`);
export const getSerialCandidates = (id, values, signal) => adminRequest(`${PATH}/${encodeURIComponent(id)}/warehouse/serial-candidates?${query(values)}`, { signal });
export const exportOrder = (id, body) => action(id, 'warehouse/export', body);
export const confirmOrderPayment = (id, body, key) => action(id, 'payment/confirm', { ...body, xac_nhan_da_nhan_tien: true }, 'POST', key);
export const cancelOrder = (id, reason) => action(id, 'cancel', { ly_do: reason });
export const confirmPickup = (id) => action(id, 'pickup/confirm', { xac_nhan_da_nhan_hang: true });
export const refundOrder = (id, body, key) => action(id, 'refund', { ...body, xac_nhan_da_hoan_tien: true }, 'POST', key);
export const setDeliveryStatus = (id, status, confirmedCod) => adminRequest(`/api/v1/admin/deliveries/${encodeURIComponent(id)}/status`, {
  method: 'PATCH', body: JSON.stringify({ trang_thai_giao_hang: status, ...(confirmedCod === undefined ? {} : { xac_nhan_da_thu_cod: confirmedCod }) }),
});

export const searchDeliveryPartners = (keyword, signal) => adminRequest(`/api/v1/admin/shipping-partners?${query({ keyword, trang_thai: 1, page: 0, limit: 100 })}`, { signal });

const action = (id, suffix, body, method = 'POST', key) => adminRequest(`${PATH}/${encodeURIComponent(id)}/${suffix}`, {
  method, body: JSON.stringify(body), ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
});

export const canEditOnlineOrder = (order) => order?.loai_don_hang === 'ONLINE'
  && order.trang_thai_don_hang === 'CHO_DUYET'
  && order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN'
  && order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO'
  && order.trang_thai_dong_goi === 'CHUA_DONG_GOI';

export function paymentSource(order) {
  if (order?.loai_don_hang !== 'ONLINE' || !(Number(order.tong_thanh_toan) > 0)) return null;
  const active = (order.phieu_giao_hang || []).filter((item) => !['HUY_GIAO_HANG', 'DA_HOAN_HANG'].includes(item.trang_thai_giao_hang));
  if (order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN'
      && ['CHO_THANH_TOAN', 'CHO_DONG_GOI', 'CHO_LAY_HANG'].includes(order.trang_thai_don_hang)
      && order.trang_thai_xuat_kho !== 'DA_HOAN_KHO'
      && active.every((item) => item.trang_thai_giao_hang === 'CHO_GIAO')) return { nguon_thu: 'KHACH_HANG' };
  if (order.trang_thai_don_hang === 'HOAN_THANH' && order.trang_thai_thanh_toan === 'DA_THANH_TOAN'
      && order.trang_thai_xuat_kho === 'DA_XUAT_KHO'
      && !order.da_ghi_nhan_thu_cod
      && active.length === 1 && active[0].trang_thai_giao_hang === 'GIAO_THANH_CONG'
      && Number(active[0].tien_thu_ho_cod) === Number(order.tong_thanh_toan)) {
    return { nguon_thu: 'DOI_TAC_GIAO_HANG', phieu_giao_hang_id: active[0].id };
  }
  return null;
}

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
export const dateTime = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
