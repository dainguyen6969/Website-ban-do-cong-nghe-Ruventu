import axios from "axios";
import { parseSpecifications, selectHighlights, toSpecRows } from './productSpecifications';

const API_BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || "")
    .replace(/\/$/, "") + "/api/v1";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export const formatProductPrice = value => currency.format(value ?? 0);

const pendingRequests = new Map();
const CATALOG_CACHE_KEY = `ruventu:catalog:v1:${API_BASE_URL}`;
const CATALOG_TTL_MS = 5 * 60 * 1000;
const catalogQueryKey = params => JSON.stringify(Object.entries({ sort: 'moi_nhat', ...params }).sort(([a], [b]) => a.localeCompare(b)));

function getCachedAllProducts(params = {}) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CATALOG_CACHE_KEY));
    return cached?.key === catalogQueryKey(params) && cached.expiresAt > Date.now() && Array.isArray(cached.items)
      ? cached.items : null;
  } catch { return null; }
}

function getProductData(path, params = {}) {
  const key = JSON.stringify([path, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
  if (!pendingRequests.has(key)) {
    const request = axios.get(`${API_BASE_URL}${path}`, { params })
      .then(response => response.data)
      .finally(() => pendingRequests.delete(key));
    pendingRequests.set(key, request);
  }
  return pendingRequests.get(key);
}

export function toProductCard(product) {
  const variants = [...(product.danhSachPhienBan || [])]
    .sort((a, b) => (a.giaBanLe ?? Infinity) - (b.giaBanLe ?? Infinity));
  const firstVariant = variants[0];
  const defaultVariantId = product.phienBanMacDinhId ?? firstVariant?.id ?? null;
  const category = product.tenDanhMuc ?? product.danhMuc?.tenDanhMuc ?? "Sản phẩm";
  const specifications = parseSpecifications(product.thongSoKyThuat);
  const selected = specifications.phien_ban?.[defaultVariantId];
  const mainSpecs = toSpecRows(selected?.thong_so_chinh);
  const specs = selectHighlights(mainSpecs.length ? mainSpecs : toSpecRows(selected?.thong_so_ky_thuat ?? specifications), category).slice(0, 4);
  const priceValue = Number(product.giaThapNhat ?? firstVariant?.giaBanLe ?? 0);
  const highestPrice = Number(product.giaCaoNhat ?? variants.at(-1)?.giaBanLe ?? priceValue);
  const images = [...(product.anhSanPham || [])]
    .sort((a, b) => Number(Boolean(b.laAnhChinh)) - Number(Boolean(a.laAnhChinh))
      || (a.thuTuHienThi ?? 0) - (b.thuTuHienThi ?? 0) || a.id - b.id)
    .map(image => image.duongDanAnh).filter(Boolean);
  const available = product.coTheBan ?? product.conHang ?? variants.some(variant =>
    variant.coTheBan !== false && Number(product.loaiSanPham === "BO_PC" ? variant.soBoCoTheLap : variant.tonCoTheBan) > 0
      && (product.loaiSanPham !== "BO_PC" || variant.coTheBan === true));
  return {
    id: product.id,
    maSanPham: product.maSanPham,
    title: product.tenSanPham,
    name: product.tenSanPham,
    image: product.anhChinh || images[0] || "",
    images,
    price: formatProductPrice(priceValue),
    priceFrom: highestPrice > priceValue,
    category,
    categoryId: product.danhMucId ?? product.danhMuc?.id ?? null,
    brand: product.tenThuongHieu ?? product.thuongHieu?.tenThuongHieu ?? "",
    brandId: product.thuongHieuId ?? product.thuongHieu?.id ?? null,
    priceValue,
    defaultVariantId,
    specs,
    loaiSanPham: product.loaiSanPham,
    soBoCoTheLap: product.soBoCoTheLap ?? firstVariant?.soBoCoTheLap ?? null,
    thanhPhan: product.thanhPhan ?? [],
    outOfStock: available !== true,
  };
}

export function toProductDetail(product) {
  const card = toProductCard(product);
  const variants = product.danhSachPhienBan || [];
  const firstVariant = variants.find(variant => variant.id === card.defaultVariantId);
  return {
    ...card,
    currentPrice: card.priceValue,
    originalPrice: card.priceValue,
    stock: product.loaiSanPham === "BO_PC"
      ? (firstVariant?.soBoCoTheLap ?? null) : (firstVariant?.tonCoTheBan ?? 0),
    variants,
    specifications: product.thongSoKyThuat,
    description: product.moTa || "",
    discountPercent: 0,
    tags: [],
    policies: [
      { title: "MIỄN PHÍ VẬN CHUYỂN", desc: "Đơn từ 5tr", icon: "truck" },
      { title: "CAM KẾT GIÁ", desc: "Tốt nhất", icon: "tag" },
    ],
  };
}

export const productService = {
  getCachedAllProducts,
  // shortcut: filters read every page; move them to the API when the catalog grows.
  getAllProducts: async (params = {}) => {
    const cached = getCachedAllProducts(params);
    if (cached) return cached;
    const readPage = async page => {
      const response = await productService.getProducts({ ...params, page, limit: 100 });
      const data = response?.data;
      if (!Array.isArray(data?.danhSachSanPham)) throw new Error("Dữ liệu sản phẩm không hợp lệ.");
      return data;
    };
    const first = await readPage(0);
    const items = [...first.danhSachSanPham];
    // Keep at most two page requests active, rather than downloading the catalog serially.
    for (let page = 1; page < Number(first.tongSoTrang || 0); page += 2) {
      const batch = await Promise.all([readPage(page), ...(page + 1 < first.tongSoTrang ? [readPage(page + 1)] : [])]);
      for (const data of batch) items.push(...data.danhSachSanPham);
    }
    const cards = items.map(toProductCard);
    // shortcut: list prices/stock may be five minutes old; invalidate on inventory events if live listings are required.
    try { sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ key: catalogQueryKey(params), expiresAt: Date.now() + CATALOG_TTL_MS, items: cards })); }
    catch { /* Storage unavailable or full: keep the live result. */ }
    return cards;
  },
  getProducts: (params = {}) => getProductData("/products", params),

  getProductDetail: (id) => getProductData(`/products/${encodeURIComponent(id)}`),

  getProductVariantDetail: (productId, variantId) =>
    getProductData(`/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`),
};
