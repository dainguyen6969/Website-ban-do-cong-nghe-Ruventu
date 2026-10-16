import { adminRequest } from '../../catalog/products/api/versionApi.js';

const SALES_PATH = '/api/v1/admin/sales';

const number = (value) => Number(value || 0);

export const normalizeSalesProduct = (item = {}) => ({
  id: number(item.phien_ban_id),
  productId: number(item.san_pham_id),
  name: item.ten_san_pham || '',
  variant: item.ten_phien_ban || 'Mặc định',
  code: item.ma_san_pham || '',
  barcode: item.ma_vach || '',
  image: item.anh_dai_dien || '',
  type: item.loai_san_pham || 'DON',
  unitPrice: number(item.don_gia),
  vatRate: number(item.thue_vat),
  serialManaged: Boolean(item.quan_ly_serial),
  stock: Math.max(0, number(item.ton_co_the_ban)),
});

export const getSalesOptions = (signal) => adminRequest(`${SALES_PATH}/options`, { signal });

export const normalizeSalesCustomer = (item = {}) => ({
  id: number(item.id), name: item.ho_ten || '', phone: item.so_dien_thoai || '',
  email: item.email?.endsWith('@ruventu.local') ? '' : item.email || '',
});

export async function createSalesCustomer(customer) {
  const data = await adminRequest(`${SALES_PATH}/customers`, {
    method: 'POST',
    body: JSON.stringify({ ho_ten: customer.name.trim(), so_dien_thoai: customer.phone.trim() }),
  });
  return normalizeSalesCustomer(data);
}

export async function searchSalesCustomers(keyword, signal) {
  const query = new URLSearchParams({ keyword: keyword.trim(), page: '0', limit: '8' });
  const data = await adminRequest(`${SALES_PATH}/customers?${query}`, { signal });
  return (data?.items || []).map(normalizeSalesCustomer);
}

export async function searchSalesProducts(keyword, options, signal) {
  const query = new URLSearchParams({
    keyword: keyword.trim(), kho_hang_id: String(options.kho_mac_dinh_id),
    bang_gia: options.bang_gia[0], page: '0', limit: '8',
  });
  const data = await adminRequest(`${SALES_PATH}/products?${query}`, { signal });
  return (data?.items || []).map(normalizeSalesProduct);
}

const lines = (items) => items.map((item) => ({
  ma_dong: `d${item.id}`, phien_ban_id: item.id, so_luong: item.quantity,
}));

export function buildPreviewBody(form) {

  if (form.frozenFinancial) {
    return {
      loai_don_hang: 'ONLINE',
      ...JSON.parse(JSON.stringify(form.frozenFinancial)),
    };
  }

  return {
    loai_don_hang: 'ONLINE', khach_hang_id: form.customerId || null,
    kho_hang_id: form.options.kho_mac_dinh_id, bang_gia: form.options.bang_gia[0],
    thue: { ap_dung: form.applyVat, che_do_gia: form.vatMode },
    ma_chuong_trinh: form.promotion?.trim() || null, phi_giao_hang: form.shippingFee,
    san_pham: lines(form.items),
  };
}

export const previewOnlineOrder = (body, signal) => adminRequest(`${SALES_PATH}/preview`, {
  method: 'POST', body: JSON.stringify(body), signal,
});

const posBody = (order, options) => ({
  khach_hang_id: order.customer?.id || null,
  kho_hang_id: options.kho_mac_dinh_id, bang_gia: options.bang_gia[0],
  thue: { ap_dung: order.tax, che_do_gia: order.taxMode || 'CHUA_BAO_GOM' },
  ma_chuong_trinh: order.promotion?.trim() || null, phi_giao_hang: 0, ghi_chu: order.note || null,
  san_pham: lines(order.cart.map((item) => ({ ...item.product, quantity: item.quantity }))),
});

export const buildPosPreviewBody = (order, options) => ({ ...posBody(order, options), loai_don_hang: 'TAI_QUAY' });
export const previewPosOrder = (order, options, signal) => previewOnlineOrder(buildPosPreviewBody(order, options), signal);

export function buildPosCheckoutBody(order, options, confirmedTotal, paymentDate = new Date().toISOString()) {
  const cash = order.paymentMethod === 'cash';
  return {
    ...posBody(order, options), nhan_vien_id: order.employee?.id || null,
    phan_bo_serial: [...order.cart.filter((line) => line.serials?.length).map((line) => ({
      ma_dong: `d${line.product.id}`, phien_ban_id: line.product.id,
      serial_ids: line.serials.map((serial) => serial.id),
    })), ...(order.preview?.data.san_pham || []).filter(line => line.la_qua_tang).flatMap(line =>
      line.serial_requirements.filter(requirement => order.giftSerials?.[`${line.ma_dong}:${requirement.phien_ban_id}`]?.length).map(requirement => ({
        ma_dong: line.ma_dong, phien_ban_id: requirement.phien_ban_id,
        serial_ids: order.giftSerials[`${line.ma_dong}:${requirement.phien_ban_id}`].map(serial => serial.id),
      }))),
    ],
    tong_thanh_toan_xac_nhan: confirmedTotal,
    thanh_toan: {
      phuong_thuc: { cash: 'TIEN_MAT', transfer: 'CHUYEN_KHOAN', card: 'THE' }[order.paymentMethod],
      ...(cash ? { tien_khach_dua: order.paid } : { so_tien_da_nhan: order.paid }),
      ngay_thanh_toan: paymentDate, ma_giao_dich: cash ? null : order.transactionCode?.trim() || null,
      xac_nhan_da_nhan_tien: Boolean(order.paymentReceived),
    },
  };
}

export const checkoutPosOrder = (body, idempotencyKey) => adminRequest('/api/v1/admin/pos/checkout', {
  method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body),
});

const orderBody = (form) => {
  const { loai_don_hang: _type, ...body } = buildPreviewBody(form);
  return body;
};

export function buildOnlineOrderBody(form, confirmedTotal) {
  return {
    ...orderBody(form),
    tong_thanh_toan_xac_nhan: confirmedTotal,

    thong_tin_nguoi_nhan: {
      ten_nguoi_nhan: form.recipient.name.trim(),
      sdt_nguoi_nhan: form.recipient.phone.replace(/[\s.-]/g, ''),
      dia_chi_giao_hang:
        form.delivery === 'GIAO_HANG'
          ? form.recipient.address.trim()
          : null,
    },

    phuong_thuc_thanh_toan: form.payment,
    hinh_thuc_nhan_hang: form.delivery,
    ghi_chu: form.note.trim() || null,
  };
}

export function saveOnlineOrder(id, body, key) {
  if (!key) {
    throw new Error('Thiếu Idempotency-Key của yêu cầu lưu đơn.');
  }

  const editing = id != null;

  return adminRequest(
    editing
      ? `/api/v1/admin/orders/${encodeURIComponent(id)}`
      : '/api/v1/admin/orders',
    {
      method: editing ? 'PUT' : 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    },
  );
}

export const createOnlineOrder = (form, total, key) =>
  saveOnlineOrder(null, buildOnlineOrderBody(form, total), key);

export const updateOnlineOrder = (id, form, total, key) =>
  saveOnlineOrder(id, buildOnlineOrderBody(form, total), key);
