import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1';
const CACHE_KEY = `ruventu:catalog-options:v1:${API_BASE_URL}`;
const CACHE_TTL_MS = 5 * 60 * 1000;
const validOptions = data => Array.isArray(data?.danhMuc) && Array.isArray(data?.thuongHieu);

let pendingOptions;

export const categoryService = {
  getCachedOptions: () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      return cached?.expiresAt > Date.now() && validOptions(cached.data) ? cached.data : null;
    } catch { return null; }
  },
  getOptions: () => {
    if (!pendingOptions) {
      pendingOptions = axios.get(`${API_BASE_URL}/catalog/options`)
        .then(response => {
          const data = response.data.data;
          if (!validOptions(data)) throw new Error('Dữ liệu danh mục không hợp lệ.');
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ expiresAt: Date.now() + CACHE_TTL_MS, data })); }
          catch { /* Storage unavailable: keep the live response. */ }
          return data;
        })
        .finally(() => { pendingOptions = null; });
    }
    return pendingOptions;
  },
};
