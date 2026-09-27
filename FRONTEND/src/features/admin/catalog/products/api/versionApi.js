const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
const ACCESS_TOKEN_KEY = 'ruventu_backend_access_token';
const TRANSACTION_LABELS = {
  NHAP_HANG: 'Nhập hàng', XUAT_BAN: 'Xuất bán', KHACH_TRA: 'Khách trả',
  TRA_NCC: 'Trả NCC', KIEM_KHO: 'Kiểm kho',
};
const TRANSACTION_CODES = Object.fromEntries(Object.entries(TRANSACTION_LABELS).map(([code, label]) => [label, code]));

let token = '';
let loginPromise = null;

function storeToken(value) {
  token = value;
  if (value) localStorage.setItem(ACCESS_TOKEN_KEY, value);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { throw new Error('Backend trả về dữ liệu không hợp lệ.'); }
}

async function login() {
  const username = import.meta.env.VITE_RUVENTU_ADMIN_USERNAME;
  const password = import.meta.env.VITE_RUVENTU_ADMIN_PASSWORD;
  if (!username || !password) throw new Error('Chưa có phiên đăng nhập backend.');
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ tai_khoan: username, mat_khau: password, ghi_nho_dang_nhap: false }),
  });
  const payload = await parseResponse(response);
  const accessToken = payload?.data?.access_token;
  if (!response.ok || !accessToken) throw new Error(payload?.message || 'Không thể đăng nhập backend.');
  storeToken(accessToken);
  return accessToken;
}

async function request(path, options = {}, retry = true) {
  token ||= localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('access_token') || localStorage.getItem('accessToken') || '';
  const accessToken = token || await (loginPromise ||= login().finally(() => { loginPromise = null; }));
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
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

export { request as adminRequest };

async function allPages(path, params, signal) {
  const items = [];
  for (let page = 0, totalPages = 1; page < totalPages; page += 1) {
    const query = new URLSearchParams({ ...params, page: String(page), limit: '100' });
    const data = await request(`${path}?${query}`, { signal });
    items.push(...(data?.items || []));
    totalPages = Number(data?.pagination?.total_pages || 0);
  }
  return items;
}

export async function getWarehouses(signal) {
  return (await allPages('/api/v1/admin/warehouses', {}, signal)).map((item) => ({
    id: Number(item.id), code: item.ma_kho || '', name: item.ten_kho || '',
  }));
}

export async function getAllVersions(warehouseId, signal, includeCombos = true) {
  const [warehouses, items, combos] = await Promise.all([
    getWarehouses(signal),
    allPages('/api/v1/admin/inventory/items', {
      loai_doi_tuong: 'PHIEN_BAN',
      ...(warehouseId ? { kho_hang_id: String(warehouseId) } : {}),
    }, signal),
    includeCombos ? allPages('/api/v1/admin/combos', {}, signal) : Promise.resolve([]),
  ]);
  const selectedWarehouse = warehouses.find((item) => item.id === Number(warehouseId));
  return {
    warehouses,
    versions: [...items.map((item) => ({
      id: Number(item.doi_tuong_id), barcode: item.ma_hien_thi || '', sku: item.ma_hien_thi || '',
      displayCode: item.ma_hien_thi || '', displayName: item.ten_hien_thi || '', type: 'Phiên bản',
      available: Number(item.ton_co_the_ban || 0), actual: Number(item.ton_thuc_te || 0),
      warehouse: selectedWarehouse?.name || 'Tất cả kho', location: item.vi_tri_luu_kho || '—', image: item.anh || '',
    })), ...combos.map((item) => ({
      id: `combo:${item.id}`, comboId: Number(item.id), barcode: '', sku: item.ma_san_pham || '',
      displayCode: item.ma_san_pham || '', displayName: item.ten_san_pham || '', type: 'Combo',
      available: Number(item.ton_co_the_ban || 0), actual: Number(item.ton_thuc_te || 0),
      warehouse: 'Theo tồn thành phần', location: `${item.thanh_phan?.length || 0} thành phần`, image: '',
    }))],
  };
}

const allocation = (item, warehouses) => {
  const warehouse = warehouses.find((entry) => entry.id === Number(item.kho_hang_id));
  return {
    id: Number(item.kho_hang_id), code: warehouse?.code || String(item.kho_hang_id),
    name: item.ten_kho || warehouse?.name || 'Kho hàng', location: item.vi_tri_luu_kho || '—',
    actual: Number(item.ton_thuc_te || 0), available: Number(item.ton_co_the_ban || 0),
  };
};

export async function getVersionDetail(variantId, signal) {
  const [item, warehouses] = await Promise.all([
    request(`/api/v1/admin/inventory/items/${encodeURIComponent(variantId)}?loai_doi_tuong=PHIEN_BAN`, { signal }),
    getWarehouses(signal),
  ]);
  const product = await request(`/api/v1/admin/products/${item.phien_ban.san_pham_id}`, { signal });
  const versions = await Promise.all((product.danh_sach_phien_ban || []).map(async (variant) => {
    const stock = await request(`/api/v1/admin/inventory/items/${variant.id}?loai_doi_tuong=PHIEN_BAN`, { signal });
    const allocations = (stock.ton_kho_theo_kho || []).map((entry) => allocation(entry, warehouses));
    return {
      id: Number(variant.id), name: variant.ten_phien_ban || 'Mặc định', sku: variant.ma_vach || '',
      actual: allocations.reduce((sum, entry) => sum + entry.actual, 0),
      available: allocations.reduce((sum, entry) => sum + entry.available, 0),
      status: Number(variant.trang_thai) === 1, allocations,
    };
  }));
  const images = product.anh_san_pham || [];
  return {
    id: Number(product.id), name: product.ten_san_pham || '', productCode: product.ma_san_pham || '',
    brand: product.thuong_hieu?.ten_thuong_hieu || '—', category: product.danh_muc?.ten_danh_muc || '—',
    unit: '—', productType: 'Có phiên bản', status: Number(product.trang_thai) === 1 ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    image: images.find((entry) => entry.la_anh_chinh)?.duong_dan_anh || images[0]?.duong_dan_anh || '',
    stats: {
      actual: versions.reduce((sum, version) => sum + version.actual, 0),
      available: versions.reduce((sum, version) => sum + version.available, 0), versionCount: versions.length,
    },
    versions, warehouses,
  };
}

export async function getVersionLedger(filters, signal) {
  const params = { phien_ban_id: String(filters.variantId) };
  if (filters.warehouseId) params.kho_hang_id = String(filters.warehouseId);
  if (filters.transactionType && filters.transactionType !== 'Tất cả') params.loai_giao_dich = TRANSACTION_CODES[filters.transactionType];
  if (filters.fromDate) params.tu_ngay = filters.fromDate;
  if (filters.toDate) params.den_ngay = filters.toDate;
  const [items, warehouses] = await Promise.all([
    allPages('/api/v1/admin/inventory/ledger', params, signal), getWarehouses(signal),
  ]);
  return items.map((item) => ({
    id: Number(item.id), date: item.ngay_tao, transactionType: TRANSACTION_LABELS[item.loai_giao_dich] || item.loai_giao_dich,
    documentCode: String(item.ma_chung_tu_goc ?? '—'), user: '—', change: Number(item.so_luong_thay_doi || 0),
    closing: Number(item.ton_cuoi || 0), note: item.ghi_chu || '—',
    warehouse: warehouses.find((entry) => entry.id === Number(item.kho_hang_id))?.name || '—',
  }));
}

export async function getEditableVersions(productId, signal) {
  const item = await request(`/api/v1/admin/products/${encodeURIComponent(productId)}`, { signal });
  return (item.danh_sach_phien_ban || []).map((variant) => ({
    id: Number(variant.id), name: variant.ten_phien_ban || 'Mặc định', sku: variant.ma_vach || '',
    giaBanLe: Number(variant.gia_ban_le || 0), giaNhap: Number(variant.gia_nhap || 0),
    khoiLuong: variant.khoi_luong == null ? '' : String(variant.khoi_luong), trangThai: Number(variant.trang_thai),
  }));
}

export const updateVersion = (productId, variantId, payload) => request(
  `/api/v1/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
  { method: 'PUT', body: JSON.stringify(payload) },
);
