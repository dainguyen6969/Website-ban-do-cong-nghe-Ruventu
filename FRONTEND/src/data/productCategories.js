import { readSharedState, writeSharedState } from '../sync/adminSync.js';

export const CATEGORY_STORAGE_KEY = 'ruventu_product_categories_v1';
export const CATEGORY_SYNC_SLICE = 'product-categories';

export const seedProductCategories = [
  { id: 1, name: 'Linh kiện PC', parentId: null, slug: 'linh-kien-pc', status: 'active', image: '', imageMode: 'upload' },
  { id: 2, name: 'Gaming Gear', parentId: null, slug: 'gaming-gear', status: 'active', image: '', imageMode: 'upload' },
  { id: 3, name: 'Màn hình', parentId: null, slug: 'man-hinh', status: 'active', image: '', imageMode: 'upload' },
  { id: 4, name: 'VGA', parentId: 1, slug: 'vga', status: 'active', image: '', imageMode: 'upload' },
  { id: 5, name: 'CPU', parentId: 1, slug: 'cpu', status: 'active', image: '', imageMode: 'upload' },
  { id: 6, name: 'RAM', parentId: 1, slug: 'ram', status: 'active', image: '', imageMode: 'upload' },
  { id: 7, name: 'Mainboard', parentId: 1, slug: 'mainboard', status: 'active', image: '', imageMode: 'upload' },
  { id: 8, name: 'SSD', parentId: 1, slug: 'ssd', status: 'active', image: '', imageMode: 'upload' },
  { id: 9, name: 'Bàn phím', parentId: 2, slug: 'ban-phim', status: 'active', image: '', imageMode: 'upload' },
  { id: 10, name: 'Chuột', parentId: 2, slug: 'chuot', status: 'active', image: '', imageMode: 'upload' },
  { id: 11, name: 'Tai nghe', parentId: 2, slug: 'tai-nghe', status: 'active', image: '', imageMode: 'upload' },
  { id: 12, name: 'Phụ kiện cũ', parentId: null, slug: 'phu-kien-cu', status: 'inactive', image: '', imageMode: 'upload' },
];

export function slugifyCategoryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'danh-muc';
}

export function createUniqueSlug(name, categories, currentId = null) {
  const base = slugifyCategoryName(name);
  const used = new Set(categories.filter((item) => item.id !== currentId).map((item) => item.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function readProductCategories() {
  return readSharedState(CATEGORY_STORAGE_KEY, seedProductCategories).map((item) => ({
    ...item,
    id: Number(item.id),
    parentId: item.parentId == null || item.parentId === '' ? null : Number(item.parentId),
  }));
}

export function saveProductCategories(categories, action = 'updated', entityId = null) {
  writeSharedState(CATEGORY_STORAGE_KEY, categories, {
    slice: CATEGORY_SYNC_SLICE,
    action,
    entityId,
  });
}

export function nextCategoryId(categories) {
  return Math.max(0, ...categories.map((item) => Number(item.id) || 0)) + 1;
}

export function getCategoryProductMap(categories, products) {
  const counts = Object.fromEntries(categories.map((item) => [item.id, 0]));
  const productsByCategory = Object.fromEntries(categories.map((item) => [item.id, []]));
  products.forEach((product) => {
    const category = categories.find((item) => item.name === product.danhMuc);
    if (!category) return;
    counts[category.id] += 1;
    productsByCategory[category.id].push(product);
  });
  categories.filter((item) => item.parentId != null).forEach((child) => {
    if (!(child.parentId in counts)) return;
    counts[child.parentId] += counts[child.id];
    productsByCategory[child.parentId].push(...productsByCategory[child.id]);
  });
  return { counts, productsByCategory };
}
