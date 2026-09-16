export const suppliers = [
  { id: 'NCC-ASUS-VN', name: 'ASUS Vietnam Co., Ltd', phone: '024 3941 5678', email: 'import@asus-vn.com.vn', address: '123 Láng Hạ, Ba Đình, Hà Nội' },
  { id: 'NCC-MSI-VN', name: 'MSI Vietnam Distribution', phone: '028 3822 4455', email: 'b2b@msi-vietnam.com', address: '45 Điện Biên Phủ, Bình Thạnh, TP.HCM' },
  { id: 'NCC-INTEL-VN', name: 'Intel Products Vietnam', phone: '024 3715 9900', email: 'channel@intel-vn.com', address: '18 Hoàng Đạo Thúy, Cầu Giấy, Hà Nội' },
  { id: 'NCC-SAM-SEA', name: 'Samsung Semiconductor SEA', phone: '028 3910 1234', email: 'semiconductor@samsung.com.vn', address: '2 Hải Triều, Quận 1, TP.HCM' },
  { id: 'NCC-CORSAIR', name: 'Corsair APAC Pte. Ltd', phone: '028 7300 6688', email: 'sales.apac@corsair.com', address: '72 Lê Thánh Tôn, Quận 1, TP.HCM' },
  { id: 'NCC-AMD-VN', name: 'AMD Vietnam Representative', phone: '024 7308 6868', email: 'partner.vn@amd.com', address: '54 Liễu Giai, Ba Đình, Hà Nội' },
  { id: 'NCC-GIGA-VN', name: 'Gigabyte Technology Vietnam', phone: '028 7305 7788', email: 'distribution@gigabyte.vn', address: '29 Nguyễn Đình Chiểu, Quận 3, TP.HCM' },
  { id: 'NCC-KING-VN', name: 'Kingston Technology Vietnam', phone: '024 3200 8899', email: 'channel@kingston.com.vn', address: '89 Láng Hạ, Đống Đa, Hà Nội' },
];

export const warehouses = [
  { id: 'KHO-HN', name: 'Kho Hà Nội' },
  { id: 'KHO-HCM', name: 'Kho Hồ Chí Minh' },
  { id: 'KHO-ĐN', name: 'Kho Đà Nẵng' },
];

export const purchasableProducts = [
  { id: 'pv-4090-strix', name: 'ASUS ROG Strix RTX 4090 OC 24GB', variant: 'OC Edition', sku: 'pv-4090-strix' },
  { id: 'pv-4090-tuf', name: 'ASUS TUF Gaming RTX 4090 OC 24GB', variant: 'TUF OC', sku: 'pv-4090-tuf' },
  { id: 'pv-4080s-gxs', name: 'MSI RTX 4080 SUPER Gaming X Slim 16GB', variant: 'Gaming X Slim', sku: 'pv-4080s-gxs' },
  { id: 'pv-4070s-gxs', name: 'MSI RTX 4070 SUPER Gaming X Slim 12GB', variant: 'Gaming X Slim', sku: 'pv-4070s-gxs' },
  { id: 'pv-4070ti-tuf', name: 'ASUS TUF Gaming RTX 4070 Ti SUPER OC 16GB', variant: 'TUF OC', sku: 'pv-4070ti-tuf' },
  { id: 'pv-i7-14700k', name: 'Intel Core i7-14700K Box - LGA1700', variant: 'Box chính hãng', sku: 'pv-i7-14700k' },
  { id: 'pv-990pro-2tb', name: 'Samsung 990 PRO NVMe SSD 2TB', variant: '2TB', sku: 'pv-990pro-2tb' },
  { id: 'pv-ddr5-64', name: 'Corsair Dominator DDR5 64GB 6400MHz', variant: '2 × 32GB', sku: 'pv-ddr5-64' },
];

const item = (productId, qty, unitPrice, received = 0, returned = 0) => ({
  ...purchasableProducts.find((product) => product.id === productId), qty, unitPrice, received, returned,
});

const seedOrders = [
  ['PN-2026-001', 0, 'Đã nhập kho', 'Đã trả', '25/08/2026', [item('pv-4090-strix', 1, 249900000, 1)], 274890000],
  ['PN-2026-002', 1, 'Đã duyệt', 'Trả một phần', '02/09/2026', [item('pv-4080s-gxs', 20, 12990000)], 155880000],
  ['PN-2026-003', 2, 'Đặt hàng', 'Chưa trả', '05/09/2026', [item('pv-i7-14700k', 15, 8990000)], 0],
  ['PN-2026-004', 3, 'Đã nhập kho', 'Đã trả', '20/08/2026', [item('pv-990pro-2tb', 10, 9950000, 10)], 109450000],
  ['PN-2026-005', 4, 'Đã nhập kho', 'Trả một phần', '18/08/2026', [item('pv-ddr5-64', 10, 8670000, 10)], 40000000],
  ['PN-2026-006', 5, 'Đã hủy', 'Chưa trả', '10/08/2026', [item('pv-4070s-gxs', 8, 11851250)], 0],
  ['PN-2026-007', 0, 'Đã duyệt', 'Chưa trả', '07/09/2026', [item('pv-4090-tuf', 8, 22781250)], 0],
  ['PN-2026-008', 2, 'Hoàn trả một phần', 'Trả một phần', '01/08/2026', [item('pv-i7-14700k', 16, 8617500, 16, 2)], 70000000],
  ['PN-2026-009', 3, 'Đặt hàng', 'Chưa trả', '06/09/2026', [item('pv-990pro-2tb', 15, 9306666)], 0],
  ['PN-2026-010', 1, 'Hoàn trả toàn bộ', 'Đã trả', '29/07/2026', [item('pv-4070ti-tuf', 4, 12980000, 4, 4)], 57112000],
].map(([id, supplierIndex, status, paymentStatus, createdAt, items, paid]) => ({
  id, supplierId: suppliers[supplierIndex].id, warehouseId: supplierIndex === 1 ? 'KHO-HCM' : 'KHO-HN', status, paymentStatus, createdAt, items, vat: true, paid,
}));

const STORAGE_KEY = 'ruventu_purchase_orders_v1';
export const totalGoods = (order) => order.items.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);
export const totalOrder = (order) => Math.round(totalGoods(order) * (order.vat ? 1.1 : 1));
export const getSupplier = (id) => suppliers.find((supplier) => supplier.id === id);
export const getWarehouse = (id) => warehouses.find((warehouse) => warehouse.id === id);

export function getPurchaseOrders() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(saved)) return saved; } catch { /* use seed */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedOrders));
  return seedOrders;
}

export function savePurchaseOrders(orders, action = 'updated', entityId = null) {
  writeSharedState(STORAGE_KEY, orders, { slice: 'purchase-orders', action, entityId });
}
export function getPurchaseOrder(id) { return getPurchaseOrders().find((order) => order.id === id); }
export function updatePurchaseOrder(id, updater) {
  const orders = getPurchaseOrders();
  const next = orders.map((order) => order.id === id ? updater(order) : order);
  savePurchaseOrders(next, 'updated', id); return next.find((order) => order.id === id);
}

export function createPurchaseOrder(data) {
  const orders = getPurchaseOrders();
  const max = orders.reduce((value, order) => Math.max(value, Number(order.id.split('-').pop()) || 0), 0);
  const order = { ...data, id: `PN-2026-${String(max + 1).padStart(3, '0')}`, createdAt: new Date().toLocaleDateString('vi-VN'), status: 'Đặt hàng', paymentStatus: 'Chưa trả', paid: 0 };
  savePurchaseOrders([order, ...orders], 'created', order.id); return order;
}
import { writeSharedState } from '../sync/adminSync';
