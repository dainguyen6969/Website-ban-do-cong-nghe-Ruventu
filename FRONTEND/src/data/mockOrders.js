import pcTitan from '../storefront/assets/pc_titan.png';
import pcViper from '../storefront/assets/pc_viper.png';
import vga4090 from '../storefront/assets/vga_4090.png';
import keyboard from '../storefront/assets/kb_keychron.png';
import heroPc from '../assets/hero.png';
import { seedCustomers } from './mockCustomers';

export const orderStatuses = [
  'Chờ đóng gói',
  'Chờ duyệt',
  'Chờ lấy hàng',
  'Đang đóng gói',
  'Đang giao hàng',
  'Đã hủy',
  'Hoàn thành',
];

const images = [pcTitan, pcViper, vga4090, keyboard, heroPc];
const totals = [25020000, 4980000, 22885000, 41020000, 66025000, 75990000, 13020000, 48990000, 7520000, 6005000, 5480000, 15505000, 9520000, 18990000, 32450000];
const times = ['08:20', '09:00', '10:00', '11:32', '13:40', '14:20', '15:45', '16:00'];

const statusConfig = {
  'Chờ đóng gói': { payment: 'Chưa thanh toán', packing: 'Đang đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chưa giao' },
  'Chờ duyệt': { payment: 'Chưa thanh toán', packing: 'Chưa đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chưa giao' },
  'Chờ lấy hàng': { payment: 'Đã thanh toán', packing: 'Đã đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chờ lấy hàng' },
  'Đang đóng gói': { payment: 'Đã thanh toán', packing: 'Đang đóng gói', warehouse: 'Chưa xuất kho', delivery: 'Chưa giao' },
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

export const mockOrders = Array.from({ length: 100 }, (_, index) => {
  const sequence = index + 1;
  const customer = sequence % 10 === 0
    ? null
    : sequence === 1 || sequence === 8
      ? seedCustomers[0]
      : seedCustomers[(index % (seedCustomers.length - 1)) + 1];
  const status = sequence === 1 || sequence === 8 ? 'Hoàn thành' : orderStatuses[index % orderStatuses.length];
  const config = statusConfig[status];
  const date = toDateParts(Math.floor(index / 2));
  return {
    id: `ORD-2026-${String(sequence).padStart(3, '0')}`,
    image: images[index % images.length],
    type: sequence % 4 === 0 ? 'Tại quầy' : 'Online',
    createdDate: sequence === 1 ? '10/09/2026' : sequence === 8 ? '20/08/2026' : date.display,
    createdIso: sequence === 1 ? '2026-09-10' : sequence === 8 ? '2026-08-20' : date.iso,
    createdTime: times[index % times.length],
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? 'Khách vãng lai',
    customerPhone: customer?.phone ?? '',
    status,
    payment: config.payment,
    packing: config.packing,
    warehouse: config.warehouse,
    delivery: config.delivery,
    total: sequence === 1 ? 25020000 : sequence === 8 ? 5500000 : totals[index % totals.length] + Math.floor(index / totals.length) * 150000,
  };
});

export const formatMoney = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;

export const getOrderById = (orderId) => mockOrders.find((order) => order.id === orderId);

export const getOrdersForCustomer = (customerId) => mockOrders.filter((order) => order.customerId === customerId);
