import axios from 'axios';

const BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || '')
    .replace(/\/$/, '');

const cashbookAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/cashbook`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

cashbookAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const cashbookService = {
  getCashbook: async (params) => {
    return cashbookAxios.get('', { params });
  },

  exportCashbook: async (params) => {
    return cashbookAxios.get('/export', {
      params,
      responseType: 'blob',
    });
  },

  getOverview: async (params) => {
    return cashbookAxios.get('/overview', { params });
  },

  getCashFlow: async (params) => {
    return cashbookAxios.get('/cash-flow', { params });
  },
};
