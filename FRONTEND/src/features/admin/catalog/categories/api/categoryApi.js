import {
  apiRequest as sharedRequest,
} from '../../../../../auth/backendAuth';

const CATEGORY_PATH = '/api/v1/admin/categories';

export class CategoryApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'CategoryApiError';
    this.status = status;
    this.data = data;
  }
}

// Sử dụng token và refresh chung từ backendAuth.
// Giữ loại lỗi CategoryApiError cho giao diện hiện tại.
async function apiRequest(path, options = {}) {
  try {
    return await sharedRequest(path, options);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new CategoryApiError(
      error.message,
      error.status || 0,
      error.data ?? null,
    );
  }
}

function normalizeStatus(value) {
  return Number(value) === 1 ? 'active' : 'inactive';
}

function normalizeCategory(item) {
  return {
    id: Number(item.id),
    name: item.ten_danh_muc || '',
    parentId:
      item.danh_muc_cha_id == null
        ? null
        : Number(item.danh_muc_cha_id),
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
    danh_muc_cha_id:
      category.parentId == null
        ? null
        : Number(category.parentId),
    trang_thai: category.status === 'active' ? 1 : 0,
    anh_dai_dien: category.image || null,
  };
}

export async function getAllCategories() {
  const first = await apiRequest(
    `${CATEGORY_PATH}?page=0&limit=100`,
  );

  const items = [...(first?.items || [])];
  const totalPages = Number(first?.pagination?.total_pages || 1);

  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from(
        { length: totalPages - 1 },
        (_, index) =>
          apiRequest(
            `${CATEGORY_PATH}?page=${index + 1}&limit=100`,
          ),
      ),
    );

    remaining.forEach((page) => {
      items.push(...(page?.items || []));
    });
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
  return apiRequest(`${CATEGORY_PATH}/${id}`, {
    method: 'DELETE',
  });
}

export function reactivateCategory(category) {
  return updateCategory(category.id, {
    ...category,
    status: 'active',
  });
}