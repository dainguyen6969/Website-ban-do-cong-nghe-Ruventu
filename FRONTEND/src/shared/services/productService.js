import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export const productService = {
  getProducts: async (params = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  getProductDetail: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product detail:', error);
      throw error;
    }
  },

  getProductVariantDetail: async (productId, variantId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}/variants/${variantId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product variant:', error);
      throw error;
    }
  }
};
