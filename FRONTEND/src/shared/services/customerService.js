import axios from 'axios';

import { attachSessionAuth } from '../../auth/backendAuth';

const BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');

const customerAxios = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin/customers`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachSessionAuth(customerAxios);

const id = (value) => encodeURIComponent(value);

export const customerService = {
  getCustomers: (params, signal) => customerAxios.get('', { params, signal }),

  getCustomerDetail: (customerId, signal) => customerAxios.get(`/${id(customerId)}`, { signal }),

  getCustomerOrders: (customerId, params, signal) =>
    customerAxios.get(`/${id(customerId)}/orders`, { params, signal }),

  createCustomer: (body) => customerAxios.post('', body),

  updateCustomerStatus: (customerId, status) =>
    customerAxios.patch(`/${id(customerId)}/status`, { trang_thai: status }),
};
