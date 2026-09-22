const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
const CATEGORY_PATH = '/api/v1/admin/categories';
const ACCESS_TOKEN_KEY = 'ruventu_backend_access_token';

let inMemoryToken = '';
let loginPromise = null;

export class CategoryApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'CategoryApiError';
    this.status = status;
    this.data = data;
  }
}

function readStoredToken() {
  if (inMemoryToken) return inMemoryToken;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    || localStorage.getItem('access_token')
    || localStorage.getItem('accessToken')
    || '';
  inMemoryToken = token;
  return token;
}

function storeToken(token) {
  inMemoryToken = token;
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new CategoryApiError('Backend trả về dữ liệu không hợp lệ.', response.status);
  }
}

async function loginForCategoryModule() {
  const username = import.meta.env.VITE_RUVENTU_ADMIN_USERNAME;
  const password = import.meta.env.VITE_RUVENTU_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new CategoryApiError(
      'Chưa có phiên đăng nhập backend. Hãy cấu hình VITE_RUVENTU_ADMIN_USERNAME và VITE_RUVENTU_ADMIN_PASSWORD.',
      401,
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      tai_khoan: username,
      mat_khau: password,
      ghi_nho_dang_nhap: false,
    }),
  });
  const payload = await parseResponse(response);
  const token = payload?.data?.access_token;
  if (!response.ok || !token) {
    throw new CategoryApiError(payload?.message || 'Không thể đăng nhập backend.', response.status, payload);
  }
  storeToken(token);
  return token;
}

async function getAccessToken(forceLogin = false) {
  if (!forceLogin) {
    const stored = readStoredToken();
    if (stored) return stored;
  }
  if (!loginPromise) loginPromise = loginForCategoryModule().finally(() => { loginPromise = null; });
  return loginPromise;
}

async function apiRequest(path, options = {}, retryAuth = true) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 && retryAuth) {
    storeToken('');
    await getAccessToken(true);
    return apiRequest(path, options, false);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new CategoryApiError(payload?.message || `Yêu cầu thất bại (${response.status}).`, response.status, payload);
  }
  return payload?.data;
}

function normalizeStatus(value) {
  return Number(value) === 1 ? 'active' : 'inactive';
}

function normalizeCategory(item) {
  return {
    id: Number(item.id),
    name: item.ten_danh_muc || '',
    parentId: item.danh_muc_cha_id == null ? null : Number(item.danh_muc_cha_id),
    parentName: item.ten_danh_muc_cha || '',
    image: item.anh_dai_dien || '',
    imageMode: 'url',
    slug: item.duong_dan_url || '',
    productCount: Number(item.so_luong_san_pham || 0),
    status: normalizeStatus(item.trang_thai),
  };
}

function normalizeProduct(item) {
  return {
    id: Number(item.id),
    maSanPham: item.ma_san_pham || '',
    tenSanPham: item.ten_san_pham || '',
    giaBan: item.gia_ban == null ? null : Number(item.gia_ban),
    tonCoTheBan: Number(item.ton_co_the_ban || 0),
    trangThai: normalizeStatus(item.trang_thai),
  };
}

function toMutationBody(category) {
  return {
    ten_danh_muc: category.name.trim(),
    danh_muc_cha_id: category.parentId == null ? null : Number(category.parentId),
    trang_thai: category.status === 'active' ? 1 : 0,
    anh_dai_dien: category.image || null,
  };
}

export async function getAllCategories() {
  const first = await apiRequest(`${CATEGORY_PATH}?page=0&limit=100`);
  const items = [...(first?.items || [])];
  const totalPages = Number(first?.pagination?.total_pages || 1);
  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => (
        apiRequest(`${CATEGORY_PATH}?page=${index + 1}&limit=100`)
      )),
    );
    remaining.forEach((page) => items.push(...(page?.items || [])));
  }
  return items.map(normalizeCategory);
}

export async function getCategoryDetail(id) {
  const item = await apiRequest(`${CATEGORY_PATH}/${id}`);
  return {
    ...normalizeCategory(item),
    products: (item?.san_pham || []).map(normalizeProduct),
  };
}

export function createCategory(category) {
  return apiRequest(CATEGORY_PATH, {
    method: 'POST',
    body: JSON.stringify(toMutationBody(category)),
  });
}

export function updateCategory(id, category) {
  return apiRequest(`${CATEGORY_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toMutationBody(category)),
  });
}

export function deactivateCategory(id) {
  return apiRequest(`${CATEGORY_PATH}/${id}`, { method: 'DELETE' });
}

export function reactivateCategory(category) {
  return updateCategory(category.id, { ...category, status: 'active' });
}
