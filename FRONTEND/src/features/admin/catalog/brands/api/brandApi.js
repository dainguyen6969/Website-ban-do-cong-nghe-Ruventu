// IntelliJ/Spring adapter for admin brands; the unused VSCode backend is never addressed here.
const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
const BRAND_PATH = '/api/v1/admin/brands';
const ACCESS_TOKEN_KEY = 'ruventu_backend_access_token';

let inMemoryToken = '';
let loginPromise = null;

export class BrandApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'BrandApiError';
    this.status = status;
    this.data = data;
  }
}

function readToken() {
  if (inMemoryToken) return inMemoryToken;
  inMemoryToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    || localStorage.getItem('access_token')
    || localStorage.getItem('accessToken')
    || '';
  return inMemoryToken;
}

function storeToken(token) {
  inMemoryToken = token;
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { throw new BrandApiError('Backend trả về dữ liệu không hợp lệ.', response.status); }
}

async function login() {
  const username = import.meta.env.VITE_RUVENTU_ADMIN_USERNAME;
  const password = import.meta.env.VITE_RUVENTU_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new BrandApiError('Chưa có phiên đăng nhập backend.', 401);
  }
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tai_khoan: username, mat_khau: password, ghi_nho_dang_nhap: false }),
  });
  const payload = await parseResponse(response);
  const token = payload?.data?.access_token;
  if (!response.ok || !token) throw new BrandApiError(payload?.message || 'Không thể đăng nhập backend.', response.status, payload);
  storeToken(token);
  return token;
}

async function getToken(force = false) {
  if (!force && readToken()) return readToken();
  if (!loginPromise) loginPromise = login().finally(() => { loginPromise = null; });
  return loginPromise;
}

async function request(path, options = {}, retry = true) {
  const token = await getToken();
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(!isForm && options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401 && retry) {
    storeToken('');
    await getToken(true);
    return request(path, options, false);
  }
  const payload = await parseResponse(response);
  if (!response.ok) throw new BrandApiError(payload?.message || `Yêu cầu thất bại (${response.status}).`, response.status, payload);
  return payload?.data;
}

const normalizeStatus = (value) => Number(value) === 1 ? 'active' : 'inactive';

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

const mutationBody = (brand) => JSON.stringify({
  ten_thuong_hieu: brand.name.trim(),
  logo: brand.logo || null,
  trang_thai: brand.status === 'active' ? 1 : 0,
});

export async function getAllBrands() {
  const first = await request(`${BRAND_PATH}?page=0&limit=100`);
  const raw = [...(first?.items || [])];
  const totalPages = Number(first?.pagination?.total_pages || 1);
  if (totalPages > 1) {
    const pages = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => request(`${BRAND_PATH}?page=${index + 1}&limit=100`)));
    pages.forEach((page) => raw.push(...(page?.items || [])));
  }
  return raw.map(normalizeBrand);
}

export async function getBrandDetail(id) {
  const item = await request(`${BRAND_PATH}/${id}`);
  return { ...normalizeBrand(item), products: (item?.san_pham || []).map(normalizeProduct) };
}

export const createBrand = (brand) => request(BRAND_PATH, { method: 'POST', body: mutationBody(brand) });
export const updateBrand = (id, brand) => request(`${BRAND_PATH}/${id}`, { method: 'PUT', body: mutationBody(brand) });
export const deactivateBrand = (id) => request(`${BRAND_PATH}/${id}`, { method: 'DELETE' });
export const reactivateBrand = (brand) => updateBrand(brand.id, { ...brand, status: 'active' });
