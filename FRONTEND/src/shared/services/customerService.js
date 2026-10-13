import axios from 'axios';

const BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || '')
    .replace(/\/$/, '');

const customerAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/customers`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

customerAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

let refreshPromise = null;

customerAxios.interceptors.response.use(
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
      return customerAxios.request(config);
    } catch {
      return Promise.reject(error);
    }
  },
);

const id = (value) => encodeURIComponent(value);

export const customerService = {
  getCustomers: (params, signal) =>
    customerAxios.get('', { params, signal }),

  getCustomerDetail: (customerId, signal) =>
    customerAxios.get(`/${id(customerId)}`, { signal }),

  getCustomerOrders: (customerId, params, signal) =>
    customerAxios.get(`/${id(customerId)}/orders`, { params, signal }),

  createCustomer: (body) =>
    customerAxios.post('', body),

  updateCustomerStatus: (customerId, status) =>
    customerAxios.patch(`/${id(customerId)}/status`, { trang_thai: status }),
};
