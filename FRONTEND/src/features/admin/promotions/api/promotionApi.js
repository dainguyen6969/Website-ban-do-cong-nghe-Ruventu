import { apiRequest } from '../../../../auth/backendAuth.js';
import { paginateDisplayStatus } from '../promotionModel.js';

const PATH = '/api/v1/admin/promotions';
const query = values => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null));

export async function getPromotions({ keyword, method, status, page, limit = 10 }, signal) {
    const params = { keyword: keyword.trim(), phuong_thuc_khuyen_mai: method === 'ALL' ? '' : method };
    if (status === 'ALL' || status === 'TAM_DUNG') {
        return apiRequest(`${PATH}?${query({ ...params, trang_thai: status === 'TAM_DUNG' ? 0 : '', page, limit })}`, { signal });
    }
    // shortcut: BE chỉ lọc cờ 0/1; đọc đủ trang để lọc trạng thái hiển thị, bỏ khi BE hỗ trợ bộ lọc này.
    const items = [];
    for (let index = 0, pages = 1; index < pages; index += 1) {
        const data = await apiRequest(`${PATH}?${query({ ...params, trang_thai: 1, page: index, limit: 100 })}`, { signal });
        items.push(...data.items);
        pages = data.pagination.total_pages;
    }
    return paginateDisplayStatus(items, status, page, limit);
}

export async function getPromotionVariants(keyword, signal) {
    const items = [];
    for (let page = 0, pages = 1; page < pages; page += 1) {
        const data = await apiRequest(`${PATH}/variants?${query({ keyword: keyword.trim(), page, limit: 100 })}`, { signal });
        items.push(...data.items);
        pages = data.pagination.total_pages;
    }
    return items;
}

export const getPromotion = (id, signal) => apiRequest(`${PATH}/${encodeURIComponent(id)}`, { signal });
export const getPromotionProductId = async variantId => (await apiRequest(`/api/v1/admin/inventory/items/${encodeURIComponent(variantId)}?loai_doi_tuong=PHIEN_BAN`)).phien_ban.san_pham_id;
export const createPromotion = body => apiRequest(PATH, { method: 'POST', body: JSON.stringify(body) });
export const updatePromotion = (id, body) => apiRequest(`${PATH}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
export const setPromotionStatus = (id, status) => apiRequest(`${PATH}/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ trang_thai: status }) });
export const deletePromotion = id => apiRequest(`${PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });
