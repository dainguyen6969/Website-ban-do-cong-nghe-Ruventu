import { getAllBrands } from '../../brands/api/brandApi';
import { getAllCategories } from '../../categories/api/categoryApi';
import { getProductDetail, getProductPage } from '../../products/api/productApi';

const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
const COMBO_PATH = '/api/v1/admin/combos';
const ACCESS_TOKEN_KEY = 'ruventu_backend_access_token';
const TAGS_KEY = '__combo_tags';

let inMemoryToken = '';
let loginPromise = null;

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
  catch { throw new Error('Backend trả về dữ liệu không hợp lệ.'); }
}

async function login() {
  const username = import.meta.env.VITE_RUVENTU_ADMIN_USERNAME;
  const password = import.meta.env.VITE_RUVENTU_ADMIN_PASSWORD;
  if (!username || !password) throw new Error('Chưa có phiên đăng nhập backend.');
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tai_khoan: username, mat_khau: password, ghi_nho_dang_nhap: false }),
  });
  const payload = await parseResponse(response);
  const token = payload?.data?.access_token;
  if (!response.ok || !token) throw new Error(payload?.message || 'Không thể đăng nhập backend.');
  storeToken(token);
  return token;
}

async function request(path, options = {}, retry = true) {
  const token = readToken() || await (loginPromise ||= login().finally(() => { loginPromise = null; }));
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401 && retry) {
    storeToken('');
    return request(path, options, false);
  }
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.message || `Yêu cầu thất bại (${response.status}).`);
  return payload?.data;
}

const statusText = (value) => Number(value) === 1 ? 'Đang kinh doanh' : 'Ngưng kinh doanh';

function normalizeComponent(item) {
  const qty = Number(item.so_luong || 1);
  const stock = Number(item.ton_co_the_ban || 0);
  return {
    id: Number(item.phien_ban_id),
    variantId: Number(item.phien_ban_id),
    name: item.ten_san_pham || '',
    variant: item.ten_phien_ban || 'Mặc định',
    productCode: item.ma_san_pham || '',
    sku: item.ma_vach || item.ma_san_pham || '',
    price: Number(item.gia_ban_le || 0),
    cost: Number(item.gia_nhap || 0),
    stock,
    qty,
    capacity: Math.floor(stock / qty),
  };
}

function normalizeDetail(item) {
  const rawSpecs = item.thong_so_ky_thuat && typeof item.thong_so_ky_thuat === 'object'
    ? item.thong_so_ky_thuat
    : {};
  const tags = Array.isArray(rawSpecs[TAGS_KEY]) ? rawSpecs[TAGS_KEY] : [];
  const specs = Object.entries(rawSpecs)
    .filter(([name]) => name !== TAGS_KEY)
    .map(([name, value], index) => ({ id: index + 1, name, value: String(value ?? '') }));
  const images = (item.anh_san_pham || []).map((entry) => ({
    id: entry.id,
    url: entry.duong_dan_anh,
    primary: Boolean(entry.la_anh_chinh),
    order: Number(entry.thu_tu_hien_thi || 0),
  }));
  return {
    id: Number(item.id),
    code: item.ma_san_pham || '',
    name: item.ten_san_pham || '',
    categoryId: item.danh_muc_id == null ? null : Number(item.danh_muc_id),
    brandId: item.thuong_hieu_id == null ? null : Number(item.thuong_hieu_id),
    description: item.mo_ta || '',
    specs,
    tags,
    vat: Number(item.thue_vat || 0),
    price: Number(item.gia_ban_le || 0),
    cost: Number(item.gia_nhap || 0),
    weight: Number(item.khoi_luong || 0),
    sellable: Number(item.ton_co_the_ban || 0),
    stock: Number(item.ton_thuc_te || 0),
    status: statusText(item.trang_thai),
    images: images.map((image) => image.url),
    imageItems: images,
    image: images.find((image) => image.primary)?.url || images[0]?.url || '',
    configurationLocked: Boolean(item.cau_hinh_bi_khoa),
    variant: {
      id: Number(item.phien_ban_id),
      name: item.ten_phien_ban || 'Mặc định',
      sku: item.ma_vach || '',
      retail: Number(item.gia_ban_le || 0),
      cost: Number(item.gia_nhap || 0),
      weight: Number(item.khoi_luong || 0),
      active: Number(item.trang_thai_phien_ban ?? item.trang_thai) === 1,
    },
    components: (item.thanh_phan || []).map(normalizeComponent),
  };
}

async function enrichComponentImages(components, signal) {
  return Promise.all(components.map(async (component) => {
    try {
      const page = await getProductPage({ page: 1, limit: 10, keyword: component.productCode }, signal);
      const product = page.items.find((item) => item.maSanPham === component.productCode);
      return { ...component, image: product?.hinhAnh || '' };
    } catch {
      return component;
    }
  }));
}

export async function getComboPage(filters, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
  });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
    params.set('trang_thai', String(filters.status));
  }
  const data = await request(`${COMBO_PATH}?${params}`, { signal });
  const items = await Promise.all((data?.items || []).map(async (item) => {
    let image = '';
    try { image = normalizeDetail(await request(`${COMBO_PATH}/${item.id}`, { signal })).image; }
    catch { /* A missing thumbnail must not hide a valid list row. */ }
    return {
      id: Number(item.id), code: item.ma_san_pham || '', name: item.ten_san_pham || '', image,
      sellable: Number(item.ton_co_the_ban || 0), stock: Number(item.ton_thuc_te || 0),
      price: Number(item.gia_ban || 0), status: statusText(item.trang_thai),
      components: (item.thanh_phan || []).map(normalizeComponent),
    };
  }));
  return {
    items,
    page: Number(data?.pagination?.page || 0) + 1,
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getComboStats(signal) {
  const [all, active, inactive] = await Promise.all([
    request(`${COMBO_PATH}?page=0&limit=1`, { signal }),
    request(`${COMBO_PATH}?trang_thai=1&page=0&limit=1`, { signal }),
    request(`${COMBO_PATH}?trang_thai=0&page=0&limit=1`, { signal }),
  ]);
  return {
    total: Number(all?.pagination?.total_elements || 0),
    active: Number(active?.pagination?.total_elements || 0),
    inactive: Number(inactive?.pagination?.total_elements || 0),
  };
}

export async function getComboDetail(id, signal) {
  const combo = normalizeDetail(await request(`${COMBO_PATH}/${encodeURIComponent(id)}`, { signal }));
  const [categories, brands, components] = await Promise.all([
    getAllCategories(),
    getAllBrands(),
    enrichComponentImages(combo.components, signal),
  ]);
  return {
    ...combo,
    category: categories.find((item) => item.id === combo.categoryId)?.name || '—',
    brand: brands.find((item) => item.id === combo.brandId)?.name || '—',
    components,
  };
}

export async function getComboFormOptions(keyword = '') {
  const params = new URLSearchParams({ keyword: keyword.trim(), page: '0', limit: '20' });
  const [data, categories, brands] = await Promise.all([
    request(`${COMBO_PATH}/component-options?${params}`),
    getAllCategories(),
    getAllBrands(),
  ]);
  const products = await Promise.all((data?.items || []).map(async (item) => {
    let image = '';
    try { image = (await getProductDetail(item.san_pham_id)).hinhAnh; } catch { /* optional image */ }
    return {
      id: Number(item.phien_ban_id),
      productId: Number(item.san_pham_id),
      hinhAnh: image,
      tenSanPham: item.ten_san_pham || '',
      maSanPham: item.ma_san_pham || '',
      coTheBan: Number(item.ton_co_the_ban || 0),
      trangThaiBan: 'Đang kinh doanh',
      variants: [{
        id: Number(item.phien_ban_id),
        name: item.ten_phien_ban || 'Mặc định',
        sku: item.ma_vach || item.ma_san_pham || '',
        giaBanLe: Number(item.gia_ban_le || 0),
      }],
    };
  }));
  return { products, categories, brands };
}

function mutationBody(combo) {
  const specifications = Object.fromEntries(combo.specs.map((item) => [item.name, item.value]));
  if (combo.tags.length) specifications[TAGS_KEY] = combo.tags;
  return {
    danh_muc_id: Number(combo.categoryId),
    thuong_hieu_id: combo.brandId ? Number(combo.brandId) : null,
    ten_san_pham: combo.name.trim(),
    ma_san_pham: combo.code.trim(),
    mo_ta: combo.description,
    thong_so_ky_thuat: specifications,
    khoi_luong: Number(combo.weight),
    gia_ban_le: Number(combo.retail) * 1000,
    gia_nhap: Number(combo.cost) * 1000,
    thue_vat: combo.vat ? Number(combo.vatRate) : 0,
    trang_thai: combo.active ? 1 : 0,
    anh_san_pham: combo.images.map((image, index) => ({
      duong_dan_anh: image.url,
      la_anh_chinh: index === 0,
      thu_tu_hien_thi: index,
    })),
    thanh_phan: combo.components.map((item) => ({
      phien_ban_thanh_phan_id: Number(item.variantId || item.id),
      so_luong: Number(item.qty),
    })),
  };
}

export const createCombo = (combo) => request(COMBO_PATH, { method: 'POST', body: JSON.stringify(mutationBody(combo)) });
export const updateCombo = (id, combo) => request(`${COMBO_PATH}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(mutationBody(combo)) });
export const deactivateCombo = (id) => request(`${COMBO_PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });
