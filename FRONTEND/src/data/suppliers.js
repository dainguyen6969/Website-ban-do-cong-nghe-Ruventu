import { suppliers as purchaseSuppliers } from './purchaseOrders';
import { readSharedState, writeSharedState } from '../sync/adminSync';

export const SUPPLIER_STORAGE_KEY = 'ruventu_suppliers';
export const SUPPLIER_SYNC_SLICE = 'suppliers';

const seedSuppliers = purchaseSuppliers.map((supplier, index) => ({
  id: supplier.id,
  tenNhaCungCap: supplier.name,
  soDienThoai: supplier.phone,
  email: supplier.email,
  diaChi: supplier.address,
  trangThai: index === 4 ? 'ngung_hop_tac' : 'dang_hop_tac',
  createdAt: new Date(2024, 7, index + 1).toISOString(),
}));

export function getSuppliers() {
  const saved = readSharedState(SUPPLIER_STORAGE_KEY, null);
  if (Array.isArray(saved)) return saved;
  localStorage.setItem(SUPPLIER_STORAGE_KEY, JSON.stringify(seedSuppliers));
  return seedSuppliers;
}

export function saveSuppliers(suppliers, action, entityId) {
  writeSharedState(SUPPLIER_STORAGE_KEY, suppliers, {
    slice: SUPPLIER_SYNC_SLICE,
    action,
    entityId,
  });
}

export function generateSupplierId(suppliers) {
  const maximum = suppliers.reduce((current, supplier) => {
    const match = /^NCC-(\d+)$/i.exec(supplier.id);
    return Math.max(current, match ? Number(match[1]) : 0);
  }, 0);
  return `NCC-${String(maximum + 1).padStart(3, '0')}`;
}

export function formatSupplierStatus(status) {
  return status === 'dang_hop_tac' ? 'ĐANG HỢP TÁC' : 'NGỪNG HỢP TÁC';
}
