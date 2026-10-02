import axios from 'axios';

const API_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1/cart';

// Custom axios instance to always include credentials for cookies (guest_cart_id)
const cartAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const cartService = {
  // Get current cart details (fetches data and any applied promotions)
  getCurrentCart: async () => {
    return await cartAxios.get('');
  },

  // Add an item to the cart
  addItem: async (phienBanId, soLuong = 1) => {
    return await cartAxios.post('/items', {
      phien_ban_id: phienBanId,
      so_luong: soLuong,
    });
  },

  // Update item quantity
  updateItem: async (itemId, soLuong) => {
    return await cartAxios.put(`/items/${itemId}`, {
      so_luong: soLuong,
    });
  },

  // Remove an item from the cart
  removeItem: async (itemId) => {
    return await cartAxios.delete(`/items/${itemId}`);
  },

  // Apply a discount promotion
  applyPromotion: async (maKhuyenMai) => {
    return await cartAxios.post('/promotions/apply', {
      ma_khuyen_mai: maKhuyenMai,
    });
  },

  // Remove applied promotion
  removePromotion: async () => {
    return await cartAxios.delete('/promotions');
  }
};
