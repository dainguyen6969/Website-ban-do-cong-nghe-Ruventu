export const NOTIFICATION_CATEGORIES = [
  ['NEW_ORDER', 'Đơn hàng mới'],
  ['ORDER_STATUS', 'Trạng thái đơn hàng thay đổi'],
  ['RECEIPT', 'Phiếu thu'],
  ['PURCHASE_ORDER', 'Nhập hàng'],
  ['SUPPLIER', 'Nhà cung cấp'],
  ['SHIPPING_PARTNER', 'Đối tác vận chuyển'],
];

export const READ_NOTIFICATION_TTL_MS = 30 * 60 * 1000;

export function addNotification(items, event) {
  if (
    !event ||
    !NOTIFICATION_CATEGORIES.some(([key]) => key === event.category) ||
    !Number.isSafeInteger(event.itemId) ||
    event.itemId <= 0 ||
    typeof event.id !== 'string' ||
    !event.id ||
    typeof event.title !== 'string' ||
    typeof event.description !== 'string' ||
    typeof event.occurredAt !== 'string' ||
    !Number.isFinite(Date.parse(event.occurredAt)) ||
    !Array.isArray(event.changes) ||
    !event.changes.every(
      (change) =>
        change &&
        typeof change.field === 'string' &&
        (change.before === null || typeof change.before === 'string') &&
        typeof change.after === 'string'
    )
  )
    return items;
  if (items.some((item) => item.eventIds.includes(event.id))) return items;
  const previous = items.find(
    (item) => item.category === event.category && item.itemId === event.itemId
  );
  const item = {
    ...event,
    unread: true,
    eventIds: [...(previous?.eventIds || []), event.id],
    changes: [
      ...(previous?.changes || []),
      ...event.changes.map((change) => ({ ...change, occurredAt: event.occurredAt })),
    ],
  };
  return [item, ...items.filter((entry) => entry !== previous)];
}

export function markNotificationsRead(items, category, itemId, now = Date.now()) {
  return items.map((item) =>
    item.category === category && (itemId === undefined || item.itemId === itemId)
      ? { ...item, unread: false, readAt: item.readAt ?? now }
      : item
  );
}

export function expireReadNotifications(items, now = Date.now()) {
  return items.filter(
    (item) => item.unread || item.readAt == null || now < item.readAt + READ_NOTIFICATION_TTL_MS
  );
}

export function notificationTarget(item) {
  switch (item.category) {
    case 'NEW_ORDER':
    case 'ORDER_STATUS':
      return { pathname: `/admin/don-hang/danh-sach-don-hang/${item.itemId}` };
    case 'RECEIPT':
      return { pathname: `/admin/so-quy-tien-mat/phieu-thu/${item.itemId}` };
    case 'PURCHASE_ORDER':
      return { pathname: `/kho-hang/nhap-hang/${item.itemId}` };
    case 'SUPPLIER':
      return {
        pathname: '/admin/khach-hang-doi-tac/nha-cung-cap',
        state: { supplierId: item.itemId },
      };
    case 'SHIPPING_PARTNER':
      return {
        pathname: '/admin/khach-hang-doi-tac/doi-tac-van-chuyen',
        state: { partnerId: item.itemId },
      };
    default:
      return null;
  }
}

const STATUS_LABELS = {
  HOAT_DONG: 'Hoạt động',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
  CHO_DUYET: 'Chờ duyệt',
  CHO_HANG: 'Chờ hàng',
  CHO_THANH_TOAN: 'Chờ thanh toán',
  CHO_DONG_GOI: 'Chờ đóng gói',
  CHO_LAY_HANG: 'Chờ lấy hàng',
  DANG_GIAO_HANG: 'Đang giao hàng',
  HOAN_THANH: 'Hoàn thành',
  HUY_HANG: 'Hủy hàng',
  CHUA_DONG_GOI: 'Chưa đóng gói',
  DANG_DONG_GOI: 'Đang đóng gói',
  DA_DONG_GOI: 'Đã đóng gói',
  HUY_DONG_GOI: 'Hủy đóng gói',
  CHUA_XUAT_KHO: 'Chưa xuất kho',
  DA_XUAT_KHO: 'Đã xuất kho',
  DA_HOAN_KHO: 'Đã hoàn kho',
  CHUA_THANH_TOAN: 'Chưa thanh toán',
  DA_THANH_TOAN: 'Đã thanh toán',
  DAT_HANG: 'Đặt hàng',
  DA_DUYET: 'Đã duyệt',
  DA_NHAP_KHO: 'Đã nhập kho',
  NHAP_MOT_PHAN: 'Nhập một phần',
  HOAN_TRA_MOT_PHAN: 'Hoàn trả một phần',
  HOAN_TRA_TOAN_BO: 'Hoàn trả toàn bộ',
  HUY: 'Đã hủy',
  CHUA_TRA: 'Chưa trả',
  TRA_MOT_PHAN: 'Trả một phần',
  DA_TRA: 'Đã trả',
};
export const notificationStatus = (value) =>
  value == null ? 'Mới tạo' : STATUS_LABELS[value] || 'Chưa xác định';
