import axios from 'axios';
import { attachSessionAuth } from '../../auth/backendAuth';

const BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');

const cashbookAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/cashbook`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachSessionAuth(cashbookAxios);

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
