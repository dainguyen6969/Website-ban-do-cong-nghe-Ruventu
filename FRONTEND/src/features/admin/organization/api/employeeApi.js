import { adminRequest } from '../../catalog/products/api/versionApi';

export async function getEmployeePage(filters, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 20),
  });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.trangThai !== undefined && filters.trangThai !== null)
    params.set('trang_thai', filters.trangThai);
  if (filters.vaiTroId) params.set('vai_tro_id', filters.vaiTroId);

  const data = await adminRequest(`/api/v1/admin/employees?${params}`, { signal });
  return {
    items: data?.items || [],
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getEmployeeDetail(id) {
  return await adminRequest(`/api/v1/admin/employees/${encodeURIComponent(id)}`);
}

export function getEmployeeActivityPage(id, { kind, voucherRole, page, limit }, signal) {
  const params = new URLSearchParams({
    page: String(page - 1),
    limit: String(limit),
  });

  if (kind === 'THU' || kind === 'CHI') {
    if (voucherRole === 'BEN_NOP_NHAN') {
      params.set('nhom_nguoi_nop_nhan', 'NHAN_VIEN');
      params.set('nguoi_nop_nhan_id', String(id));
    } else {
      params.set('nguoi_tao_id', String(id));
    }

    const resource = kind === 'THU' ? 'receipts' : 'disbursements';
    return adminRequest(`/api/v1/admin/${resource}?${params}`, { signal });
  }

  params.set('lien_ket', kind);
  return adminRequest(`/api/v1/admin/employees/${encodeURIComponent(id)}/orders?${params}`, {
    signal,
  });
}

export async function createEmployee(payload) {
  return await adminRequest('/api/v1/admin/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(id, payload) {
  return await adminRequest(`/api/v1/admin/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployee(id) {
  return await adminRequest(`/api/v1/admin/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
