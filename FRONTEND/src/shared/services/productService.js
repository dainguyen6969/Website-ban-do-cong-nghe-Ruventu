import axios from "axios";
import { parseSpecifications, selectHighlights, toSpecRows } from './productSpecifications';
import { createReadCache, queryKey } from './readCache';

const API_BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || "")
    .replace(/\/$/, "") + "/api/v1";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export const formatProductPrice = value => currency.format(value ?? 0);

// shortcut: browsing prices/stock can be five minutes old; cart and checkout validate live on the server.
const catalogCache = createReadCache({ ttl: 5 * 60 * 1000, storageKey: `ruventu:catalog:v2:${API_BASE_URL}`, limit: 12, validate: Array.isArray });
const productCache = createReadCache({ ttl: 5 * 60 * 1000, storageKey: `ruventu:products:v1:${API_BASE_URL}`, validate: value => value?.data && typeof value.data === 'object' });
const catalogQueryKey = params => queryKey({ ...params, sort: params.sort || 'moi_nhat' });
const productKey = (path, params = {}) => JSON.stringify([path, queryKey(params)]);

function getCachedAllProducts(params = {}) {
  const items = catalogCache.peek(catalogQueryKey(params));
  return Array.isArray(items) ? items : null;
}

function getProductData(path, params = {}) {
  return productCache.load(productKey(path, params), async () => {
    const response = await axios.get(`${API_BASE_URL}${path}`, { params });
    if (!response.data?.data || (path === '/products' && !Array.isArray(response.data.data.danhSachSanPham))) {
      throw new Error('Dữ liệu sản phẩm không hợp lệ.');
    }
    return response.data;
  });
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
  getCachedProducts: (params = {}) => productCache.peek(productKey('/products', params)),
  getCachedProductDetail: id => productCache.peek(productKey(`/products/${encodeURIComponent(id)}`)),
  clearCache: () => { catalogCache.clear(); productCache.clear(); },
  // shortcut: filters read every page; move them to the API when the catalog grows.
  getAllProducts: (params = {}) => catalogCache.load(catalogQueryKey(params), async () => {
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
    return items.map(toProductCard);
  }),
  getProducts: (params = {}) => getProductData("/products", params),

  getProductDetail: (id) => getProductData(`/products/${encodeURIComponent(id)}`),

  getProductVariantDetail: (productId, variantId) =>
    getProductData(`/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`),
};
