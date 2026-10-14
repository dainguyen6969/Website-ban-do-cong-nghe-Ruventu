import { progressSteps } from './mockData.js';

export const statusLabels = {
  'TIẾP NHẬN': 'Tiếp nhận', 'ĐANG KIỂM TRA': 'Đang kiểm tra',
  'ĐÃ GỬI BẢO HÀNH': 'Đã gửi bảo hành', 'ĐANG BẢO HÀNH': 'Đang bảo hành',
  'ĐÃ NHẬN LẠI': 'Đã nhận lại', 'CHỜ TRẢ KHÁCH': 'Chờ trả khách',
  'CHỜ ĐỔI SẢN PHẨM': 'Chờ đổi sản phẩm', 'HOÀN TẤT': 'Đã bàn giao thiết bị',
};
export const quoteStatuses = ['Bản nháp', 'Chờ khách phản hồi', 'Khách đã đồng ý', 'Khách đã từ chối', 'Hết hiệu lực'];
export const paymentStatuses = ['Chưa thanh toán', 'Thanh toán một phần', 'Đã thanh toán'];
export const refundStatuses = ['Không cần hoàn', 'Chờ hoàn tiền', 'Hoàn tiền một phần', 'Đã hoàn tiền'];

export function dateKey(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s|$)/.exec(value || '');
  if (!match) return '';
  const [, day, month, year] = match;
  const key = `${year}-${month}-${day}`;
  const parsed = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === key ? key : '';
}

export function filterWarranties(items, filters) {
  const keyword = (filters.search || '').trim().toLocaleLowerCase('vi-VN');
  return items.filter(item => {
    const text = [item.id, item.orderId, item.serial, item.trackingCode, item.customerName, item.customerPhone].join(' ').toLocaleLowerCase('vi-VN');
    if (keyword && !text.includes(keyword)) return false;
    for (const field of ['status', 'quoteStatus', 'paymentStatus', 'refundStatus']) {
      if (filters[field] && item[field] !== filters[field]) return false;
    }
    const date = dateKey(item.created);
    if ((filters.fromDate || filters.toDate) && !date) return false;
    return (!filters.fromDate || date >= filters.fromDate) && (!filters.toDate || date <= filters.toDate);
  });
}

export function nextStatus(status) {
  if (status === 'CHỜ TRẢ KHÁCH') return 'HOÀN TẤT';
  if (status === 'ĐÃ NHẬN LẠI') return 'CHỜ TRẢ KHÁCH';
  const index = progressSteps.indexOf(status);
  return index >= 0 ? progressSteps[index + 1] || null : null;
}

export function updateMockStatus(item, expectedStatus, target, note, confirmed) {
  if (!confirmed) throw new Error('Vui lòng xác nhận cập nhật trạng thái.');
  if (!item || item.status !== expectedStatus || nextStatus(item.status) !== target) {
    throw new Error('Trạng thái đã thay đổi hoặc bước chuyển không hợp lệ. Hãy mở lại thao tác.');
  }
  const updated = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  // Only actual actions in this mock session enter history; never infer past events from status.
  item.history = [{ time: updated, title: `Chuyển sang ${statusLabels[target]}`, description: note.trim() || 'Đã xác nhận cập nhật trạng thái.', actor: 'Quản trị viên', evidence: '—' }, ...(item.history || [])];
  item.status = target;
  item.updated = updated;
  return item;
}
