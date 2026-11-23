import axios from 'axios';
import { attachSessionAuth } from '../../auth/backendAuth';

const BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');

const disbursementAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/disbursements`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachSessionAuth(disbursementAxios);

const disbursementTypeAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/disbursement-types`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachSessionAuth(disbursementTypeAxios);

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

  cancelDisbursement: async (id, data, requestKey) => {
    return disbursementAxios.post(`/${id}/cancel`, data, {
      headers: { 'Idempotency-Key': requestKey },
    });
  },

  getPayeeSuggestions: async (params) => {
    return disbursementAxios.get('/payees', { params });
  },

  getDisbursementTypes: async (params) => {
    return disbursementTypeAxios.get('', { params });
  },

  createDisbursementType: async (data) => {
    return disbursementTypeAxios.post('', data);
  },
};
