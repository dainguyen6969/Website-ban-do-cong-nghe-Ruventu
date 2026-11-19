export const statusLabels = { TIEP_NHAN: 'Tiếp nhận', DANG_KIEM_TRA: 'Đang kiểm tra', DA_GUI_BAO_HANH: 'Đã gửi bảo hành', DANG_BAO_HANH: 'Đang bảo hành', DA_NHAN_LAI: 'Đã nhận lại', CHO_TRA_KHACH: 'Chờ trả khách', CHO_DOI_SAN_PHAM: 'Chờ đổi sản phẩm', HOAN_TAT: 'Đã bàn giao thiết bị' };
export const quoteLabels = { NHAP: 'Bản nháp', CHO_PHAN_HOI: 'Chờ khách phản hồi', DONG_Y: 'Khách đã đồng ý', TU_CHOI: 'Khách đã từ chối', HET_HIEU_LUC: 'Hết hiệu lực' };
export const paymentLabels = { CHUA_THANH_TOAN: 'Chưa thanh toán', THANH_TOAN_MOT_PHAN: 'Thanh toán một phần', DA_THANH_TOAN: 'Đã thanh toán' };
export const refundLabels = { KHONG_CAN_HOAN: 'Không cần hoàn', CHO_HOAN: 'Chờ hoàn tiền', HOAN_MOT_PHAN: 'Hoàn tiền một phần', DA_HOAN: 'Đã hoàn tiền' };
export const eligibilityLabels = { CHUA_XAC_MINH: 'Chưa xác minh', DU_DIEU_KIEN: 'Đủ điều kiện miễn phí', KHONG_DU_DIEU_KIEN: 'Không đủ điều kiện miễn phí' };
export const quickFilters = { 'TẤT CẢ': [], 'MỚI TIẾP NHẬN': ['TIEP_NHAN'], 'ĐANG KIỂM TRA': ['DANG_KIEM_TRA'], 'ĐANG XỬ LÝ': ['DA_GUI_BAO_HANH', 'DANG_BAO_HANH', 'DA_NHAN_LAI', 'CHO_DOI_SAN_PHAM'], 'CHỜ TRẢ KHÁCH': ['CHO_TRA_KHACH'], 'HOÀN TẤT': ['HOAN_TAT'] };
export const lookupFields = { serial: 'so_serial', trackingCode: 'ma_theo_doi', requestId: 'yeu_cau_tiep_nhan_id', orderId: 'ma_don_hang', customerPhone: 'sdt_nguoi_lien_he' };
export function intakeSearch(value) {
  const text = value.trim();
  const phone = text.replace(/[\s().-]/g, '');
  if (/^(?:0\d{9}|(?:\+?84)\d{9})$/.test(phone)) {
    return { criterion: 'customerPhone', value: phone.replace(/^\+?84/, '0') };
  }
  if (/^#\s*[1-9]\d{0,17}$/.test(text)) {
    return { criterion: 'requestId', value: text.replace(/^#\s*/, '') };
  }
  if (/^DH[\d-]+$/i.test(text)) return { criterion: 'orderId', value: text.toUpperCase() };
  if (/^TB-/i.test(text)) return { criterion: 'trackingCode', value: text };
  return { criterion: 'serial', value: text };
}
export const receiptNow = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 23);
export const localTimestamp = value => value ? `${value.length === 16 ? `${value}:00` : value}+07:00` : null;
export const displayDate = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export const money = value => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} đ`;

export function listParams(filters, page, limit, status = filters.status) {
  return { keyword: filters.search.trim(), trang_thai_xu_ly: status, trang_thai_bao_gia: filters.quoteStatus, trang_thai_thanh_toan: filters.paymentStatus, trang_thai_hoan_tien: filters.refundStatus, tu_ngay: filters.fromDate, den_ngay: filters.toDate, page, limit };
}

export const intakeRequiredChecks = [
  'Đã đối chiếu chứng từ mua hàng',
  'Thiết bị khớp với giao dịch mua',
  'Đã xác nhận thiết bị được giao cho khách',
  'Đã ghi nhận lỗi khách báo',
  'Đã kiểm tra ngoại quan khi nhận',
];
export const intakeDeadlineCheck = 'Thiết bị còn hạn bảo hành';
export const intakeFreeChecks = [
  intakeDeadlineCheck,
  'Lỗi thuộc phạm vi bảo hành',
  'Tem bảo hành hợp lệ hoặc thiết bị không yêu cầu tem',
  'Không có dấu hiệu hư hỏng do va đập, chất lỏng hoặc nguồn điện',
  'Không có dấu hiệu can thiệp trái quy định',
];
export const intakeReasons = ['Không lên nguồn', 'Không lên hình', 'Tự tắt hoặc khởi động lại', 'Mất kết nối', 'Quá nhiệt', 'Lỗi âm thanh'];
export const intakeConditions = ['Ngoại quan nguyên vẹn', 'Trầy xước', 'Móp hoặc nứt vỏ', 'Có dấu hiệu ẩm hoặc vào nước', 'Tem rách hoặc mất'];
export const intakeOther = 'Khác';
export const intakeItemLimit = 20;

export function intakeDeadlineStatus(device, receivedAt) {
  const deadline = Date.parse(device?.han_bao_hanh);
  const received = Date.parse(localTimestamp(receivedAt || receiptNow()));
  if (!Number.isFinite(deadline) || !Number.isFinite(received)) return 'unknown';
  return deadline >= received ? 'active' : 'expired';
}

export function intakeAssessment(device, form) {
  const canConfirmDeadline = device?.thiet_bi_id != null && intakeDeadlineStatus(device, form.receivedAt) === 'active';
  const required = intakeRequiredChecks.filter(label => form.checks.includes(label));
  const free = intakeFreeChecks.filter(label => form.checks.includes(label) && (label !== intakeDeadlineCheck || canConfirmDeadline));
  const complete = required.length === intakeRequiredChecks.length;
  const total = required.length + free.length;
  const eligibility = !complete ? 'CHUA_XAC_MINH' : total === 10 ? 'DU_DIEU_KIEN' : 'KHONG_DU_DIEU_KIEN';
  const verification = [...required, ...free].join('\n') || 'Chưa có tiêu chí xác minh được xác nhận.';
  return { total, complete, eligibility, verification, canConfirmDeadline };
}

export function intakeDescription(form, field) {
  const options = field === 'reason' ? intakeReasons : intakeConditions;
  const selected = form[field];
  const values = options.filter(label => selected.includes(label));
  const other = selected.includes(intakeOther) ? form[`${field}Other`].trim() : '';
  if (other) values.push(other);
  return values.join(' · ');
}

export function intakeContact(request, customer) {
  return {
    contact: request?.ten_nguoi_lien_he?.trim() || customer?.ho_ten?.trim() || '',
    phone: request?.sdt_nguoi_lien_he?.trim() || customer?.so_dien_thoai?.trim() || '',
  };
}

export function intakeBody(device, form, requestId) {
  if (device.thiet_bi_id == null && (device.so_serial_id != null || device.so_serial)) throw new Error('Serial này chưa có hồ sơ thiết bị; không thể dùng nhánh tiếp nhận không serial.');
  const { eligibility, verification } = intakeAssessment(device, form);
  return {
    yeu_cau_tiep_nhan_id: requestId || null,
    ...(device.thiet_bi_id != null ? { thiet_bi_id: device.thiet_bi_id } : { chi_tiet_don_hang_id: device.chi_tiet_don_hang_id, dau_hieu_nhan_dang: form.identification.trim() }),
    ten_nguoi_lien_he: form.contact.trim(), sdt_nguoi_lien_he: form.phone.trim(),
    ly_do_bao_hanh: intakeDescription(form, 'reason'), tinh_trang_tiep_nhan: intakeDescription(form, 'condition'),
    ngay_tiep_nhan_thuc_te: localTimestamp(form.receivedAt), dieu_kien_bao_hanh: eligibility,
    can_cu_xac_minh: verification, don_vi_bao_hanh_du_kien: form.unit.trim() || null,
    ghi_chu: form.note.trim() || null, phu_kien: form.accessories.map(item => ({ ten: item.name.trim(), so_luong: Number(item.quantity) })), anh_urls: form.photos.map(item => item.url),
  };
}

export function intakeErrors(device, form) {
  return [0, 1, 2].flatMap(step => Object.values(intakeStepErrors(device, form, step)));
}

export function intakeStepErrors(device, form, step) {
  const errors = {};
  if (step === 0) {
    if (!device || device.serial_candidate) errors.device = 'Chọn và xác minh thiết bị từ kết quả tra cứu.';
    return errors;
  }
  if (step === 1) {
    if (device && (!device.co_the_tiep_nhan || device.ly_do_chan?.length)) errors.device = (device.ly_do_chan || []).map(item => item.message).join(' · ') || 'Thiết bị chưa đủ điều kiện tiếp nhận.';
    if (device?.thiet_bi_id == null && (device?.so_serial_id != null || device?.so_serial)) errors.device = 'Serial chưa có hồ sơ thiết bị đã bán (thiet_bi_id). API hiện có không thể lập phiếu cho serial này; cần hoàn thiện hồ sơ nguồn gốc, hoặc lưu chờ xác minh.';
    if (!intakeAssessment(device, form).complete) errors.checks = 'Xác nhận đủ 5 mục bắt buộc để tiếp tục.';
    return errors;
  }
  for (const [field, label, max] of [['contact', 'tên liên hệ', 100], ['phone', 'số điện thoại', 20]]) {
    if (!form[field]?.trim()) errors[field] = `Nhập ${label}.`;
    else if (form[field].trim().length > max) errors[field] = `${label} tối đa ${max} ký tự.`;
  }
  for (const [field, label, max] of [['reason', 'lý do bảo hành', 255], ['condition', 'tình trạng tiếp nhận', 16000]]) {
    const value = intakeDescription(form, field);
    if (form[field].includes(intakeOther) && !form[`${field}Other`].trim()) errors[field] = 'Nhập nội dung ở mục Khác.';
    else if (!value) errors[field] = `Chọn ${label}.`;
    else if (value.length > max) errors[field] = `${label} tối đa ${max} ký tự.`;
  }
  if (form.phone?.trim() && !/^\+?[0-9][0-9 .()-]{6,19}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ (7–20 ký tự).';
  if (device && device.thiet_bi_id == null && !form.identification?.trim()) errors.identification = 'Nhập dấu hiệu nhận dạng thiết bị không serial.';
  if (!form.receivedAt || !Number.isFinite(Date.parse(localTimestamp(form.receivedAt))) || form.receivedAt > receiptNow()) errors.receivedAt = 'Thời điểm nhận phải hợp lệ và không ở tương lai.';
  if (form.accessories.length > intakeItemLimit) errors.accessories = `Tối đa ${intakeItemLimit} dòng phụ kiện.`;
  else if (form.accessories.some(item => !item.name.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) errors.accessories = 'Phụ kiện cần tên và số lượng nguyên dương.';
  if (form.photos?.length > intakeItemLimit) errors.photos = `Tối đa ${intakeItemLimit} ảnh tiếp nhận.`;
  return errors;
}

export function intakeReachableStep(device, form) {
  for (let step = 0; step < 3; step++) if (Object.keys(intakeStepErrors(device, form, step)).length) return step;
  return 3;
}
