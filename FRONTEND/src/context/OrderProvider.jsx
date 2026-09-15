import { useMemo, useState } from 'react';
import OrderContext from './orderContext';
import { formatOrderTimestamp, mockOrders } from '../data/mockOrders';

export default function OrderProvider({ children }) {
  const [orders, setOrders] = useState(mockOrders);

  const patchOrder = (orderId, patch, history) => {
    setOrders((current) => current.map((order) => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        ...patch,
        history: history
          ? [...order.history, { timestamp: formatOrderTimestamp(), ...history }]
          : order.history,
      };
    }));
  };

  const cancelOrder = (orderId, reason) => patchOrder(orderId, {
    status: 'Đã hủy',
    packing: 'Hủy đóng gói',
    cancellationReason: reason.trim(),
  }, {
    title: 'HỦY ĐƠN HÀNG',
    description: reason.trim() || 'Đơn hàng đã được hủy bởi quản trị viên',
    tone: 'red',
  });

  const confirmPayment = (orderId) => patchOrder(orderId, {
    payment: 'Đã thanh toán',
    transactionCode: `PAY-${Date.now().toString().slice(-8)}`,
  }, {
    title: 'XÁC NHẬN THANH TOÁN',
    description: 'Đã xác nhận thanh toán cho đơn hàng',
    tone: 'green',
  });

  const completePacking = (orderId) => patchOrder(orderId, {
    status: 'Chờ lấy hàng',
    packing: 'Đã đóng gói',
  }, {
    title: 'HOÀN TẤT ĐÓNG GÓI',
    description: 'Sản phẩm đã đóng gói và sẵn sàng bàn giao vận chuyển',
    tone: 'green',
  });

  const cancelPacking = (orderId) => patchOrder(orderId, {
    packing: 'Hủy đóng gói',
  }, {
    title: 'HỦY ĐÓNG GÓI',
    description: 'Quy trình đóng gói đã được hủy',
    tone: 'red',
  });

  const value = useMemo(() => ({
    orders,
    cancelOrder,
    confirmPayment,
    completePacking,
    cancelPacking,
  }), [orders]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
