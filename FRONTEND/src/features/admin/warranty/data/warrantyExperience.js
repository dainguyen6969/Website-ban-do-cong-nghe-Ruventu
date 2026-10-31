import { displayDate } from './warrantyContract.js';

export const custodyLabels = { CUA_HANG: 'Tại cửa hàng', DON_VI_BAO_HANH: 'Tại đơn vị bảo hành', DANG_VAN_CHUYEN: 'Đang vận chuyển', KHACH_HANG: 'Khách hàng đang giữ' };
export const eventLabels = { TIEP_NHAN: 'Tiếp nhận thiết bị', GUI_DON_VI: 'Đã gửi đơn vị bảo hành', DON_VI_TIEP_NHAN: 'Đơn vị đã nhận', NHAN_LAI: 'Cửa hàng đã nhận lại', YEU_CAU_THU_HOI: 'Yêu cầu thu hồi', BAT_DAU_KIEM_TRA: 'Bắt đầu kiểm tra', KIEM_TRA_TIEP: 'Kiểm tra lại', GHI_KET_LUAN: 'Ghi kết luận', GHI_CHI_PHI_DON_VI: 'Xác nhận phí đơn vị', BAT_DAU_CONG_VIEC: 'Bắt đầu xử lý', CAP_NHAT_TIEN_DO: 'Cập nhật tiến độ', SAN_SANG_TRA: 'Sẵn sàng trả khách', HANDOVER: 'Đã bàn giao cho khách' };

export const actionHints = {
  BAT_DAU_KIEM_TRA: 'Kiểm tra lỗi thiết bị.',
  KIEM_TRA_TIEP: 'Kiểm tra lại trước khi trả khách.',
  GHI_KET_LUAN: 'Ghi lỗi, hướng xử lý và bên chịu phí.',
  GHI_CHI_PHI_DON_VI: 'Phí cửa hàng trả đơn vị; khách chịu phí thì cần báo giá riêng.',
  GUI_DON_VI: 'Ghi thiết bị và phụ kiện gửi đi.',
  DON_VI_TIEP_NHAN: 'Chọn lần gửi đơn vị đã nhận.',
  NHAN_LAI: 'Đối chiếu serial, phụ kiện khi nhận về.',
  YEU_CAU_THU_HOI: 'Yêu cầu đơn vị gửi trả thiết bị.',
  BAT_DAU_MIEN_PHI: 'Chọn kết luận, rồi tích đúng hạng mục. Miễn phí cho khách vẫn có thể phát sinh phí cửa hàng trả đơn vị.',
  BAT_DAU_CONG_VIEC: 'Dùng báo giá đã duyệt, kiểm tra tiền cọc.',
  CAP_NHAT_TIEN_DO: 'Ghi công việc và tiến độ thực tế.',
  YEU_CAU_DUNG: 'Ghi lý do dừng xử lý.',
  SAN_SANG_TRA: 'Kiểm tra thiết bị thực tế, ghi kết quả và phụ kiện sẽ trả.',
  HANDOVER: 'Chỉ xác nhận khi đã giao thực tế. Đối chiếu thiết bị, phụ kiện và bằng chứng khách nhận.',
  QUOTE: 'Lập chi phí gửi khách duyệt.',
  SEND_QUOTE: 'Ghi kênh gửi và bằng chứng.',
  ACCEPT_QUOTE: 'Ghi xác nhận đồng ý của khách.',
  REJECT_QUOTE: 'Ghi lý do khách từ chối.',
  PLAN_CREATE: 'Chọn hàng thay thế và hạn bảo hành.',
};

export const fieldHelp = {
  nha_cung_cap_id: 'Chọn đơn vị đang hợp tác.',
  lan_gui_lich_su_id: 'Đối chiếu lần gửi và thời điểm.',
  thiet_bi_id: 'Đối chiếu đúng serial.',
  thiet_bi_se_tra_id: 'Chọn đúng thiết bị trả khách.',
  thiet_bi_ban_giao_id: 'Đối chiếu đúng thiết bị đã sẵn sàng trả.',
  phe_duyet_cong_no_lich_su_id: 'Chỉ chọn nếu bàn giao khi còn nợ. API kiểm tra hiệu lực duyệt.',
  ket_luan_lich_su_id: 'Chọn kết luận đã lưu.',
  phien_ban_phuong_an: 'Chỉ dùng khi đổi thiết bị.',
  chung_tu_urls: 'Mỗi dòng một liên kết chứng từ.',
  bang_chung_urls: 'Liên kết ảnh hoặc bằng chứng.',
  tinh_trang: 'Ngoại quan, tem và hoạt động.',
  can_cu_kiem_tra: 'Ghi kết quả kiểm tra trước khi trả.',
  xac_nhan_nghia_vu: 'Xác nhận đã đối chiếu phí.',
};

export function freeWorkItems(detail, conclusionId) {
  const conclusion = (detail.ket_luan || []).find(item => String(item.lich_su_id) === String(conclusionId));
  return (conclusion?.hang_muc || []).filter(item => item.ma_hang_muc && item.can_cu?.trim()
    && (item.dieu_kien_bao_hanh === 'DU_DIEU_KIEN' || item.ben_chiu_phi === 'CUA_HANG'));
}

export function validateFreeWork(detail, body) {
  const choices = freeWorkItems(detail, body.ket_luan_lich_su_id);
  if (!body.ma_hang_muc?.length || body.ma_hang_muc.some(code => !choices.some(item => item.ma_hang_muc === code))) {
    throw new Error('Chọn hạng mục miễn phí thuộc đúng kết luận đang dùng. Có phí khách chịu thì dùng báo giá đã duyệt.');
  }
}

export function workflowGuide(detail) {
  const status = detail.trang_thai_xu_ly, held = detail.noi_dang_giu?.loai;
  if (status === 'HOAN_TAT') return { step: 4, title: 'Phiếu đã hoàn tất', text: 'Xem lịch sử và nghĩa vụ còn lại.', group: null };
  if (status === 'CHO_TRA_KHACH') return { step: 3, title: 'Bàn giao thiết bị cho khách', text: 'Đối chiếu phụ kiện, thanh toán và ghi xác nhận khách nhận.', group: 'handover', action: 'HANDOVER' };
  if (held === 'DANG_VAN_CHUYEN') return { step: 2, title: 'Chờ đơn vị xác nhận đã nhận', text: 'Có biên nhận thì xác nhận đơn vị đã nhận.', group: 'custody', action: 'DON_VI_TIEP_NHAN' };
  if (held === 'DON_VI_BAO_HANH') return { step: 2, title: 'Thiết bị đang ở đơn vị bảo hành', text: 'Nhận hàng về cửa hàng trước khi chuẩn bị trả.', group: 'custody', action: 'NHAN_LAI' };
  if (status === 'TIEP_NHAN') return { step: 0, title: 'Bắt đầu kiểm tra thiết bị', text: 'Kiểm tra thiết bị rồi ghi kết luận.', group: 'inspection', action: 'BAT_DAU_KIEM_TRA' };
  if (status === 'DA_NHAN_LAI') return { step: 2, title: 'Kiểm tra thiết bị vừa nhận về', text: 'Kiểm tra serial, hoạt động và sai lệch.', group: 'inspection', action: 'KIEM_TRA_TIEP' };
  if (status === 'CHO_DOI_SAN_PHAM') return { step: 2, title: 'Chuẩn bị thiết bị thay thế', text: 'Đối chiếu phương án đổi và hàng thay thế.', group: 'plan' };
  if (status === 'DANG_BAO_HANH') return { step: 2, title: 'Theo dõi công việc tại cửa hàng', text: 'Cập nhật tiến độ, kiểm tra sau xử lý.', group: 'work' };
  return { step: 1, title: detail.ket_luan?.length ? 'Chọn hướng xử lý theo kết luận' : 'Ghi kết luận sau khi kiểm tra', text: detail.ket_luan?.length ? 'Chọn sửa, gửi đơn vị hoặc đổi. Có phí cần khách duyệt.' : 'Ghi lỗi, hướng xử lý và bên chịu phí.', group: 'inspection', action: detail.ket_luan?.length ? null : 'GHI_KET_LUAN' };
}

export function custodyBlocker(key, detail) {
  const held = detail.noi_dang_giu?.loai;
  if (key === 'HANDOVER' && detail.trang_thai_xu_ly !== 'CHO_TRA_KHACH') return 'Cần ghi sẵn sàng trả trước khi bàn giao.';
  if (key === 'HANDOVER' && held !== 'CUA_HANG') return 'Chỉ bàn giao khi cửa hàng đang giữ thiết bị.';
  if (key === 'SAN_SANG_TRA' && held !== 'CUA_HANG') return 'Cần nhận thiết bị về cửa hàng trước khi sẵn sàng trả.';
  if (key === 'SAN_SANG_TRA' && !['DANG_KIEM_TRA', 'DA_NHAN_LAI', 'DANG_BAO_HANH', 'CHO_DOI_SAN_PHAM'].includes(detail.trang_thai_xu_ly)) return 'Chỉ đánh dấu sau khi kiểm tra hoặc xử lý thiết bị.';
  if (key === 'GUI_DON_VI' && held !== 'CUA_HANG') return 'Chỉ gửi khi cửa hàng đang giữ thiết bị.';
  if (key === 'DON_VI_TIEP_NHAN' && held !== 'DANG_VAN_CHUYEN') return 'Cần có lần gửi đang chờ đơn vị nhận.';
  if (['NHAN_LAI', 'YEU_CAU_THU_HOI'].includes(key) && !['DON_VI_BAO_HANH', 'DANG_VAN_CHUYEN'].includes(held)) return 'Thiết bị hiện không được ghi nhận đang gửi hoặc ở đơn vị.';
  return '';
}

// Only use references returned for this ticket. Never turn a guessed number into a saved reference.
export function referenceOptions(name, detail, suppliers = [], versions = []) {
  if (name === 'nha_cung_cap_id') return suppliers.map(item => ({ value: item.id, label: `${item.name} · ${item.code}` }));
  if (['phien_ban_id', 'phien_ban_thay_the_id', 'phien_ban_thuc_nhan_id'].includes(name)) return versions.map(item => ({ value: item.id, label: `${item.displayName} · ${item.barcode || `#${item.id}`}` }));
  if (name === 'lan_gui_lich_su_id') {
    const received = Math.max(0, ...(detail.giao_nhan || []).filter(item => item.su_kien === 'NHAN_LAI').map(item => item.lich_su_id));
    return (detail.giao_nhan || []).filter(item => item.su_kien === 'GUI_DON_VI' && item.lich_su_id > received).map(item => ({ value: item.lich_su_id, label: `Lần gửi #${item.lich_su_id} · ${displayDate(item.ngay)} · Thiết bị #${item.thiet_bi_id}` }));
  }
  if (name === 'ket_luan_lich_su_id') return (detail.ket_luan || []).map(item => ({ value: item.lich_su_id, label: `Kết luận #${item.lich_su_id} · ${item.noi_dung}` }));
  // shortcut: detail exposes an audit label, not structured debt approvals; backend validates the selected record.
  if (name === 'phe_duyet_cong_no_lich_su_id') return (detail.lich_su?.items || []).filter(item => item.loai_su_kien === 'DIEU_CHINH_HOA_DON_BAO_HANH' && /công nợ/i.test(item.noi_dung || '')).map(item => ({ value: item.id, label: `#${item.id} · ${displayDate(item.ngay_tao)} · ${item.noi_dung}` }));
  if (['thiet_bi_id', 'thiet_bi_cu_id', 'thiet_bi_se_tra_id', 'thiet_bi_ban_giao_id'].includes(name)) {
    const devices = [detail.thiet_bi, detail.thiet_bi_hien_hanh].filter(Boolean);
    if (detail.phuong_an_doi?.thiet_bi_thay_the_id && !devices.some(item => item.id === detail.phuong_an_doi.thiet_bi_thay_the_id)) devices.push({ id: detail.phuong_an_doi.thiet_bi_thay_the_id, ma_theo_doi: 'Thiết bị thay thế theo phương án đổi' });
    const expected = name === 'thiet_bi_cu_id' ? detail.thiet_bi?.id : ['thiet_bi_se_tra_id', 'thiet_bi_ban_giao_id'].includes(name) ? detail.phuong_an_doi?.thiet_bi_thay_the_id || detail.thiet_bi?.id : null;
    return [...new Map(devices.filter(item => expected == null || item.id === expected).map(item => [item.id, { value: item.id, label: `${item.so_serial || item.ma_theo_doi || 'Thiết bị'} · #${item.id}` }])).values()];
  }
  if (name === 'phien_ban_phuong_an') return detail.phuong_an_doi?.phien_ban ? [{ value: detail.phuong_an_doi.phien_ban, label: `Phương án đổi · phiên bản ${detail.phuong_an_doi.phien_ban}` }] : [];
  return null;
}
