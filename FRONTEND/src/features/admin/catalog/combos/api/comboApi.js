import { getAllBrands } from '../../brands/api/brandApi';
import { getAllCategories } from '../../categories/api/categoryApi';
import { apiRequest as request } from '../../../../../auth/backendAuth';

const PATH = '/api/v1/admin/combos';
const TAGS_KEY = '__combo_tags';
const nullableNumber = value => value == null ? null : Number(value);
const statusText = value => Number(value) === 1 ? 'Đang kinh doanh' : 'Ngưng kinh doanh';
const amount = value => Number(String(value ?? '').replace(/[^\d]/g, ''));

function normalizeComponent(item) {
  const qty = Number(item.so_luong);
  const stock = Number(item.ton_co_the_ban ?? 0);

  return {
    id: Number(item.phien_ban_id),
    variantId: Number(item.phien_ban_id),
    name: item.ten_san_pham || '',
    variant: item.ten_phien_ban || '',
    productCode: item.ma_san_pham || '',
    sku: item.ma_vach || '',
    price: Number(item.gia_ban_le ?? 0),
    cost: Number(item.gia_nhap ?? 0),
    image: item.anh_chinh || '',
    stock,
    qty,
    capacity: qty > 0 ? Math.floor(Math.max(0, stock) / qty) : null,
    warrantyMonths: nullableNumber(item.thoi_han_bao_hanh_thang),
    serialMode: item.co_quan_ly_serial,
  };
}

function normalizeDetail(item) {
  const rawSpecs = item.thong_so_ky_thuat || {};
  const imageItems = (item.anh_san_pham || []).map(image => ({
    id: image.id,
    url: image.duong_dan_anh,
    primary: Boolean(image.la_anh_chinh),
    order: Number(image.thu_tu_hien_thi || 0),
  }));

  return {
    id: Number(item.id),
    code: item.ma_san_pham || '',
    name: item.ten_san_pham || '',
    categoryId: nullableNumber(item.danh_muc_id),
    brandId: nullableNumber(item.thuong_hieu_id),
    description: item.mo_ta || '',
    specs: Object.entries(rawSpecs)
      .filter(([name]) => name !== TAGS_KEY)
      .map(([name, value], index) => ({
        id: index + 1,
        name,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })),
    tags: Array.isArray(rawSpecs[TAGS_KEY]) ? rawSpecs[TAGS_KEY] : [],
    vat: Number(item.thue_vat ?? 0),
    price: Number(item.gia_ban_le ?? 0),
    cost: Number(item.gia_nhap ?? 0),
    weight: Number(item.khoi_luong ?? 0),
    stock: null,
    sellable: nullableNumber(item.so_bo_co_the_lap),
    assemblyCapacity: nullableNumber(item.so_bo_co_the_lap),
    configured: Boolean(item.da_co_cau_hinh_combo),
    canSell: Boolean(item.co_the_ban),
    unavailableReason: item.ly_do_chua_the_ban || '',
    status: statusText(item.trang_thai),
    images: imageItems.map(image => image.url),
    imageItems,
    image: imageItems.find(image => image.primary)?.url || imageItems[0]?.url || '',
    configurationLocked: Boolean(item.cau_hinh_bi_khoa),
    variant: {
      id: Number(item.phien_ban_id),
      name: item.ten_phien_ban || '',
      sku: item.ma_vach || '',
      retail: Number(item.gia_ban_le ?? 0),
      cost: Number(item.gia_nhap ?? 0),
      weight: Number(item.khoi_luong ?? 0),
      active: Number(item.trang_thai_phien_ban ?? item.trang_thai) === 1,
    },
    components: (item.thanh_phan || []).map(normalizeComponent),
  };
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

  const data = await request(`${PATH}?${params}`, { signal });

  return {
    items: (data?.items || []).map(item => ({
      id: Number(item.id),
      code: item.ma_san_pham || '',
      name: item.ten_san_pham || '',
      image: item.anh_chinh || '',
      assemblyCapacity: nullableNumber(item.so_bo_co_the_lap),
      sellable: nullableNumber(item.so_bo_co_the_lap),
      stock: null,
      price: Number(item.gia_ban ?? 0),
      status: statusText(item.trang_thai),
      components: (item.thanh_phan || []).map(normalizeComponent),
    })),
    page: Number(data?.pagination?.page || 0) + 1,
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getComboStats(signal) {
  const [all, active, inactive] = await Promise.all([
    request(`${PATH}?page=0&limit=1`, { signal }),
    request(`${PATH}?trang_thai=1&page=0&limit=1`, { signal }),
    request(`${PATH}?trang_thai=0&page=0&limit=1`, { signal }),
  ]);

  return {
    total: Number(all?.pagination?.total_elements || 0),
    active: Number(active?.pagination?.total_elements || 0),
    inactive: Number(inactive?.pagination?.total_elements || 0),
  };
}

export async function getComboDetail(id, signal) {
  const [item, categories, brands] = await Promise.all([
    request(`${PATH}/${encodeURIComponent(id)}`, { signal }),
    getAllCategories(),
    getAllBrands(),
  ]);

  const combo = normalizeDetail(item);

  return {
    ...combo,
    category: categories.find(entry => Number(entry.id) === combo.categoryId)?.name || '—',
    brand: brands.find(entry => Number(entry.id) === combo.brandId)?.name || '—',
  };
}

export async function getComboFormOptions(keyword = '', signal) {
  const params = new URLSearchParams({
    keyword: keyword.trim(), page: '0', limit: '20',
  });

  const [data, categories, brands] = await Promise.all([
    request(`${PATH}/component-options?${params}`, { signal }),
    getAllCategories(),
    getAllBrands(),
  ]);

  return {
    categories,
    brands,
    products: (data?.items || []).map(item => ({
      id: Number(item.phien_ban_id),
      productId: Number(item.san_pham_id),
      hinhAnh: item.anh_chinh || '',
      tenSanPham: item.ten_san_pham || '',
      maSanPham: item.ma_san_pham || '',
      coTheBan: Number(item.ton_co_the_ban ?? 0),
      trangThaiBan: 'Đang kinh doanh',
      warrantyMonths: nullableNumber(item.thoi_han_bao_hanh_thang),
      serialMode: item.co_quan_ly_serial,
      variants: [{
        id: Number(item.phien_ban_id),
        name: item.ten_phien_ban || '',
        sku: item.ma_vach || '',
        giaBanLe: Number(item.gia_ban_le ?? 0),
      }],
    })),
  };
}

function mutationBody(combo) {
  const specifications = Object.fromEntries(
    combo.specs.map(item => [item.name, item.value]),
  );

  if (combo.tags.length) specifications[TAGS_KEY] = combo.tags;

  return {
    danh_muc_id: Number(combo.categoryId),
    thuong_hieu_id: combo.brandId ? Number(combo.brandId) : null,
    ten_san_pham: combo.name.trim(),
    ma_san_pham: combo.code.trim(),
    mo_ta: combo.description,
    thong_so_ky_thuat: specifications,
    gia_ban_le: amount(combo.retail),
    ...(String(combo.cost ?? '').trim() === ''
      ? {} : { gia_nhap: amount(combo.cost) }),
    khoi_luong: Number(combo.weight || 0),
    thue_vat: combo.vat ? Number(combo.vatRate) : 0,
    trang_thai: combo.active ? 1 : 0,
    anh_san_pham: combo.images.map((image, index) => ({
      duong_dan_anh: image.url,
      la_anh_chinh: index === 0,
      thu_tu_hien_thi: index,
    })),
    thanh_phan: combo.components.map(item => ({
      phien_ban_thanh_phan_id: Number(item.variantId || item.id),
      so_luong: Number(item.qty),
    })),
  };
}

export const createCombo = combo =>
  request(PATH, { method: 'POST', body: JSON.stringify(mutationBody(combo)) });

export const updateCombo = (id, combo) =>
  request(`${PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(mutationBody(combo)),
  });

export const deactivateCombo = id =>
  request(`${PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });