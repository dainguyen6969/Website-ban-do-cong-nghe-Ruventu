import { adminRequest } from '../../catalog/products/api/versionApi.js';

const PATH = '/api/v1/admin/disbursement-types';

export const DISBURSEMENT_TYPE_STATUS = {
  active: 'HOẠT ĐỘNG',
  inactive: 'NGỪNG HOẠT ĐỘNG',
};

const statusFromApi = (value) => Number(value) === 1 ? DISBURSEMENT_TYPE_STATUS.active : DISBURSEMENT_TYPE_STATUS.inactive;

export function normalizeDisbursementType(item = {}) {
  return {
    id: item.id || item.ma_loai || '',
    code: item.ma_loai || '',
    name: item.ten_loai || '',
    type: item.loai_phieu || 'CHI',
    note: item.ghi_chu || '-',
    status: statusFromApi(item.trang_thai),
  };
}

export async function getDisbursementTypes(filters = {}, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });
  
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.status === DISBURSEMENT_TYPE_STATUS.active) params.set('trang_thai', '1');
  if (filters.status === DISBURSEMENT_TYPE_STATUS.inactive) params.set('trang_thai', '0');

  const data = await adminRequest(`${PATH}?${params}`, { signal });
  return {
    items: (data?.items || []).map(normalizeDisbursementType),
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getDisbursementTypeDetail(id, signal) {
  const data = await adminRequest(`${PATH}/${encodeURIComponent(id)}`, { signal });
  return normalizeDisbursementType(data);
}

export const createDisbursementType = async (form) => normalizeDisbursementType(
  await adminRequest(PATH, { 
    method: 'POST', 
    body: JSON.stringify({
      ma_loai: form.code.trim(),
      ten_loai: form.name.trim(),
      ghi_chu: form.note.trim() || null
    }) 
  })
);

export const updateDisbursementTypeStatus = async (id, isActive) => {
  const response = await adminRequest(`${PATH}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', 
    body: JSON.stringify({
      trang_thai: isActive ? 1 : 0
    })
  });
  return response;
};
