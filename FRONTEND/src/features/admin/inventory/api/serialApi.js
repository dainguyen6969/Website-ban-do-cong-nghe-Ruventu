import { adminRequest } from '../../catalog/products/api/versionApi.js';
export { nextWarehouseStatus, SERIAL_STATUS_META } from './serialStatus.js';

import { SERIAL_STATUS_META } from './serialStatus.js';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN').format(new Date(value))
  : '—';

const normalize = (item) => ({
  id: Number(item.id),
  versionId: Number(item.phien_ban_id),
  productCode: item.ma_san_pham || '',
  productName: item.ten_san_pham || '',
  version: item.ten_phien_ban || 'Mặc định',
  barcode: item.ma_vach || '',
  serial: item.so_serial || '',
  status: item.trang_thai,
  activatedAt: formatDate(item.ngay_kich_hoat),
  warrantyUntil: formatDate(item.han_bao_hanh),
  order: item.don_hang || null,
});

export async function getSerialPage(filters, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.serial?.trim()) params.set('so_serial', filters.serial.trim());
  if (filters.status) params.set('trang_thai', filters.status);
  if (filters.versionId) params.set('phien_ban_id', String(filters.versionId));
  const data = await adminRequest(`/api/v1/admin/serials?${params}`, { signal });
  return {
    items: (data?.items || []).map(normalize),
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getSerialCounts(signal) {
  const entries = await Promise.all(Object.keys(SERIAL_STATUS_META).map(async (status) => {
    const data = await adminRequest(`/api/v1/admin/serials?trang_thai=${status}&page=0&limit=1`, { signal });
    return [status, Number(data?.pagination?.total_elements || 0)];
  }));
  return Object.fromEntries(entries);
}

export async function getSerialDetail(id, signal) {
  return normalize(await adminRequest(`/api/v1/admin/serials/${encodeURIComponent(id)}`, { signal }));
}

export async function updateSerialStatus(id, status, reason) {
  return adminRequest(`/api/v1/admin/serials/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ trang_thai: status, ly_do: reason.trim() }),
  });
}
