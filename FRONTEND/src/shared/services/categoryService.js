import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1';

export const categoryService = {
  getCategories: async (params = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
};
