// IntelliJ/Spring adapter scoped to the admin product-list screen.
const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
const PRODUCT_PATH = '/api/v1/admin/products';
const COMBO_PATH = '/api/v1/admin/combos';
const ACCESS_TOKEN_KEY = 'ruventu_backend_access_token';

let inMemoryToken = '';
let loginPromise = null;

/** API adapter for the real IntelliJ/Spring product-list endpoint only. */
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

function normalizeProduct(item) {
  const stock = Number(item.ton_co_the_ban || 0);
  const isCombo = item.loai_san_pham === 'BO_PC';
  return {
    id: Number(item.id),
    maSanPham: item.ma_san_pham || '',
    tenSanPham: item.ten_san_pham || '',
    phanLoai: isCombo ? 'Theo bộ (Combo)' : 'Sản phẩm đơn',
    isCombo,
    thuongHieu: item.ten_thuong_hieu || '—',
    danhMuc: item.ten_danh_muc || '',
    soPhienBan: isCombo ? null : Number(item.so_phien_ban || 0) || null,
    soThanhPhan: null,
    tonKho: stock,
    trangThaiBan: Number(item.trang_thai) === 1 ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    canhBao: stock > 0 && stock <= 10 ? 'Sắp hết' : null,
    hinhAnh: item.anh_chinh || '',
  };
}

function normalizeProductDetail(item) {
  const variants = (item.danh_sach_phien_ban || []).map((variant) => ({
    id: Number(variant.id),
    name: variant.ten_phien_ban || 'Mặc định',
    sku: variant.ma_vach || '',
    giaBanLe: Number(variant.gia_ban_le || 0),
    tonKho: Number(variant.ton_co_the_ban || 0),
  }));
  const images = (item.anh_san_pham || []).map((image) => ({
    id: image.id,
    url: image.duong_dan_anh,
    primary: Boolean(image.la_anh_chinh),
    order: Number(image.thu_tu_hien_thi || 0),
  }));
  const specs = Object.entries(item.thong_so_ky_thuat || {}).map(([name, value], index) => ({
    id: index + 1,
    name,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }));
  const stock = variants.reduce((sum, variant) => sum + variant.tonKho, 0);
  return {
    id: Number(item.id),
    maSanPham: item.ma_san_pham || '',
    tenSanPham: item.ten_san_pham || '',
    danhMucId: item.danh_muc?.id ?? null,
    danhMuc: item.danh_muc?.ten_danh_muc || '',
    thuongHieuId: item.thuong_hieu?.id ?? null,
    thuongHieu: item.thuong_hieu?.ten_thuong_hieu || '',
    phanLoai: item.loai_san_pham === 'BO_PC' ? 'Theo bộ (Combo)' : 'Sản phẩm đơn',
    moTa: item.mo_ta || '',
    specs,
    vat: `${Number(item.thue_vat ?? 10)}%`,
    trangThaiBan: Number(item.trang_thai) === 1 ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    images,
    hinhAnh: images.find((image) => image.primary)?.url || images[0]?.url || '',
    variants,
    giaBanLe: variants[0]?.giaBanLe || 0,
    tonKho: stock,
    coTheBan: stock,
    donViTinh: '—',
  };
}

export async function getProductPage(filters, signal) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(filters.page || 1) - 1)),
    limit: String(filters.limit || 10),
    sort: 'id,desc',
  });
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.categoryId) params.set('danh_muc_id', String(filters.categoryId));
  if (filters.brandId) params.set('thuong_hieu_id', String(filters.brandId));
  if (filters.productType) params.set('loai_san_pham', filters.productType);
  if (filters.status !== undefined && filters.status !== null) params.set('trang_thai', String(filters.status));
  const data = await request(`${PRODUCT_PATH}?${params}`, { signal });
  const items = await Promise.all((data?.items || []).map(async (item) => {
    const product = normalizeProduct(item);
    if (!product.isCombo) return product;
    const combo = await request(`${COMBO_PATH}/${product.id}`, { signal });
    return { ...product, soThanhPhan: (combo?.thanh_phan || []).length };
  }));
  return {
    items,
    page: Number(data?.pagination?.page || 0) + 1,
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export const createProduct = (product) => request(PRODUCT_PATH, {
  method: 'POST',
  body: JSON.stringify(product),
});

export const getProductDetail = async (id, signal) =>
  normalizeProductDetail(await request(`${PRODUCT_PATH}/${encodeURIComponent(id)}`, { signal }));

export const updateProduct = (id, product) => request(`${PRODUCT_PATH}/${encodeURIComponent(id)}`, {
  method: 'PUT',
  body: JSON.stringify(product),
});
