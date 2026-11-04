import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1';

let pendingOptions;

export const categoryService = {
  getOptions: () => {
    if (!pendingOptions) {
      pendingOptions = axios.get(`${API_BASE_URL}/catalog/options`)
        .then(response => response.data.data)
        .finally(() => { pendingOptions = null; });
    }
    return pendingOptions;
  },
};
