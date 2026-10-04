import axios from 'axios';

const API_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '') + '/api/v1/orders';

const orderAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orderService = {
  // Tính trước đơn hàng (preview)
  previewCheckout: async (previewData) => {
    return await orderAxios.post('/checkout/preview', previewData);
  },

  submitCheckout: async (checkoutData) => {
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    return await orderAxios.post('/checkout', checkoutData, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
  },

  // Tra cứu đơn hàng (guest)
  trackOrder: async (orderCode, recipientPhone) => {
    return await orderAxios.get('/tracking', {
      params: { ma_don_hang: orderCode, sdt_nguoi_nhan: recipientPhone }
    });
  }
};
