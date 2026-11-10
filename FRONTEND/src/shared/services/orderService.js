import axios from 'axios';
import { notifyMaintenance } from '../../settings/maintenanceState';
import { AUTH_CHANGED, getAccessToken, refreshAccessToken } from '../../auth/backendAuth';
import { createReadCache, queryKey } from './readCache';
import { cartService } from './cartService';
import { productService } from './productService';

const BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');

const orderAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/orders`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token của phiên đăng nhập storefront hiện tại.
orderAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

orderAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    notifyMaintenance(error.response?.status, error.response?.data);
    const config = error.config;

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      !localStorage.getItem('accessToken')
    ) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      const sentToken = config.headers.Authorization?.replace(/^Bearer /, '');
      if (getAccessToken() === sentToken) await refreshAccessToken();

      // Giữ nguyên body và Idempotency-Key.
      return orderAxios.request(config);
    } catch (refreshError) {
      notifyMaintenance(refreshError.status ?? refreshError.response?.status, refreshError.data ?? refreshError.response?.data);
      return Promise.reject(refreshError);
    }
  }
);

const id = (value) => encodeURIComponent(value);
const cache = createReadCache({ ttl: 15 * 1000 });
let identity;
function read(path, params = {}, signal) {
  const next = getAccessToken();
  if (identity !== next) { cache.clear(); identity = next; }
  return cache.load(JSON.stringify([path, queryKey(params)]), () => orderAxios.get(path, { params }), { signal });
}
if (typeof window !== 'undefined') {
  window.addEventListener?.(AUTH_CHANGED, () => cache.clear());
  window.addEventListener?.('storage', event => {
    if (event.key === 'accessToken' || event.key === null) cache.clear();
  });
}
async function mutate(path, body, config) {
  cache.clear();
  try { return await orderAxios.post(path, body, config); }
  finally { cache.clear(); }
}

export const orderService = {
  registerStockNotice: (body, key) =>
    orderAxios.post('/stock-notifications', body, {
      headers: { 'Idempotency-Key': key },
    }),

  previewCheckout: (body, signal) => orderAxios.post('/checkout/preview', body, { signal }),

  submitCheckout: (body, key) =>
    mutate('/checkout', body, {
      headers: {
        'Idempotency-Key': key,
      },
    }).finally(() => { cartService.clearCache(); productService.clearCache(); }),

  getOrders: (params, signal) => read('', params, signal),

  getOrder: (orderId, signal) => read(`/${id(orderId)}`, {}, signal),

  cancelOrder: (orderId, reason, key) =>
    mutate(
      `/${id(orderId)}/cancel`,
      {
        ly_do: reason.trim(),
      },
      {
        headers: {
          'Idempotency-Key': key,
        },
      }
    ),

  requestReturn: (orderId, body) => mutate(`/${id(orderId)}/returns`, body),

  getReturns: (params, signal) => read('/returns', params, signal),

  trackOrder: (orderCode, recipientPhone) =>
    orderAxios.get('/tracking', {
      params: {
        ma_don_hang: orderCode,
        sdt_nguoi_nhan: recipientPhone,
      },
    }),
};
