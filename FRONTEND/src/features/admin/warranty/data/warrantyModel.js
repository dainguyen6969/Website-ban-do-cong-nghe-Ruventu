import { progressSteps, mockWarrantyData, mockWarrantyDevices, mockIntakeRequests } from './mockData.js';

export const statusLabels = {
  'TIẾP NHẬN': 'Tiếp nhận', 'ĐANG KIỂM TRA': 'Đang kiểm tra',
  'ĐÃ GỬI BẢO HÀNH': 'Đã gửi bảo hành', 'ĐANG BẢO HÀNH': 'Đang bảo hành',
  'ĐÃ NHẬN LẠI': 'Đã nhận lại', 'CHỜ TRẢ KHÁCH': 'Chờ trả khách',
  'CHỜ ĐỔI SẢN PHẨM': 'Chờ đổi sản phẩm', 'HOÀN TẤT': 'Đã bàn giao thiết bị',
};
export const quoteStatuses = ['Bản nháp', 'Chờ khách phản hồi', 'Khách đã đồng ý', 'Khách đã từ chối', 'Hết hiệu lực'];
export const paymentStatuses = ['Chưa thanh toán', 'Thanh toán một phần', 'Đã thanh toán'];
export const refundStatuses = ['Không cần hoàn', 'Chờ hoàn tiền', 'Hoàn tiền một phần', 'Đã hoàn tiền'];

export const quickFilters = {
  'TẤT CẢ': [], 'MỚI TIẾP NHẬN': ['TIẾP NHẬN'], 'ĐANG KIỂM TRA': ['ĐANG KIỂM TRA'],
  'ĐANG XỬ LÝ': ['ĐÃ GỬI BẢO HÀNH', 'ĐANG BẢO HÀNH', 'ĐÃ NHẬN LẠI', 'CHỜ ĐỔI SẢN PHẨM'],
  'CHỜ TRẢ KHÁCH': ['CHỜ TRẢ KHÁCH'], 'HOÀN TẤT': ['HOÀN TẤT'],
};

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
    if (quickFilters[filters.quick]?.length && !quickFilters[filters.quick].includes(item.status)) return false;
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

const normalizeCode = value => String(value || '').trim().replace(/^#\s*/, '').toLocaleUpperCase('vi-VN');
const normalizePhone = value => String(value || '').replace(/[\s().-]/g, '').replace(/^(?:\+84|0084)/, '0');
export const intakeCriteria = { serial: 'Số serial', trackingCode: 'Mã theo dõi', requestId: 'ID yêu cầu tiếp nhận', orderId: 'Mã đơn hàng', customerPhone: 'Số điện thoại' };
export const eligibilityOptions = ['Chưa xác minh', 'Đủ điều kiện miễn phí', 'Không đủ điều kiện miễn phí'];
export const receiptNow = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16);

export function intakeRequestById(query) {
  return mockIntakeRequests.find(request => normalizeCode(request.id) === normalizeCode(query));
}

export function lookupWarrantyDevices(criterion, query) {
  if (!String(query || '').trim() || !Object.hasOwn(intakeCriteria, criterion)) return [];
  if (!(criterion === 'customerPhone' ? normalizePhone(query) : normalizeCode(query))) return [];
  if (criterion === 'requestId') {
    const request = intakeRequestById(query);
    return request ? mockWarrantyDevices.filter(device => device.key === request.deviceKey) : [];
  }
  if (criterion === 'trackingCode') {
    const tickets = mockWarrantyData.filter(item => normalizeCode(item.trackingCode) === normalizeCode(query));
    return mockWarrantyDevices.filter(device => tickets.some(item => item.serial ? item.serial === device.serial : item.trackingCode === device.trackingCode));
  }
  return mockWarrantyDevices.filter(device => criterion === 'customerPhone'
    ? normalizePhone(device.customerPhone) === normalizePhone(query)
    : normalizeCode(device[criterion]) === normalizeCode(query));
}

export function deviceIntakeBlocker(device) {
  if (!device) return 'Chọn thiết bị cần bảo hành.';
  if (!device.serial) return 'Cần chọn đúng một serial để lập phiếu bảo hành.';
  if (device.replacedBy) return `Serial cũ đã được thay bởi ${device.replacedBy}.`;
  if (device.returnLocked) return 'Thiết bị đang bị khóa bởi phiếu trả hàng.';
  if (mockWarrantyData.some(item => item.serial === device.serial && item.status !== 'HOÀN TẤT')) return 'Thiết bị đang có phiếu bảo hành hoạt động.';
  if (!['ĐÃ BÁN', 'HOÀN TẤT'].includes(device.serialStatus)) return 'Chưa xác nhận thiết bị đã được bán.';
  return '';
}

export function validateWarrantyIntake(device, form) {
  const errors = {};
  const blocker = deviceIntakeBlocker(device);
  if (blocker) errors.device = blocker;
  if (!eligibilityOptions.includes(form.eligibility)) errors.eligibility = 'Chọn đánh giá điều kiện miễn phí.';
  for (const [field, label] of [['verification', 'căn cứ xác minh'], ['reason', 'lý do bảo hành'], ['condition', 'tình trạng tiếp nhận']]) {
    if (!form[field]?.trim()) errors[field] = `Vui lòng nhập ${label}.`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(form.receivedAt || '');
  if (!match || !dateKey(`${match[3]}/${match[2]}/${match[1]}`) || Number(match[4]) > 23 || Number(match[5]) > 59 || form.receivedAt > receiptNow()) errors.receivedAt = 'Nhập thời điểm nhận hợp lệ, không ở tương lai.';
  if (form.accessories?.some(item => !item.name.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) errors.accessories = 'Nhập tên và số lượng phụ kiện nguyên dương.';
  return errors;
}

export function saveMockIntakeRequest(device, form, status, id) {
  if (!device || !mockWarrantyDevices.includes(device)) throw new Error('Chọn thiết bị từ kết quả tra cứu.');
  if (!form.verification?.trim()) throw new Error('Vui lòng nhập lý do/căn cứ xử lý yêu cầu.');
  if (!['Chờ xác minh', 'Từ chối tiếp nhận'].includes(status)) throw new Error('Trạng thái yêu cầu không hợp lệ.');
  const existing = mockIntakeRequests.find(item => item.id === id);
  if (existing?.status === 'Đã tiếp nhận') throw new Error('Yêu cầu đã được tiếp nhận.');
  const request = { id: existing?.id || String(Math.max(879, ...mockIntakeRequests.map(item => Number(item.id))) + 1), deviceKey: device.key, form: structuredClone(form), status };
  if (existing) Object.assign(existing, request); else mockIntakeRequests.push(request);
  return request;
}

export function createMockWarranty(serial, form, confirmed, requestId) {
  if (!confirmed) throw new Error('Vui lòng xác nhận trước khi tạo phiếu.');
  const device = typeof serial === 'string' ? mockWarrantyDevices.find(item => item.serial === serial) : null;
  const errors = validateWarrantyIntake(device, form);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const request = mockIntakeRequests.find(item => item.id === requestId);
  if (request && (request.deviceKey !== device.key || request.status === 'Đã tiếp nhận')) throw new Error('Yêu cầu đã thay đổi; vui lòng tra cứu lại.');
  const number = Math.max(0, ...mockWarrantyData.map(item => Number(item.id.replace(/^BH-/, '')) || 0)) + 1;
  const id = `BH-${String(number).padStart(3, '0')}`;
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }).replace(',', '');
  const [day, time] = form.receivedAt.split('T');
  const receivedAt = `${day.split('-').reverse().join('/')} ${time}`;
  const ticket = { id, orderId: device.orderId, customerName: device.customerName, customerPhone: device.customerPhone,
    productName: device.productName, productVariant: device.productVariant, serial: device.serial,
    activationDate: device.activationDate, warrantyExpiry: device.warrantyExpiry, expiryBasis: device.expiryBasis,
    serialStatus: 'ĐANG BẢO HÀNH', status: 'TIẾP NHẬN', trackingCode: `TB-${id}`, created: receivedAt, receivedAt, updated: timestamp,
    eligibility: form.eligibility, verification: form.verification.trim(), receptionReason: form.reason.trim(),
    receptionCondition: form.condition.trim(), receptionUnit: form.unit.trim(), receptionNote: form.note.trim(),
    identification: form.identification.trim(), accessories: form.accessories.map(item => `${item.name.trim()} × ${Number(item.quantity)}`),
    photos: form.photos.map(item => ({ ...item })), quoteStatus: '', paymentStatus: '', refundStatus: 'Không cần hoàn',
    history: [{ time: receivedAt, title: 'Tiếp nhận thiết bị', description: 'Đã xác nhận tạo phiếu bằng dữ liệu mẫu.', actor: 'Quản trị viên', evidence: '—' }] };
  mockWarrantyData.unshift(ticket);
  if (request) { request.status = 'Đã tiếp nhận'; request.ticketId = id; request.form = structuredClone(form); }
  return ticket;
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
