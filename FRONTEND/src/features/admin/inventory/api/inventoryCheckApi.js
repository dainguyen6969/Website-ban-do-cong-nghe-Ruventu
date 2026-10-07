import { adminRequest } from '../../catalog/products/api/versionApi.js';

export async function getInventoryCheckPage(filters, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.status) params.set('trang_thai', filters.status);
  if (filters.checkerId) params.set('nguoi_kiem_id', filters.checkerId);
  if (filters.fromDate) params.set('from_date', filters.fromDate);
  if (filters.toDate) params.set('to_date', filters.toDate);

  const data = await adminRequest(`/api/v1/admin/inventory-checks?${params}`, { signal });
  return {
    items: data?.items || [],
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getInventoryCheckDetail(id, signal) {
  return adminRequest(`/api/v1/admin/inventory-checks/${encodeURIComponent(id)}`, { signal });
}

export async function createInventoryCheck(payload) {
  return adminRequest(`/api/v1/admin/inventory-checks`, {
    method: 'POST',
    body: JSON.stringify({
      phien_ban_id: payload.versionId,
      ton_thuc_te: payload.actualStock,
      ly_do: payload.reason,
    }),
  });
}

export async function updateInventoryCheck(id, payload) {
  return adminRequest(`/api/v1/admin/inventory-checks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      ton_thuc_te: payload.actualStock,
      ly_do: payload.reason,
    }),
  });
}

export async function cancelInventoryCheck(id, reason) {
  return adminRequest(`/api/v1/admin/inventory-checks/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ ly_do: reason }),
  });
}

export async function balanceInventoryCheck(id) {
  return adminRequest(`/api/v1/admin/inventory-checks/${encodeURIComponent(id)}/balance`, {
    method: 'POST',
  });
}

export async function searchInventoryCheckProducts(keyword, page = 1, limit = 20, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, page - 1)),
    limit: String(limit),
  });
  if (keyword?.trim()) params.set('keyword', keyword.trim());
  
  const data = await adminRequest(`/api/v1/admin/inventory-checks/products?${params}`, { signal });
  return {
    items: data?.items || [],
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}
