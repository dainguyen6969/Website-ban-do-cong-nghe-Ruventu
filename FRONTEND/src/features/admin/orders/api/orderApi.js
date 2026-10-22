import { adminRequest, getWarehouses } from '../../catalog/products/api/versionApi.js';

import { formatDateTimeVN, requireBasicStatus } from '../../../../shared/services/mutationUtils';

const PATH = '/api/v1/admin/orders';

const query = (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value != null) params.set(key, String(value));
  });
  return params;
};

export async function getOrders(filters, signal) {
  const { cho_lau_phut: rawMinutes, ...params } = filters;
  const minutes = Number(rawMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0)
    return adminRequest(`${PATH}?${query(params)}`, { signal });
  // ponytail: đọc hết các trang để lọc chờ lâu đúng; chuyển sang BE khi có bộ lọc phút.
  const items = [];
  const cutoff = Date.now() - minutes * 60000;
  for (let page = 0, pages = 1; page < pages; page += 1) {
    const data = await adminRequest(`${PATH}?${query({ ...params, page, limit: 100 })}`, {
      signal,
    });
    pages = Number(data.pagination.total_pages);
    items.push(
      ...data.items.filter(
        (item) =>
          ['CHO_DUYET', 'CHO_HANG', 'CHO_THANH_TOAN', 'CHO_DONG_GOI', 'CHO_LAY_HANG'].includes(
            item.trang_thai_don_hang
          ) && Date.parse(item.ngay_tao) <= cutoff
      )
    );
  }
  const start = Number(params.page || 0) * Number(params.limit || 20);
  return {
    items: items.slice(start, start + Number(params.limit || 20)),
    pagination: {
      page: Number(params.page || 0),
      limit: Number(params.limit || 20),
      total_elements: items.length,
      total_pages: Math.ceil(items.length / Number(params.limit || 20)),
    },
  };
}

export const getOrder = (id, signal) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}`, { signal });
export const getOrderHistory = (id, signal) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/history`, { signal });
export const approveOrder = (id) => action(id, 'approve', { xac_nhan: true });
export const counterExchangeOrder = (id, key, body) =>
  action(id, 'counter-exchange', body, 'POST', key);
export const completeCounterInspection = (id, key, body) =>
  action(id, 'counter-inspection/complete', body, 'POST', key);
export const retryOrderStock = (id) => action(id, 'stock/retry', { xac_nhan: true });
export const reserveWaitingOrderStock = (id, key, body) =>
  action(id, 'stock/reserve', body, 'POST', key);
export const startFulfillment = (id, key, body) => action(id, 'fulfillment', body, 'POST', key);
export const startOrderDelivery = (id, partnerId, fee, tracking = '') =>
  action(id, 'delivery/start', {
    xac_nhan: true,
    doi_tac_van_chuyen_id: partnerId,
    phi_tra_doi_tac: fee,
    ma_van_don: tracking.trim(),
  });

export const setPackingStatus = (id, status) =>
  action(id, 'packing-status', { trang_thai_dong_goi: status }, 'PATCH');

export const getSerialRequirements = (id) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/warehouse/serial-requirements`);

export const getPackingSerials = (id) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/packing/serials`);

export const savePackingSerials = (id, key, body) =>
  action(id, 'packing/serials', body, 'POST', key);

export const getExportVariant = (id) =>
  adminRequest(`/api/v1/admin/inventory/items/${encodeURIComponent(id)}?loai_doi_tuong=PHIEN_BAN`);

export const getSerialCandidates = (id, values, signal) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/warehouse/serial-candidates?${query(values)}`, {
    signal,
  });

export const exportOrder = (id, key, body) => action(id, 'warehouse/export', body, 'POST', key);

export const confirmOrderPayment = (id, key, body) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/payment/confirm`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
  });

export const cancelOrder = (id, key, body) => action(id, 'cancel', body, 'POST', key);

export const cancelBeforeHandover = (id, key, body) =>
  action(id, 'cancel-before-handover', body, 'POST', key);

export const confirmPickup = (id, key, body) => action(id, 'pickup/confirm', body, 'POST', key);

export const refundOrder = (id, key, body) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/refund`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
  });

export const getOrderRefundOptions = (id, signal) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/refund-options`, { signal });

export const refundOrderReturn = (returnId, key, body) =>
  adminRequest(`/api/v1/admin/returns/${encodeURIComponent(returnId)}/refund`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
  });

export const setDeliveryStatus = (id, key, body) =>
  adminRequest(`/api/v1/admin/deliveries/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: {
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
  });

export const searchDeliveryPartners = (keyword, signal) =>
  adminRequest(
    `/api/v1/admin/shipping-partners?${query({ keyword, trang_thai: 1, page: 0, limit: 100 })}`,
    { signal }
  );

const action = (id, suffix, body, method = 'POST', key) =>
  adminRequest(`${PATH}/${encodeURIComponent(id)}/${suffix}`, {
    method,
    body: JSON.stringify(body),
    ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
  });

export const canEditOnlineOrder = (order) =>
  order?.loai_don_hang === 'ONLINE' &&
  order.trang_thai_don_hang === 'CHO_DUYET' &&
  order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN' &&
  order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' &&
  order.trang_thai_dong_goi === 'CHUA_DONG_GOI';

export function isWaitingCodSettlement(order, delivery = null) {
  if (
    order?.loai_don_hang !== 'ONLINE' ||
    !['DANG_GIAO_HANG', 'HOAN_THANH'].includes(order.trang_thai_don_hang) ||
    !['CHUA_THANH_TOAN', 'THANH_TOAN_MOT_PHAN'].includes(order.trang_thai_thanh_toan) ||
    order.trang_thai_dong_goi !== 'DA_DONG_GOI' ||
    order.trang_thai_xuat_kho !== 'DA_XUAT_KHO' ||
    order.hinh_thuc_nhan_hang === 'NHAN_TAI_CUA_HANG' ||
    order.da_ghi_nhan_thu_cod === true
  ) {
    return false;
  }

  let currentDelivery = delivery;

  if (!currentDelivery && Array.isArray(order.phieu_giao_hang)) {
    const activeDeliveries = order.phieu_giao_hang.filter(
      (item) => !['HUY_GIAO_HANG', 'DA_HOAN_HANG'].includes(item.trang_thai_giao_hang)
    );

    if (activeDeliveries.length !== 1) {
      return false;
    }

    currentDelivery = activeDeliveries[0];
  }

  const deliveryStatus = currentDelivery?.trang_thai_giao_hang ?? order.trang_thai_giao_hang;

  // API danh sách đơn trả trạng thái giao ở cấp ngoài,
  // API chi tiết trả danh sách phiếu giao hàng.
  const codAmount = Number(
    currentDelivery ? currentDelivery.tien_thu_ho_cod : order.tong_thanh_toan
  );

  return deliveryStatus === 'GIAO_THANH_CONG' && Number.isFinite(codAmount) && codAmount > 0;
}

export function orderDisplayStatus(order, delivery = null) {
  return isWaitingCodSettlement(order, delivery) ? 'CHO_DOI_SOAT_COD' : order?.trang_thai_don_hang;
}

export function paymentSource(order) {
  const total = Number(order?.tong_thanh_toan);

  if (order?.loai_don_hang !== 'ONLINE' || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  const balance = order.doi_soat_thanh_toan;
  const verified = balance?.co_du_can_cu === true;

  const remaining = verified
    ? Number(balance.gioi_han_thu)
    : order.trang_thai_thanh_toan === 'CHUA_THANH_TOAN'
      ? total
      : NaN;

  const active = (order.phieu_giao_hang || []).filter(
    (item) => !['HUY_GIAO_HANG', 'DA_HOAN_HANG'].includes(item.trang_thai_giao_hang)
  );

  const preliminaryOrder = ['CHO_DUYET', 'CHO_HANG', 'HUY_HANG'].includes(
    order.trang_thai_don_hang
  );

  const canReceiveFromCustomer =
    Number.isFinite(remaining) &&
    remaining > 0 &&
    ['CHUA_THANH_TOAN', 'THANH_TOAN_MOT_PHAN'].includes(order.trang_thai_thanh_toan) &&
    [
      'CHO_DUYET',
      'CHO_HANG',
      'CHO_THANH_TOAN',
      'CHO_DONG_GOI',
      'CHO_LAY_HANG',
      'HUY_HANG',
    ].includes(order.trang_thai_don_hang) &&
    (order.trang_thai_xuat_kho !== 'DA_HOAN_KHO' ||
      (order.trang_thai_don_hang === 'HUY_HANG' && order.da_nhan_lai_truoc_ban_giao === true)) &&
    active.every((item) => item.trang_thai_giao_hang === 'CHO_GIAO') &&
    (!preliminaryOrder ||
      (active.length === 0 &&
        (order.trang_thai_xuat_kho === 'CHUA_XUAT_KHO' ||
          (order.trang_thai_don_hang === 'HUY_HANG' &&
            order.trang_thai_xuat_kho === 'DA_HOAN_KHO' &&
            order.da_nhan_lai_truoc_ban_giao === true))));

  if (canReceiveFromCustomer) {
    return {
      nguon_thu: 'KHACH_HANG',
      so_tien_con_phai_thu: remaining,
    };
  }

  const delivery = active.length === 1 ? active[0] : null;

  const pendingCod =
    ['CHUA_THANH_TOAN', 'THANH_TOAN_MOT_PHAN'].includes(order.trang_thai_thanh_toan) &&
    ['DANG_GIAO_HANG', 'HOAN_THANH'].includes(order.trang_thai_don_hang);

  const legacyCod =
    order.trang_thai_thanh_toan === 'DA_THANH_TOAN' && order.trang_thai_don_hang === 'HOAN_THANH';

  const cod = Number(delivery?.tien_thu_ho_cod);

  const canReceiveCod =
    (pendingCod || legacyCod) &&
    order.da_ghi_nhan_thu_cod === false &&
    order.hinh_thuc_nhan_hang === 'GIAO_HANG' &&
    order.trang_thai_dong_goi === 'DA_DONG_GOI' &&
    order.trang_thai_xuat_kho === 'DA_XUAT_KHO' &&
    delivery?.trang_thai_giao_hang === 'GIAO_THANH_CONG' &&
    Number(delivery?.doi_tac_van_chuyen_id) > 0 &&
    Number.isFinite(cod) &&
    cod > 0 &&
    cod <= total;

  if (canReceiveCod) {
    return {
      nguon_thu: 'DOI_TAC_GIAO_HANG',
      phieu_giao_hang_id: delivery.id,
      so_tien_con_phai_thu: cod,
    };
  }

  return null;
}

export async function getOrderOptions(signal) {
  const [warehouses, partners, sales] = await Promise.all([
    getWarehouses(signal),

    adminRequest('/api/v1/admin/shipping-partners?trang_thai=1&page=0&limit=100', { signal }),

    adminRequest('/api/v1/admin/sales/options', { signal }),
  ]);

  const defaultWarehouseId = Number(sales.kho_mac_dinh_id);

  return {
    warehouses: warehouses.filter((warehouse) => Number(warehouse.id) === defaultWarehouseId),

    partners: (partners?.items || []).filter(
      (partner) => requireBasicStatus(partner.trang_thai) === 1
    ),
  };
}

export const labels = {
  ONLINE: 'Online',
  TAI_QUAY: 'Tại quầy',
  CHO_DUYET: 'Chờ duyệt',
  CHO_HANG: 'Chờ hàng',
  CHO_THANH_TOAN: 'Chờ thanh toán',
  CHO_DONG_GOI: 'Chờ đóng gói',
  CHO_LAY_HANG: 'Chờ lấy hàng',
  DANG_GIAO_HANG: 'Đang giao hàng',
  CHO_DOI_SOAT_COD: 'Đã giao · chờ nộp COD',
  HOAN_THANH: 'Hoàn thành',
  HUY_HANG: 'Đã hủy',
  CHUA_THANH_TOAN: 'Chưa thanh toán',
  DA_THANH_TOAN: 'Đã thanh toán',
  CHUA_DONG_GOI: 'Chưa đóng gói',
  DANG_DONG_GOI: 'Đang đóng gói',
  DA_DONG_GOI: 'Đã đóng gói',
  HUY_DONG_GOI: 'Hủy đóng gói',
  CHUA_XUAT_KHO: 'Chưa xuất kho',
  DA_XUAT_KHO: 'Đã xuất kho',
  DA_HOAN_KHO: 'Đã hoàn kho',
  CHO_GIAO: 'Chờ giao',
  DA_NHAN_HANG: 'Đã nhận hàng',
  DANG_GIAO: 'Đang giao',
  GIAO_THANH_CONG: 'Giao thành công',
  GIAO_THAT_BAI: 'Giao thất bại',
  CHO_HOAN_HANG: 'Chờ hoàn hàng',
  DA_HOAN_HANG: 'Đã hoàn hàng',
  HUY_GIAO_HANG: 'Hủy giao hàng',
  NHAN_TAI_CUA_HANG: 'Nhận tại cửa hàng',
  GIAO_HANG: 'Giao hàng',
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản',
  THE: 'Thẻ',
  THANH_TOAN_MOT_PHAN: 'Đã thanh toán một phần',
};

export const label = (value) => labels[value] || value || '—';
export const money = (value) => (value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`);
export const dateTime = formatDateTimeVN;
