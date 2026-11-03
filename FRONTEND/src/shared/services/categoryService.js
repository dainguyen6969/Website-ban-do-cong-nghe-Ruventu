import axios from 'axios';
import { createReadCache } from './readCache';

const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1';
const validOptions = data => Array.isArray(data?.danhMuc) && Array.isArray(data?.thuongHieu);
const cache = createReadCache({ ttl: 5 * 60 * 1000, storageKey: `ruventu:catalog-options:v2:${API_BASE_URL}`, limit: 1, validate: validOptions });

export const categoryService = {
  getCachedOptions: () => {
    const data = cache.peek('options');
    return validOptions(data) ? data : null;
  },
  clearCache: () => cache.clear(),
  getOptions: ({ force = false } = {}) => cache.load('options', () => axios.get(`${API_BASE_URL}/catalog/options`)
        .then(response => {
          const data = response.data.data;
          if (!validOptions(data)) throw new Error('Dữ liệu danh mục không hợp lệ.');
          return data;
        }), { force }),
};
