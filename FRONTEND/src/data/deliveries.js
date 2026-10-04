import { readSharedState, writeSharedState } from '../sync/adminSync';
import { getStockVersions, updateVersionStock } from './mockStockChecks';

export const DELIVERY_STORAGE_KEY = 'ruventu_deliveries_v1';
export const DELIVERY_SYNC_SLICE = 'deliveries';

export const DELIVERY_STATUSES = [
  ['CHO_GIAO', 'Chờ giao'],
  ['DA_NHAN_HANG', 'Đã nhận hàng'],
  ['DANG_GIAO', 'Đang giao'],
  ['GIAO_THANH_CONG', 'Giao thành công'],
  ['GIAO_THAT_BAI', 'Giao thất bại'],
  ['CHO_HOAN_HANG', 'Chờ hoàn hàng'],
  ['DA_HOAN_HANG', 'Đã hoàn hàng'],
  ['HUY_GIAO_HANG', 'Hủy giao hàng'],
];

const seed = [
  ['PGH000118', 'ORD-2026-006', 'DTVC000004', '', 'CHO_GIAO', 7200000, 0, '2026-09-14T16:00:00'],
  ['PGH000115', 'ORD-2026-005', 'DTVC000002', 'VC000115', 'DA_NHAN_HANG', 5500000, 0, '2026-09-14T08:00:00'],
  ['PGH000112', 'ORD-2026-003', 'DTVC000001', 'VC000112', 'DANG_GIAO', 8900000, 30000, '2026-09-13T09:00:00'],
  ['PGH000101', 'ORD-2026-002', 'DTVC000002', 'VC000101', 'GIAO_THANH_CONG', 12000000, 0, '2026-09-11T13:00:00'],
  ['PGH000100', 'ORD-2026-001', 'DTVC000001', 'VC000100', 'GIAO_THANH_CONG', 25020000, 35000, '2026-09-10T15:00:00'],
  ['PGH000060', 'ORD-2026-007', 'DTVC000001', 'VC000060', 'CHO_HOAN_HANG', 0, 20000, '2026-09-09T10:00:00'],
  ['PGH000089', 'ORD-2026-009', 'DTVC000001', '', 'GIAO_THAT_BAI', 0, 25000, '2026-09-08T18:00:00'],
  ['PGH000095', 'ORD-2026-004', 'DTVC000003', 'VC000095', 'DA_HOAN_HANG', 0, 40000, '2026-09-09T14:00:00'],
  ['PGH000040', 'ORD-2026-010', 'DTVC000005', 'VC000040', 'HUY_GIAO_HANG', 0, 0, '2026-09-14T16:00:00'],
].map(([id, maDonHang, doiTacId, maVanDon, trangThaiGiao, cod, phiDoiTac, updatedAt]) => ({
  id, maDonHang, doiTacId, maVanDon, trangThaiGiao, cod, phiDoiTac, updatedAt,
}));

export function getDeliveries() {
  const stored = readSharedState(DELIVERY_STORAGE_KEY, null);
  if (Array.isArray(stored)) return stored.map((record) => ({ ...record, trangThaiGiao: record.trangThaiGiao?.toUpperCase().replace(/_PLACEHOLDER$/, '') }));
  writeSharedState(DELIVERY_STORAGE_KEY, seed, { slice: DELIVERY_SYNC_SLICE, action: 'seeded' });
  return seed;
}

export function updateDelivery(id, changes, action = 'updated') {
  const next = getDeliveries().map((record) => record.id === id
    ? { ...record, ...changes, updatedAt: new Date().toISOString() }
    : record);
  writeSharedState(DELIVERY_STORAGE_KEY, next, { slice: DELIVERY_SYNC_SLICE, action, entityId: id });
  return next.find((record) => record.id === id);
}

export function receiveReturnedStock(record, returnInfo) {
  const versions = getStockVersions();
  const adjustments = [];
  returnInfo.items.forEach((item) => {
    const good = Number(item.nguyenVen) || 0;
    if (!good) return;
    const version = versions.find((entry) => entry.barcode === item.barcode || entry.sku === item.barcode)
      || versions.find((entry) => item.name.toLocaleLowerCase('vi').includes(entry.displayName.toLocaleLowerCase('vi').split(' ')[0]));
    if (!version) return;
    updateVersionStock(version.id, Number(version.actual || 0) + good);
    adjustments.push({ versionId: version.id, quantity: good });
  });
  return adjustments;
}

export const deliveryStatusLabel = (value) => DELIVERY_STATUSES.find(([key]) => key === value)?.[1] || value;
export const deliveryStatusKey = (label) => DELIVERY_STATUSES.find(([, name]) => name === label)?.[0] || '';

