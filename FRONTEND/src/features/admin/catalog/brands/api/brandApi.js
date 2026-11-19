import { apiRequest as request } from '../../../../../auth/backendAuth';
import { basicStatusLabel, requireBasicStatus } from '../../../../../shared/services/mutationUtils';

const BRAND_PATH = '/api/v1/admin/brands';

export class BrandApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'BrandApiError';
    this.status = status;
    this.data = data;
  }
}

function normalizeStatus(value) {
  return basicStatusLabel(value, 'active', 'inactive');
}

function normalizeBrand(item) {
  return {
    id: Number(item.id),
    name: item.ten_thuong_hieu || '',
    slug: item.duong_dan_url || '',
    logo: item.logo || '',
    productCount: Number(item.so_luong_san_pham || 0),
    status: normalizeStatus(item.trang_thai),
  };
}

function normalizeProduct(item) {
  return {
    id: Number(item.id),
    code: item.ma_san_pham || '',
    name: item.ten_san_pham || '',
    category: item.ten_danh_muc || '—',
    price: item.gia_ban == null ? null : Number(item.gia_ban),
    stock: Number(item.ton_co_the_ban || 0),
    status: normalizeStatus(item.trang_thai),
  };
}

const mutationBody = (brand) =>
  JSON.stringify({
    ten_thuong_hieu: brand.name.trim(),
    logo: brand.logo || null,
    trang_thai: brand.status === 'active' ? 1 : 0,
  });

export async function getAllBrands() {
  const first = await request(`${BRAND_PATH}?page=0&limit=100`);
  const raw = [...(first?.items || [])];
  const totalPages = Number(first?.pagination?.total_pages || 1);
  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        request(`${BRAND_PATH}?page=${index + 1}&limit=100`)
      )
    );
    pages.forEach((page) => raw.push(...(page?.items || [])));
  }
  return raw.map(normalizeBrand);
}

export async function getBrandDetail(id) {
  const item = await request(`${BRAND_PATH}/${id}`);
  return { ...normalizeBrand(item), products: (item?.san_pham || []).map(normalizeProduct) };
}

export const createBrand = (brand) =>
  request(BRAND_PATH, { method: 'POST', body: mutationBody(brand) });
export const updateBrand = (id, brand) =>
  request(`${BRAND_PATH}/${id}`, { method: 'PUT', body: mutationBody(brand) });
export const deactivateBrand = (id) => request(`${BRAND_PATH}/${id}`, { method: 'DELETE' });
export const reactivateBrand = (brand) => updateBrand(brand.id, { ...brand, status: 'active' });
