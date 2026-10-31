export const statusLabels = { TIEP_NHAN: 'Tiếp nhận', DANG_KIEM_TRA: 'Đang kiểm tra', DA_GUI_BAO_HANH: 'Đã gửi bảo hành', DANG_BAO_HANH: 'Đang bảo hành', DA_NHAN_LAI: 'Đã nhận lại', CHO_TRA_KHACH: 'Chờ trả khách', CHO_DOI_SAN_PHAM: 'Chờ đổi sản phẩm', HOAN_TAT: 'Đã bàn giao thiết bị' };
export const quoteLabels = { NHAP: 'Bản nháp', CHO_PHAN_HOI: 'Chờ khách phản hồi', DONG_Y: 'Khách đã đồng ý', TU_CHOI: 'Khách đã từ chối', HET_HIEU_LUC: 'Hết hiệu lực' };
export const paymentLabels = { CHUA_THANH_TOAN: 'Chưa thanh toán', THANH_TOAN_MOT_PHAN: 'Thanh toán một phần', DA_THANH_TOAN: 'Đã thanh toán' };
export const refundLabels = { KHONG_CAN_HOAN: 'Không cần hoàn', CHO_HOAN: 'Chờ hoàn tiền', HOAN_MOT_PHAN: 'Hoàn tiền một phần', DA_HOAN: 'Đã hoàn tiền' };
export const eligibilityLabels = { CHUA_XAC_MINH: 'Chưa xác minh', DU_DIEU_KIEN: 'Đủ điều kiện miễn phí', KHONG_DU_DIEU_KIEN: 'Không đủ điều kiện miễn phí' };
export const quickFilters = { 'TẤT CẢ': [], 'MỚI TIẾP NHẬN': ['TIEP_NHAN'], 'ĐANG KIỂM TRA': ['DANG_KIEM_TRA'], 'ĐANG XỬ LÝ': ['DA_GUI_BAO_HANH', 'DANG_BAO_HANH', 'DA_NHAN_LAI', 'CHO_DOI_SAN_PHAM'], 'CHỜ TRẢ KHÁCH': ['CHO_TRA_KHACH'], 'HOÀN TẤT': ['HOAN_TAT'] };
export const intakeCriteria = { serial: 'Serial / sản phẩm (tìm gần đúng)', trackingCode: 'Mã theo dõi', requestId: 'ID yêu cầu tiếp nhận', orderId: 'Mã đơn hàng', customerPhone: 'Số điện thoại' };
export const lookupFields = { serial: 'so_serial', trackingCode: 'ma_theo_doi', requestId: 'yeu_cau_tiep_nhan_id', orderId: 'ma_don_hang', customerPhone: 'sdt_nguoi_lien_he' };
export const receiptNow = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 23);
export const localTimestamp = value => value ? `${value.length === 16 ? `${value}:00` : value}+07:00` : null;
export const displayDate = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export const money = value => value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} đ`;

export function listParams(filters, page, limit, status = filters.status) {
  return { keyword: filters.search.trim(), trang_thai_xu_ly: status, trang_thai_bao_gia: filters.quoteStatus, trang_thai_thanh_toan: filters.paymentStatus, trang_thai_hoan_tien: filters.refundStatus, tu_ngay: filters.fromDate, den_ngay: filters.toDate, page, limit };
}

export function intakeBody(device, form, requestId) {
  if (device.thiet_bi_id == null && (device.so_serial_id != null || device.so_serial)) throw new Error('Serial này chưa có hồ sơ thiết bị; không thể dùng nhánh tiếp nhận không serial.');
  return {
    yeu_cau_tiep_nhan_id: requestId || null,
    ...(device.thiet_bi_id != null ? { thiet_bi_id: device.thiet_bi_id } : { chi_tiet_don_hang_id: device.chi_tiet_don_hang_id, dau_hieu_nhan_dang: form.identification.trim() }),
    ten_nguoi_lien_he: form.contact.trim(), sdt_nguoi_lien_he: form.phone.trim(),
    ly_do_bao_hanh: form.reason.trim(), tinh_trang_tiep_nhan: form.condition.trim(),
    ngay_tiep_nhan_thuc_te: localTimestamp(form.receivedAt), dieu_kien_bao_hanh: form.eligibility,
    can_cu_xac_minh: form.verification.trim(), don_vi_bao_hanh_du_kien: form.unit.trim() || null,
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
    if (!eligibilityLabels[form.eligibility]) errors.eligibility = 'Chọn điều kiện miễn phí sau khi kiểm tra.';
    if (!form.verification?.trim()) errors.verification = 'Nhập căn cứ xác minh.';
    else if (form.verification.trim().length > 16000) errors.verification = 'Căn cứ tối đa 16000 ký tự.';
    if (form.eligibility === 'DU_DIEU_KIEN' && (!device?.han_bao_hanh || Date.parse(device.han_bao_hanh) < Date.parse(localTimestamp(form.receivedAt)))) errors.eligibility = 'Chưa có hạn bảo hành hợp lệ để xác nhận miễn phí. Chọn chưa xác minh hoặc không đủ điều kiện.';
    return errors;
  }
  for (const [field, label, max] of [['contact', 'tên liên hệ', 100], ['phone', 'số điện thoại', 20], ['reason', 'lý do bảo hành', 255], ['condition', 'tình trạng tiếp nhận', 16000]]) {
    if (!form[field]?.trim()) errors[field] = `Nhập ${label}.`;
    else if (form[field].trim().length > max) errors[field] = `${label} tối đa ${max} ký tự.`;
  }
  if (form.phone?.trim() && !/^\+?[0-9][0-9 .()-]{6,19}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ (7–20 ký tự).';
  if (device && device.thiet_bi_id == null && !form.identification?.trim()) errors.identification = 'Nhập dấu hiệu nhận dạng thiết bị không serial.';
  if (!form.receivedAt || !Number.isFinite(Date.parse(localTimestamp(form.receivedAt))) || form.receivedAt > receiptNow()) errors.receivedAt = 'Thời điểm nhận phải hợp lệ và không ở tương lai.';
  if (form.accessories.some(item => !item.name.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) errors.accessories = 'Phụ kiện cần tên và số lượng nguyên dương.';
  return errors;
}

export function intakeReachableStep(device, form) {
  for (let step = 0; step < 3; step++) if (Object.keys(intakeStepErrors(device, form, step)).length) return step;
  return 3;
}
