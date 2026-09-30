import { adminRequest } from '../../catalog/products/api/versionApi.js';

const PATH = '/api/v1/admin/suppliers';

export const SUPPLIER_STATUS = {
  active: 'dang_hop_tac',
  inactive: 'ngung_hop_tac',
};

const statusFromApi = (value) => Number(value) === 1 ? SUPPLIER_STATUS.active : SUPPLIER_STATUS.inactive;
const statusToApi = (value) => value === SUPPLIER_STATUS.active ? 1 : 0;
const date = (value) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '—';

export function normalizeSupplier(item = {}) {
  return {
    id: Number(item.id),
    code: item.ma_nha_cung_cap || '',
    tenNhaCungCap: item.ten_nha_cung_cap || '',
    soDienThoai: item.so_dien_thoai || '',
    email: item.email || '',
    diaChi: item.dia_chi || '',
    trangThai: statusFromApi(item.trang_thai),
  };
}

const normalizeHistory = (item = {}) => ({
  id: Number(item.id),
  code: item.ma_don_nhap || '',
  importStatus: item.trang_thai_nhap || '',
  paymentStatus: item.trang_thai_thanh_toan || '',
  total: Number(item.tong_tien || 0),
  createdAt: item.ngay_tao,
  createdAtLabel: date(item.ngay_tao),
});

export async function getSupplierPage(filters = {}, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.status === SUPPLIER_STATUS.active) params.set('trang_thai', '1');
  if (filters.status === SUPPLIER_STATUS.inactive) params.set('trang_thai', '0');

  const data = await adminRequest(`${PATH}?${params}`, { signal });
  return {
    items: (data?.items || []).map(normalizeSupplier),
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getSupplierDetail(id, page = 1, signal) {
  const params = new URLSearchParams({ page: String(Math.max(0, page - 1)), limit: '5' });
  const data = await adminRequest(`${PATH}/${encodeURIComponent(id)}?${params}`, { signal });
  return {
    ...normalizeSupplier(data),
    orders: (data?.lich_su_don_nhap || []).map(normalizeHistory),
    orderTotal: Number(data?.pagination?.total_elements || 0),
  };
}

const bodyOf = (form, includeCode) => ({
  ...(includeCode && form.code.trim() ? { ma_nha_cung_cap: form.code.trim() } : {}),
  ten_nha_cung_cap: form.tenNhaCungCap.trim(),
  so_dien_thoai: form.soDienThoai.replace(/\s/g, ''),
  email: form.email.trim() || null,
  dia_chi: form.diaChi.trim() || null,
  trang_thai: statusToApi(form.trangThai),
});

export const createSupplier = async (form) => normalizeSupplier(
  await adminRequest(PATH, { method: 'POST', body: JSON.stringify(bodyOf(form, true)) }),
);

export const updateSupplier = async (id, form) => normalizeSupplier(
  await adminRequest(`${PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(bodyOf(form, false)),
  }),
);
