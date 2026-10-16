import axios from 'axios';
import {
  apiRequest,
  getAccessToken,
} from '../../auth/backendAuth';

const CART_PATH = '/api/v1/cart';

const API_BASE_URL = (
  import.meta.env.VITE_RUVENTU_API_URL || ''
).replace(/\/$/, '');

// Giỏ khách sử dụng cookie guest_cart_id.
const cartAxios = axios.create({
  baseURL: `${API_BASE_URL}${CART_PATH}`,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

async function request(
  method,
  path = '',
  body = undefined,
  headers = {},
) {
  // Khách chưa đăng nhập.
  if (!getAccessToken()) {
    return cartAxios.request({
      method,
      url: path,
      data: body,
      headers,
    });
  }

  // Người đã đăng nhập dùng token và cơ chế refresh dùng chung.
  const options = {
    method,
    headers,
    responseType: 'payload',
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const payload = await apiRequest(
      `${CART_PATH}${path}`,
      options,
    );

    // Giữ cách đọc res.data.data của các component hiện tại.
    return { data: payload };
  } catch (error) {
    // Giữ cách đọc err.response.data.message hiện tại.
    if (!error.response) {
      error.response = {
        status: error.status ?? 0,
        data: error.data ?? {
          message: error.message || 'Không thể xử lý giỏ hàng.',
        },
      };
    }

    throw error;
  }
}

export const cartService = {
  getCurrentCart: () => request('GET'),

  addItem: (phienBanId, soLuong = 1) =>
    request('POST', '/items', {
      phien_ban_id: phienBanId,
      so_luong: soLuong,
    }),

  updateItem: (itemId, soLuong) =>
    request('PUT', `/items/${itemId}`, {
      so_luong: soLuong,
    }),

  removeItem: (itemId) =>
    request('DELETE', `/items/${itemId}`),

  applyPromotion: (maChuongTrinh) =>
    request('POST', '/apply', {
      ma_chuong_trinh: maChuongTrinh,
    }),

  removePromotion: () =>
    request('DELETE', '/promotion'),

  addPcBuild: (key, body) =>
    request('POST', '/pc-build', body, {
      'Idempotency-Key': key,
    }),
};