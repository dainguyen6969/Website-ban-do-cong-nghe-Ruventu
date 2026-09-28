import { readSharedState, writeSharedState } from '../sync/adminSync';

export const SUPPLIER_STORAGE_KEY = 'ruventu_suppliers';
export const SUPPLIER_SYNC_SLICE = 'suppliers';

const seedSuppliers = [
  ['NCC-ASUS-VN', 'ASUS Vietnam Co., Ltd', '024 3941 5678', 'import@asus-vn.com.vn', '123 Láng Hạ, Ba Đình, Hà Nội'],
  ['NCC-MSI-VN', 'MSI Vietnam Distribution', '028 3822 4455', 'b2b@msi-vietnam.com', '45 Điện Biên Phủ, Bình Thạnh, TP.HCM'],
  ['NCC-INTEL-VN', 'Intel Products Vietnam', '024 3715 9900', 'channel@intel-vn.com', '18 Hoàng Đạo Thúy, Cầu Giấy, Hà Nội'],
  ['NCC-SAM-SEA', 'Samsung Semiconductor SEA', '028 3910 1234', 'semiconductor@samsung.com.vn', '2 Hải Triều, Quận 1, TP.HCM'],
  ['NCC-CORSAIR', 'Corsair APAC Pte. Ltd', '028 7300 6688', 'sales.apac@corsair.com', '72 Lê Thánh Tôn, Quận 1, TP.HCM'],
  ['NCC-AMD-VN', 'AMD Vietnam Representative', '024 7308 6868', 'partner.vn@amd.com', '54 Liễu Giai, Ba Đình, Hà Nội'],
  ['NCC-GIGA-VN', 'Gigabyte Technology Vietnam', '028 7305 7788', 'distribution@gigabyte.vn', '29 Nguyễn Đình Chiểu, Quận 3, TP.HCM'],
  ['NCC-KING-VN', 'Kingston Technology Vietnam', '024 3200 8899', 'channel@kingston.com.vn', '89 Láng Hạ, Đống Đa, Hà Nội'],
].map(([id, name, phone, email, address], index) => ({
  id, tenNhaCungCap: name, soDienThoai: phone, email, diaChi: address,
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
