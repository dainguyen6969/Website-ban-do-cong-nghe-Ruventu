import { readSharedState, writeSharedState } from '../sync/adminSync';

export const SHIPPING_PARTNER_STORAGE_KEY = 'ruventu_shipping_partners';
export const SHIPPING_PARTNER_SYNC_SLICE = 'shipping-partners';

const seedPartners = [
  ['DTVC000001', 'Nguyễn Văn Minh', '0901 234 567', 'SHIP_CA_NHAN', 'minh@example.com', 'Hà Nội', 'Giao hàng nội thành', 'hoat_dong'],
  ['DTVC000002', 'Trần Thị Bích Ngọc', '0912 345 678', 'SHIP_CUA_HANG', 'ngoc.tran@gmail.com', 'TP. Hồ Chí Minh', '', 'hoat_dong'],
  ['DTVC000003', 'Lê Quang Dũng', '0923 456 789', 'SHIP_CA_NHAN', '', 'Đà Nẵng', '', 'hoat_dong'],
  ['DTVC000004', 'Phạm Hữu Tài', '0934 567 890', 'SHIP_CUA_HANG', 'tai.pham@ship.vn', 'Hải Phòng', '', 'hoat_dong'],
  ['DTVC000005', 'Hoàng Văn An', '0945 678 901', 'SHIP_CA_NHAN', 'an.hoang@freelance.vn', 'Cần Thơ', 'Tạm ngừng nhận đơn', 'ngung_hoat_dong'],
  ['DTVC000006', 'Vận Chuyển Nhanh 24H', '028 1234 5678', 'SHIP_CUA_HANG', 'lienhe@vcnhanh.vn', 'TP. Hồ Chí Minh', '', 'hoat_dong'],
].map(([id, tenDoiTac, soDienThoai, loaiDoiTac, email, diaChi, ghiChu, trangThai], index) => ({
  id, tenDoiTac, soDienThoai, loaiDoiTac, email, diaChi, ghiChu, trangThai,
  createdAt: new Date(2026, 7, index + 1, 9, 0).toISOString(),
  updatedAt: new Date(2026, 7, index + 1, 9, 0).toISOString(),
}));

export function getShippingPartners() {
  const stored = readSharedState(SHIPPING_PARTNER_STORAGE_KEY, null);
  if (Array.isArray(stored)) return stored.map((partner) => ({ ...partner, loaiDoiTac: partner.loaiDoiTac?.toUpperCase() }));
  localStorage.setItem(SHIPPING_PARTNER_STORAGE_KEY, JSON.stringify(seedPartners));
  return seedPartners;
}

export function saveShippingPartners(partners, action, entityId) {
  writeSharedState(SHIPPING_PARTNER_STORAGE_KEY, partners, {
    slice: SHIPPING_PARTNER_SYNC_SLICE,
    action,
    entityId,
  });
}

export function generateShippingPartnerId(partners) {
  const maximum = partners.reduce((current, partner) => {
    const match = /^DTVC(\d{6})$/i.exec(partner.id);
    return Math.max(current, match ? Number(match[1]) : 0);
  }, 0);
  return `DTVC${String(maximum + 1).padStart(6, '0')}`;
}

export const formatPartnerType = (type) => type === 'SHIP_CUA_HANG' ? 'Ship cửa hàng' : 'Ship cá nhân';
export const formatPartnerStatus = (status) => status === 'hoat_dong' ? 'HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG';
