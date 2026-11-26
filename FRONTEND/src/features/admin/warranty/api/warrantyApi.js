import { apiRequest } from '../../../../auth/backendAuth';
import { listParams, money } from '../data/warrantyContract.js';

const PATH = '/api/v1/admin/warranties';
const query = (params) =>
  new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null));

export const getWarranties = (params, signal) => apiRequest(`${PATH}?${query(params)}`, { signal });
export const lookupWarranties = (params, signal) =>
  apiRequest(`${PATH}/lookup?${query(params)}`, { signal });
export const getWarranty = (id, page = 0, signal, limit = 5) =>
  apiRequest(`${PATH}/${encodeURIComponent(id)}?history_page=${page}&history_limit=${limit}`, { signal });

export const getWarrantyHistoryDetail = (id, historyId, signal) =>
  apiRequest(`${PATH}/${encodeURIComponent(id)}/history/${encodeURIComponent(historyId)}`, {
    signal,
  });

export async function getWarrantyHistory(id, signal) {
  const items = [];
  for (let page = 0; ; page += 1) {
    const detail = await apiRequest(
      `${PATH}/${encodeURIComponent(id)}?history_page=${page}&history_limit=100`,
      { signal }
    );
    items.push(...(detail.lich_su?.items || []));
    if (page + 1 >= (detail.lich_su?.pagination?.total_pages || 1)) return items;
  }
}

export function getWarrantyList(filters, page, limit, signal) {
  return getWarranties(listParams(filters, page - 1, limit), signal);
}

export function mutateWarranty(id, endpoint, body, key, method = 'POST') {
  return apiRequest(
    `${PATH}${id == null ? '' : `/${encodeURIComponent(id)}`}${endpoint ? `/${endpoint}` : ''}`,
    {
      method,
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': key },
    }
  );
}

export const warrantyError = (error) =>
  [
    error.message,
    ...(error.data?.errors || []).map(
      (item) => `${item.field ? `${item.field}: ` : ''}${item.message || item.code}`
    ),
    error.data?.data?.con_phai_thu != null &&
      `Khách còn phải trả ${money(error.data.data.con_phai_thu)}. Thu đủ tiền hoặc chọn duyệt công nợ hợp lệ trước khi bàn giao.`,
  ]
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .join('\n');
