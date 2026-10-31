import { apiRequest } from '../../../../auth/backendAuth';
import { listParams, money, quickFilters } from '../data/warrantyContract.js';

const PATH = '/api/v1/admin/warranties';
const query = params => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null));

export const getWarranties = (params, signal) => apiRequest(`${PATH}?${query(params)}`, { signal });
export const lookupWarranties = (params, signal) => apiRequest(`${PATH}/lookup?${query(params)}`, { signal });
export const getWarranty = (id, page = 0, signal) => apiRequest(`${PATH}/${encodeURIComponent(id)}?history_page=${page}&history_limit=20`, { signal });

export async function getWarrantyHistory(id, signal) {
  const items = [];
  for (let page = 0; ; page += 1) {
    const detail = await apiRequest(`${PATH}/${encodeURIComponent(id)}?history_page=${page}&history_limit=100`, { signal });
    items.push(...(detail.lich_su?.items || []));
    if (page + 1 >= (detail.lich_su?.pagination?.total_pages || 1)) return items;
  }
}

export async function getWarrantyList(filters, page, limit, signal) {
  const statuses = quickFilters[filters.quick] || [];
  if (statuses.length < 2) return getWarranties(listParams(filters, page - 1, limit, filters.status || statuses[0]), signal);
  // shortcut: API chỉ lọc một trạng thái; ghép các trang đầu của từng trạng thái cho nhóm Đang xử lý, bỏ khi BE hỗ trợ OR.
  const batches = await Promise.all(statuses.map(async status => {
    const items = [];
    let total = 0;
    for (let index = 0; items.length < page * limit; index += 1) {
      const data = await getWarranties(listParams(filters, index, 100, status), signal);
      total = data.pagination.total_elements;
      items.push(...data.items);
      if (index + 1 >= data.pagination.total_pages) break;
    }
    return { items, total };
  }));
  const items = batches.flatMap(batch => batch.items).sort((a, b) => Date.parse(b.ngay_tiep_nhan) - Date.parse(a.ngay_tiep_nhan) || b.id - a.id);
  return { items: items.slice((page - 1) * limit, page * limit), pagination: { total_elements: batches.reduce((sum, batch) => sum + batch.total, 0) } };
}

export function mutateWarranty(id, endpoint, body, key, method = 'POST') {
  return apiRequest(`${PATH}${id == null ? '' : `/${encodeURIComponent(id)}`}${endpoint ? `/${endpoint}` : ''}`, {
    method, body: JSON.stringify(body), headers: { 'Idempotency-Key': key },
  });
}

export const warrantyError = error => [error.message, ...(error.data?.errors || []).map(item => `${item.field ? `${item.field}: ` : ''}${item.message || item.code}`), error.data?.data?.con_phai_thu != null && `Khách còn phải trả ${money(error.data.data.con_phai_thu)}. Thu đủ tiền hoặc chọn duyệt công nợ hợp lệ trước khi bàn giao.`].filter((value, index, all) => value && all.indexOf(value) === index).join('\n');
