import axios from 'axios';

const BASE_URL =
  (import.meta.env.VITE_RUVENTU_API_URL || '')
    .replace(/\/$/, '');

const receiptAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/receipts`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

receiptAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const receiptTypeAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/receipt-types`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

receiptTypeAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const receiptService = {
  getReceipts: async (params) => {
    return receiptAxios.get('', { params });
  },

  getReceiptDetail: async (id) => {
    return receiptAxios.get(`/${id}`);
  },

  createReceipt: async (data, requestKey) => {
    const config = requestKey ? { headers: { 'Idempotency-Key': requestKey } } : {};
    return receiptAxios.post('', data, config);
  },

  cancelReceipt: async (id, data) => {
    return receiptAxios.post(`/${id}/cancel`, data);
  },
  
  getPayerSuggestions: async (params) => {
    return receiptAxios.get('/payers', { params });
  },

  getReceiptTypes: async (params) => {
    return receiptTypeAxios.get('', { params });
  },

  createReceiptType: async (data) => {
    return receiptTypeAxios.post('', data);
  }
};
