import axios from 'axios';

const BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || '')
    .replace(/\/$/, '');

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

let refreshPromise = null;

orderAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
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
      if (!refreshPromise) {
        refreshPromise = axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        ).then((response) => {
          const token = response.data?.data?.access_token;

          if (!token) {
            throw new Error('Không thể làm mới phiên đăng nhập.');
          }

          localStorage.setItem('accessToken', token);
          return token;
        }).finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      // Giữ nguyên body và Idempotency-Key.
      return orderAxios.request(config);
    } catch {
      return Promise.reject(error);
    }
  },
);

const id = (value) => encodeURIComponent(value);

export const orderService = {
  previewCheckout: (body, signal) =>
    orderAxios.post('/checkout/preview', body, { signal }),

  submitCheckout: (body, key) =>
    orderAxios.post('/checkout', body, {
      headers: {
        'Idempotency-Key': key,
      },
    }),

  getOrders: (params, signal) =>
    orderAxios.get('', { params, signal }),

  getOrder: (orderId, signal) =>
    orderAxios.get(`/${id(orderId)}`, { signal }),

  cancelOrder: (orderId, reason) =>
    orderAxios.post(`/${id(orderId)}/cancel`, {
      ly_do: reason.trim(),
    }),

  requestReturn: (orderId, body) =>
    orderAxios.post(`/${id(orderId)}/returns`, body),

  getReturns: (params, signal) =>
    orderAxios.get('/returns', { params, signal }),

  trackOrder: (orderCode, recipientPhone) =>
    orderAxios.get('/tracking', {
      params: {
        ma_don_hang: orderCode,
        sdt_nguoi_nhan: recipientPhone,
      },
    }),
};