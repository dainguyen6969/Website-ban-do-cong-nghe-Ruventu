import axios from "axios";

const API_BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || "")
    .replace(/\/$/, "") + "/api/v1";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export const formatProductPrice = value => currency.format(value ?? 0);

const pendingRequests = new Map();

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
    category: product.tenDanhMuc ?? product.danhMuc?.tenDanhMuc ?? "Sản phẩm",
    brand: product.tenThuongHieu ?? product.thuongHieu?.tenThuongHieu ?? "",
    priceValue,
    defaultVariantId: firstVariant?.id ?? null,
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
  // shortcut: filters read every page; move them to the API when the catalog grows.
  getAllProducts: async (params = {}) => {
    const items = [];
    for (let page = 0, pages = 1; page < pages; page += 1) {
      const response = await productService.getProducts({ ...params, page, limit: 100 });
      const data = response?.data;
      if (!Array.isArray(data?.danhSachSanPham)) throw new Error("Dữ liệu sản phẩm không hợp lệ.");
      items.push(...data.danhSachSanPham);
      pages = Number(data.tongSoTrang || 0);
    }
    return items.map(toProductCard);
  },
  getProducts: (params = {}) => getProductData("/products", params),

  getProductDetail: (id) => getProductData(`/products/${encodeURIComponent(id)}`),

  getProductVariantDetail: (productId, variantId) =>
    getProductData(`/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`),
};
