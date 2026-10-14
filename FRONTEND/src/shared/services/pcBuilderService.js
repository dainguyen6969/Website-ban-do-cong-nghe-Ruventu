import axios from 'axios';
import { cartService } from './cartService';

export function pcBuilderError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.data?.message) return error.data.message;
  if (error.isAxiosError || error instanceof TypeError) {
    return 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.';
  }
  return error.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

const api = axios.create({
  baseURL: (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1/pc-builder',
  withCredentials: true,
});

export const pcBuilderService = {
  options: (signal) => api.get('/options', { signal }).then(res => res.data.data),
  products: (params, signal) => api.get('/products', { params, signal }).then(res => res.data.data),
  preview: (body, signal) => api.post('/preview', body, { signal }).then(res => res.data.data),
  addToCart: (key, body) => cartService.addPcBuild(key, body).then(res => res.data.data),
};
