export const SERIAL_STATUSES = ['Đã bán', 'Trong kho', 'Đang bảo hành', 'Lỗi'];

export const SERIAL_STATUS_META = {
  'Đã bán': {
    key: 'sold',
    description: 'Sản phẩm đã được xuất bán và kích hoạt bảo hành.',
  },
  'Trong kho': {
    key: 'stock',
    description: 'Sản phẩm đang trong kho, chưa bán.',
  },
  'Đang bảo hành': {
    key: 'warranty',
    description: 'Sản phẩm đang được tiếp nhận và xử lý bảo hành.',
  },
  'Lỗi': {
    key: 'error',
    description: 'Sản phẩm được ghi nhận lỗi và đang chờ xử lý.',
  },
};

// 15 serials: Trong kho 6 / Đã bán 5 / Đang bảo hành 1 / Lỗi 3.
const seedSerials = [
  { id: 'G4080S-VN4521', serial: 'G4080S-VN4521', version: 'MSI GeForce RTX 4080 Super Gaming X Trio', sku: 'VGA-4080S-XT', barcode: '8931234500159', status: 'Đã bán', activatedAt: '15/08/2024', warrantyUntil: '15/08/2027', warehouse: 'Kho HCM', importedAt: '02/08/2024' },
  { id: 'RZ00-7900X-VN001', serial: 'RZ00-7900X-VN001', version: 'AMD Ryzen 9 7950X – Tray', sku: 'CPU-R9-7950X', barcode: '8931234500067', status: 'Đã bán', activatedAt: '21/08/2024', warrantyUntil: '21/08/2027', warehouse: 'Kho Hà Nội', importedAt: '18/07/2024' },
  { id: 'MZV9P2T0BAH-000', serial: 'MZV9P2T0BAH-000', version: 'Samsung 990 Pro NVMe – 2TB', sku: 'SSD-990P-2TB', barcode: '8931234500081', status: 'Đang bảo hành', activatedAt: '04/04/2024', warrantyUntil: '04/04/2029', warehouse: 'Kho Đà Nẵng', importedAt: '12/03/2024' },
  { id: 'Q1P-BLK-240801', serial: 'Q1P-BLK-240801', version: 'Keychron Q1 Pro – Bản Đen', sku: 'K-Q1P-BLK', barcode: '8931234500043', status: 'Trong kho', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Hà Nội', importedAt: '20/08/2024' },
  { id: 'Q1P-BLK-240802', serial: 'Q1P-BLK-240802', version: 'Keychron Q1 Pro – Bản Đen', sku: 'K-Q1P-BLK', barcode: '8931234500043', status: 'Trong kho', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Hà Nội', importedAt: '20/08/2024' },
  { id: 'I914-VN-00041', serial: 'I914-VN-00041', version: 'Intel Core i9-14900K – Box', sku: 'CPU-I9-14', barcode: '8931234500050', status: 'Trong kho', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho HCM', importedAt: '24/08/2024' },
  { id: 'Z790H-VN-10021', serial: 'Z790H-VN-10021', version: 'ASUS ROG Maximus Z790 Hero WiFi', sku: 'MB-Z790-HERO', barcode: '8931234500104', status: 'Trong kho', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Đà Nẵng', importedAt: '09/08/2024' },
  { id: 'LG27GR-00318', serial: 'LG27GR-00318', version: 'Màn hình LG UltraGear 27GR95QE-B', sku: 'MON-LG-27GR95', barcode: '8931234500111', status: 'Trong kho', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Hà Nội', importedAt: '28/08/2024' },
  { id: 'EVGA-G6-01008', serial: 'EVGA-G6-01008', version: 'EVGA SuperNOVA 1000W G6 80+ Gold', sku: 'PSU-1000-G6', barcode: '8931234500128', status: 'Trong kho', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho HCM', importedAt: '16/08/2024' },
  { id: '4090OC-VN-8821', serial: '4090OC-VN-8821', version: 'VGA ASUS ROG Strix RTX 4090 OC 24GB', sku: 'VGA-4090-OC', barcode: '8931234500012', status: 'Đã bán', activatedAt: '11/06/2024', warrantyUntil: '11/06/2027', warehouse: 'Kho Hà Nội', importedAt: '30/05/2024' },
  { id: 'RAM16-VN-73014', serial: 'RAM16-VN-73014', version: 'RAM Corsair Vengeance 16GB DDR5', sku: 'RAM-COR-16', barcode: '8939999900031', status: 'Đã bán', activatedAt: '08/07/2024', warrantyUntil: '08/07/2027', warehouse: 'Kho Đà Nẵng', importedAt: '22/06/2024' },
  { id: 'O11D-BLK-9032', serial: 'O11D-BLK-9032', version: 'Lian Li O11 Dynamic EVO – Black', sku: 'CASE-O11D-BLK', barcode: '8931234500135', status: 'Đã bán', activatedAt: '25/08/2024', warrantyUntil: '25/08/2026', warehouse: 'Kho Đà Nẵng', importedAt: '01/08/2024' },
  { id: '4090OC-ERR-017', serial: '4090OC-ERR-017', version: 'VGA ASUS ROG Strix RTX 4090 OC 24GB', sku: 'VGA-4090-OC', barcode: '8931234500012', status: 'Lỗi', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Hà Nội', importedAt: '30/05/2024' },
  { id: 'PC-CR-ERR-004', serial: 'PC-CR-ERR-004', version: 'PC Creator Ryzen 9 RTX 4080 Super', sku: 'PC-CREATOR-01', barcode: '8931234500142', status: 'Lỗi', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Hà Nội', importedAt: '17/08/2024' },
  { id: 'Q1P-SLV-ERR-09', serial: 'Q1P-SLV-ERR-09', version: 'Keychron Q1 Pro – Bản Bạc', sku: 'K-Q1P-SLV', barcode: '8931234500098', status: 'Lỗi', activatedAt: '-', warrantyUntil: '-', warehouse: 'Kho Hà Nội', importedAt: '20/08/2024' },
];

export let mockSerials = readSharedState(STORAGE_KEY, seedSerials);

export function getMockSerials() {
  mockSerials = readSharedState(STORAGE_KEY, seedSerials);
  return mockSerials.map((serial) => ({ ...serial }));
}

export function getSerialById(id) {
  mockSerials = readSharedState(STORAGE_KEY, seedSerials);
  return mockSerials.find((item) => item.id === id);
}

export function updateSerialStatus(id, status) {
  const serial = getSerialById(id);
  if (serial) serial.status = status;
  writeSharedState(STORAGE_KEY, mockSerials, { slice: 'serials', action: 'status-updated', entityId: id });
  return serial;
}
import { readSharedState, writeSharedState } from '../sync/adminSync';

const STORAGE_KEY = 'ruventu_serials_v1';
