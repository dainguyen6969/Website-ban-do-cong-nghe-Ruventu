import mockVersions from './mockVersions';
import { writeSharedState } from '../sync/adminSync';

const STORAGE_KEY = 'ruventu_stock_checks_v1';
const STOCK_KEY = 'ruventu_stock_adjustments_v1';

const seedStockChecks = [
  { id: 'PKKH-2026-001', versionId: 'VER-VGA-4090-OC', productName: 'ASUS ROG Strix RTX 4090 OC 24GB', sku: 'SP-VGA-001', variant: 'RTX 4090 OC 24GB', barcode: '8938505970011', systemStock: 10, adjustedStock: 8, reason: 'Hư hỏng', customReason: '', status: 'Đang kiểm', warehouse: 'Kho Hà Nội', createdAt: '2026-09-05', checkedAt: '2026-09-05T14:00' },
  { id: 'PKKH-2026-002', versionId: 'VER-CPU-I9-14', productName: 'Intel Core i7-14700K Box - LGA1700', sku: 'SP-CPU-002', variant: 'Core i7-14700K Box', barcode: '5032037278485', systemStock: 5, adjustedStock: 5, reason: '', customReason: '', status: 'Đã cân bằng', warehouse: 'Kho HCM', createdAt: '2026-09-01', checkedAt: '2026-09-01T10:30' },
  { id: 'PKKH-2026-003', versionId: 'VER-CPU-R9-7950X', productName: 'AMD Ryzen 7 9700X AM5 - 8 nhân/16 luồng', sku: 'SP-CPU-005', variant: 'Ryzen 7 9700X AM5', barcode: '730143316088', systemStock: 12, adjustedStock: 11, reason: 'Thất lạc', customReason: '', status: 'Đã hủy', warehouse: 'Kho Đà Nẵng', createdAt: '2026-08-25', checkedAt: '2026-08-25T09:00' },
  { id: 'PKKH-2026-004', versionId: 'VER-SSD-990P-2TB', productName: 'Samsung 990 PRO NVMe 1TB M.2 PCIe 4.0', sku: 'SP-SSD-001', variant: '990 PRO 1TB', barcode: '8806094215021', systemStock: 22, adjustedStock: 22, reason: '', customReason: '', status: 'Đã cân bằng', warehouse: 'Kho Hà Nội', createdAt: '2026-08-20', checkedAt: '2026-08-20T15:00' },
  { id: 'PKKH-2026-005', versionId: 'VER-KEY-Q1P-BLK', productName: 'Samsung 990 PRO NVMe 2TB M.2 PCIe 4.0', sku: 'SP-SSD-002', variant: '990 PRO 2TB', barcode: '8806094215038', systemStock: 9, adjustedStock: 9, reason: '', customReason: '', status: 'Đang kiểm', warehouse: 'Kho HCM', createdAt: '2026-09-07', checkedAt: '2026-09-07T11:00' },
  { id: 'PKKH-2026-006', versionId: 'VER-RAM-CORSAIR-16', productName: 'WD Black SN850X NVMe 1TB M.2 PCIe 4.0', sku: 'SP-SSD-003', variant: 'SN850X 1TB', barcode: '718037891224', systemStock: 15, adjustedStock: 15, reason: '', customReason: '', status: 'Đang kiểm', warehouse: 'Kho Đà Nẵng', createdAt: '2026-09-06', checkedAt: '2026-09-06T16:30' },
  { id: 'PKKH-2026-007', versionId: 'VER-MB-Z790-HERO', productName: 'AMD Ryzen 7 7800X3D AM5 - 8 nhân/16 luồng', sku: 'SP-CPU-004', variant: 'Ryzen 7 7800X3D AM5', barcode: '730143314930', systemStock: 18, adjustedStock: 18, reason: '', customReason: '', status: 'Đã cân bằng', warehouse: 'Kho Hà Nội', createdAt: '2026-08-18', checkedAt: '2026-08-18T14:00' },
  { id: 'PKKH-2026-008', versionId: 'VER-PSU-EVGA-1000', productName: 'Kingston Fury Beast DDR5-6000 32GB (2x16GB)', sku: 'SP-RAM-001', variant: 'DDR5-6000 32GB', barcode: '740617337143', systemStock: 20, adjustedStock: 20, reason: '', customReason: '', status: 'Đang kiểm', warehouse: 'Kho HCM', createdAt: '2026-09-08', checkedAt: '2026-09-08T09:30' },
];

export function getStockChecks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch { /* use seed data */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedStockChecks));
  return seedStockChecks;
}

export function saveStockChecks(checks, action = 'updated', entityId = null) {
  writeSharedState(STORAGE_KEY, checks, { slice: 'stock-checks', action, entityId });
}
export function getStockCheck(id) { return getStockChecks().find((check) => check.id === id); }

export function createStockCheck(data) {
  const checks = getStockChecks();
  const maxId = checks.reduce((max, check) => Math.max(max, Number(check.id.split('-').pop()) || 0), 0);
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const check = { ...data, id: `PKKH-${now.getFullYear()}-${String(maxId + 1).padStart(3, '0')}`, status: 'Đang kiểm', createdAt: localDate };
  saveStockChecks([check, ...checks], 'created', check.id);
  return check;
}

export function updateStockCheck(id, changes) {
  const next = getStockChecks().map((check) => check.id === id ? { ...check, ...changes } : check);
  saveStockChecks(next, 'updated', id);
  return next.find((check) => check.id === id);
}

function getStockOverrides() {
  try { return JSON.parse(localStorage.getItem(STOCK_KEY)) || {}; } catch { return {}; }
}

export function getStockVersions() {
  const overrides = getStockOverrides();
  return mockVersions.map((version) => ({ ...version, actual: overrides[version.id] ?? version.actual }));
}

export function updateVersionStock(versionId, actual) {
  const version = mockVersions.find((item) => item.id === versionId);
  if (version) version.actual = actual;
  writeSharedState(STOCK_KEY, { ...getStockOverrides(), [versionId]: actual }, { slice: 'stock-levels', action: 'adjusted', entityId: versionId });
}

export function findOpenCheck(versionId, excludedId = '') {
  return getStockChecks().find((check) => check.versionId === versionId && check.id !== excludedId && check.status === 'Đang kiểm');
}

export default seedStockChecks;
