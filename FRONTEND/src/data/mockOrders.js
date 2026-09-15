import pcTitan from '../storefront/assets/pc_titan.png';
import pcViper from '../storefront/assets/pc_viper.png';
import vga4090 from '../storefront/assets/vga_4090.png';
import keyboard from '../storefront/assets/kb_keychron.png';
import heroPc from '../assets/hero.png';
import { seedCustomers } from './mockCustomers';

export const orderStatuses = ['Chờ duyệt', 'Chờ thanh toán', 'Chờ đóng gói', 'Chờ lấy hàng', 'Đang giao hàng', 'Hoàn thành', 'Đã hủy'];
export const orderTypeOptions = ['Tất cả', 'Online', 'Tại quầy'];
export const paymentOptions = ['Tất cả', 'Chưa thanh toán', 'Đã thanh toán'];
export const packingOptions = ['Tất cả', 'Chưa đóng gói', 'Đang đóng gói', 'Đã đóng gói', 'Hủy đóng gói'];
export const warehouseOptions = ['Tất cả', 'Chưa xuất kho', 'Đã xuất kho'];

const images = [pcTitan, pcViper, vga4090, keyboard, heroPc];
const productNames = [
  'ASUS ROG Strix GeForce RTX 4090 OC 24GB',
  'PC Gaming RUVENTU TITAN X',
  'PC Gaming RUVENTU VIPER S',
  'Bàn phím cơ Keychron K8 Pro',
  'Card đồ họa RTX hiệu năng cao',
];
const totals = [25020000, 4980000, 22885000, 41020000, 66025000, 75990000, 13020000, 48990000, 7520000, 6005000, 5480000, 15505000, 9520000, 18990000, 32450000];
const times = ['08:20', '09:00', '10:00', '11:32', '13:40', '14:20', '15:45', '16:00'];

const statusConfig = {
  'Chờ duyệt': { payment: 'Chưa thanh toán', packing: 'Chưa đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chưa giao' },
  'Chờ thanh toán': { payment: 'Chưa thanh toán', packing: 'Chưa đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chưa giao' },
  'Chờ đóng gói': { payment: 'Chưa thanh toán', packing: 'Đang đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chưa giao' },
  'Chờ lấy hàng': { payment: 'Đã thanh toán', packing: 'Đã đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chờ lấy hàng' },
  'Đang giao hàng': { payment: 'Đã thanh toán', packing: 'Đã đóng gói', warehouse: 'Đã xuất kho', delivery: 'Đang giao' },
  'Đã hủy': { payment: 'Chưa thanh toán', packing: 'Hủy đóng gói', warehouse: 'Chưa xuất kho', delivery: '—' },
  'Hoàn thành': { payment: 'Đã thanh toán', packing: 'Đã đóng gói', warehouse: 'Đã xuất kho', delivery: 'Đã giao' },
};

function toDateParts(offset) {
  const date = new Date(Date.UTC(2026, 8, 15));
  date.setUTCDate(date.getUTCDate() - offset);
  return {
    iso: date.toISOString().slice(0, 10),
    display: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date),
  };
}

export function formatOrderTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function createHistory(date, time, status) {
  const entries = [{ timestamp: `${date} ${time}`, title: 'TẠO ĐƠN HÀNG', description: 'Đơn hàng được tạo qua website', tone: 'red' }];
  if (status !== 'Chờ duyệt') entries.push({ timestamp: `${date} 10:05`, title: 'XÁC NHẬN ĐƠN', description: 'Hệ thống tự động xác nhận đơn hàng', tone: 'black' });
  if (['Chờ đóng gói', 'Chờ lấy hàng', 'Đang giao hàng', 'Hoàn thành'].includes(status)) {
    entries.push({ timestamp: `${date} 10:30`, title: 'BẮT ĐẦU ĐÓNG GÓI', description: 'Nhân viên kho bắt đầu đóng gói sản phẩm', tone: 'black' });
  }
  return entries;
}

export const mockOrders = Array.from({ length: 100 }, (_, index) => {
  const sequence = index + 1;
  const customer = sequence % 10 === 0 ? null : sequence === 1 || sequence === 8 ? seedCustomers[0] : seedCustomers[(index % (seedCustomers.length - 1)) + 1];
  const status = sequence === 1 ? 'Chờ đóng gói' : sequence === 8 ? 'Hoàn thành' : orderStatuses[index % orderStatuses.length];
  const config = statusConfig[status];
  const date = toDateParts(Math.floor(index / 2));
  const createdDate = sequence === 1 ? '07/09/2026' : sequence === 8 ? '20/08/2026' : date.display;
  const createdIso = sequence === 1 ? '2026-09-07' : sequence === 8 ? '2026-08-20' : date.iso;
  const total = sequence === 1 ? 25020000 : sequence === 8 ? 5500000 : totals[index % totals.length] + Math.floor(index / totals.length) * 150000;
  const shippingFee = sequence % 4 === 0 ? 0 : 30000;
  const productPrice = total - shippingFee;
  const productName = sequence === 1 ? productNames[0] : productNames[index % productNames.length];
  const customerName = customer?.name ?? 'Khách vãng lai';
  const customerPhone = customer?.phone ?? '';
  const customerAddress = customer?.address?.lines?.join(', ') || 'Nhận tại quầy RUVENTU';

  return {
    id: `ORD-2026-${String(sequence).padStart(3, '0')}`,
    image: images[index % images.length],
    type: sequence % 4 === 0 ? 'Tại quầy' : 'Online',
    createdDate,
    createdIso,
    createdTime: sequence === 1 ? '10:00' : times[index % times.length],
    customerId: customer?.id ?? null,
    customerName,
    customerPhone,
    status,
    payment: config.payment,
    paymentMethod: sequence % 4 === 0 ? 'Tiền mặt' : 'Chuyển khoản ngân hàng',
    transactionCode: config.payment === 'Đã thanh toán' ? `PAY-${String(sequence).padStart(6, '0')}` : '',
    packing: config.packing,
    warehouse: config.warehouse,
    delivery: config.delivery,
    shippingProvider: sequence % 4 === 0 ? '—' : 'GHN',
    trackingCode: config.warehouse === 'Đã xuất kho' ? `GHN${String(202600000 + sequence)}` : '',
    shippingFee,
    discount: 0,
    total,
    recipient: { name: customerName, phone: customerPhone, address: customerAddress },
    note: sequence === 1 ? 'Giao hàng buổi sáng trước 12h' : sequence % 3 === 0 ? 'Liên hệ khách hàng trước khi giao' : '—',
    products: [{
      image: images[index % images.length],
      name: productName,
      variant: sequence === 1 ? 'ROG STRIX OC Edition' : 'Phiên bản tiêu chuẩn',
      barcode: sequence === 1 ? 'RVT-VGA-RTX4090-STRIX-OC' : `RVT-SP-${String(sequence).padStart(5, '0')}`,
      unitPrice: productPrice,
      quantity: 1,
      subtotal: productPrice,
    }],
    history: createHistory(createdDate, sequence === 1 ? '10:00' : times[index % times.length], status),
  };
});

export const formatMoney = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
export const getOrderById = (orderId) => mockOrders.find((order) => order.id === orderId);
export const getOrdersForCustomer = (customerId) => mockOrders.filter((order) => order.customerId === customerId);
