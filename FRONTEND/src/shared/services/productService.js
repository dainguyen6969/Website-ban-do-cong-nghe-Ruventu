import axios from "axios";

const API_BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || "")
    .replace(/\/$/, "") + "/api/v1";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export function toProductCard(product) {
  return {
    id: product.id,
    title: product.tenSanPham,
    name: product.tenSanPham,
    image: product.anhChinh || "",
    price: currency.format(product.giaThapNhat ?? 0),
    category: product.tenDanhMuc,
    loaiSanPham: product.loaiSanPham,
    soBoCoTheLap: product.soBoCoTheLap ?? null,
    thanhPhan: product.thanhPhan ?? [],
    outOfStock:
      (product.coTheBan ?? product.conHang) !== true,
  };
}

export const productService = {
  getProducts: async (params = {}) => {
    const response = await axios.get(
      `${API_BASE_URL}/products`,
      { params },
    );

    return response.data;
  },

  getProductDetail: async (id) => {
    const response = await axios.get(
      `${API_BASE_URL}/products/${id}`,
    );

    return response.data;
  },

  getProductVariantDetail: async (productId, variantId) => {
    const response = await axios.get(
      `${API_BASE_URL}/products/${productId}/variants/${variantId}`,
    );

    return response.data;
  },
};