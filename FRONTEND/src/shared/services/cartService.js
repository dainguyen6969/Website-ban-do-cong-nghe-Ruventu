import axios from 'axios';
import { apiRequest, getAccessToken } from '../../auth/backendAuth';

const API_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1/cart';

// Custom axios instance to always include credentials for cookies (guest_cart_id)
const cartAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function request(method, path = '', body, headers) {
  if (getAccessToken()) {
    const data = await apiRequest('/api/v1/cart' + path, {
      method, headers, responseType: 'payload', body: body == null ? undefined : JSON.stringify(body),
    });
    return { data };
  }
  return cartAxios.request({ method, url: path, data: body, headers });
}

export const cartService = {
  // Get current cart details (fetches data and any applied promotions)
  getCurrentCart: async () => {
    return await request('GET');
  },

  // Add an item to the cart
  addItem: async (phienBanId, soLuong = 1) => {
    return await request('POST', '/items', {
      phien_ban_id: phienBanId,
      so_luong: soLuong,
    });
  },

  // Update item quantity
  updateItem: async (itemId, soLuong) => {
    return await request('PUT', `/items/${itemId}`, {
      so_luong: soLuong,
    });
  },

  // Remove an item from the cart
  removeItem: async (itemId) => {
    return await request('DELETE', `/items/${itemId}`);
  },

  // Apply a discount promotion
  applyPromotion: async (maKhuyenMai) => {
    return await request('POST', '/promotions/apply', {
      ma_khuyen_mai: maKhuyenMai,
    });
  },

  // Remove applied promotion
  removePromotion: async () => {
    return await request('DELETE', '/promotions');
  },

  addPcBuild: (key, body) => request('POST', '/pc-build', body, { 'Idempotency-Key': key }),
};
