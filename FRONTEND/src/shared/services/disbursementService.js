import axios from 'axios';

const BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || '')
    .replace(/\/$/, '');

const disbursementAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/disbursements`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

disbursementAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const disbursementTypeAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/disbursement-types`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

disbursementTypeAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const disbursementService = {
  getDisbursements: async (params) => {
    return disbursementAxios.get('', { params });
  },

  getDisbursementDetail: async (id) => {
    return disbursementAxios.get(`/${id}`);
  },

  createDisbursement: async (data, requestKey) => {
    const config = requestKey ? { headers: { 'Idempotency-Key': requestKey } } : {};
    return disbursementAxios.post('', data, config);
  },

  cancelDisbursement: async (id, data) => {
    return disbursementAxios.post(`/${id}/cancel`, data);
  },

  getPayeeSuggestions: async (params) => {
    return disbursementAxios.get('/payees', { params });
  },

  getDisbursementTypes: async (params) => {
    return disbursementTypeAxios.get('', { params });
  },

  createDisbursementType: async (data) => {
    return disbursementTypeAxios.post('', data);
  }
};
