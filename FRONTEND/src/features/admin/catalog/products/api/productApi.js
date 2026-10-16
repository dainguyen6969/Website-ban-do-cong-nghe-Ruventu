import { apiRequest as request } from '../../../../../auth/backendAuth';

const PATH = '/api/v1/admin/products';
const nullableNumber = value => value == null ? null : Number(value);

export function normalizeVariant(item) {
  return {
    id: Number(item.id),
    name: item.ten_phien_ban || '',
    sku: item.ma_vach || '',
    giaBanLe: Number(item.gia_ban_le ?? 0),
    giaNhap: Number(item.gia_nhap ?? 0),
    khoiLuong: String(item.khoi_luong ?? ''),
    trangThai: Number(item.trang_thai),
    serialMode: item.co_quan_ly_serial,
    serialModeLocked: Boolean(item.che_do_serial_bi_khoa),
    attributes: item.thuoc_tinh_phien_ban || [],
    tonKho: nullableNumber(item.ton_thuc_te),
    available: nullableNumber(item.ton_co_the_ban),
  };
}

function normalizeProduct(item) {
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
    soThanhPhan: nullableNumber(item.so_thanh_phan),
    tonKho: nullableNumber(item.ton_thuc_te),
    coTheBan: nullableNumber(item.ton_co_the_ban),
    assemblyCapacity: nullableNumber(item.so_bo_co_the_lap),
    configured: Boolean(item.da_co_cau_hinh_combo),
    sellable: Boolean(item.co_the_ban),
    unavailableReason: item.ly_do_chua_the_ban || '',
    warrantyMonths: nullableNumber(item.thoi_han_bao_hanh_thang),
    trangThaiBan: Number(item.trang_thai) === 1
      ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    canhBao: null,
    hinhAnh: item.anh_chinh || '',
  };
}

function normalizeProductDetail(item) {
  const isCombo = item.loai_san_pham === 'BO_PC';
  const variants = (item.danh_sach_phien_ban || []).map(normalizeVariant);

  const images = (item.anh_san_pham || []).map(image => ({
    id: image.id,
    url: image.duong_dan_anh,
    primary: Boolean(image.la_anh_chinh),
    order: Number(image.thu_tu_hien_thi || 0),
  }));

  return {
    id: Number(item.id),
    maSanPham: item.ma_san_pham || '',
    tenSanPham: item.ten_san_pham || '',
    danhMucId: item.danh_muc?.id ?? null,
    danhMuc: item.danh_muc?.ten_danh_muc || '',
    thuongHieuId: item.thuong_hieu?.id ?? null,
    thuongHieu: item.thuong_hieu?.ten_thuong_hieu || '',
    phanLoai: isCombo ? 'Theo bộ (Combo)' : 'Sản phẩm đơn',
    isCombo,
    moTa: item.mo_ta || '',
    specs: Object.entries(item.thong_so_ky_thuat || {}).map(([name, value], index) => ({
      id: index + 1,
      name,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    })),
    vat: `${Number(item.thue_vat ?? 0)}%`,
    trangThaiBan: Number(item.trang_thai) === 1
      ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    warrantyMonths: nullableNumber(item.thoi_han_bao_hanh_thang),
    assemblyCapacity: nullableNumber(item.so_bo_co_the_lap),
    configured: Boolean(item.da_co_cau_hinh_combo),
    sellable: Boolean(item.co_the_ban),
    unavailableReason: item.ly_do_chua_the_ban || '',
    images,
    hinhAnh: images.find(image => image.primary)?.url || images[0]?.url || '',
    variants,
    giaBanLe: variants[0]?.giaBanLe ?? 0,
    giaNhap: variants[0]?.giaNhap ?? 0,
    khoiLuong: variants[0]?.khoiLuong ?? '',
    tonKho: nullableNumber(item.ton_thuc_te),
    coTheBan: nullableNumber(item.ton_co_the_ban),
    components: (item.thanh_phan || []).map(component => ({
      id: Number(component.phien_ban_id),
      name: component.ten_san_pham || '',
      variant: component.ten_phien_ban || '',
      qty: Number(component.so_luong),
      warrantyMonths: nullableNumber(component.thoi_han_bao_hanh_thang),
      serialMode: component.co_quan_ly_serial,
    })),
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
  if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
    params.set('trang_thai', String(filters.status));
  }

  const data = await request(`${PATH}?${params}`, { signal });

  return {
    items: (data?.items || []).map(normalizeProduct),
    page: Number(data?.pagination?.page || 0) + 1,
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export const getProductDetail = async (id, signal) =>
  normalizeProductDetail(
    await request(`${PATH}/${encodeURIComponent(id)}`, { signal }),
  );

export const createProduct = body =>
  request(PATH, { method: 'POST', body: JSON.stringify(body) });

export const updateProduct = (id, body) =>
  request(`${PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const addProductVariant = (productId, body) =>
  request(`${PATH}/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateProductVariant = (productId, variantId, body) =>
  request(`${PATH}/${productId}/variants/${variantId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const replaceVariantAttributes = (productId, variantId, attributes) =>
  request(`${PATH}/${productId}/variants/${variantId}/attributes`, {
    method: 'PUT',
    body: JSON.stringify({
      thuoc_tinh_phien_ban: attributes.map(item => ({
        ten_thuoc_tinh: item.ten_thuoc_tinh.trim(),
        gia_tri: item.gia_tri.trim(),
      })),
    }),
  });