import { eligibilityLabels, localTimestamp, receiptNow } from './warrantyContract.js';
import { referenceOptions } from './warrantyExperience.js';

const channels = { TAI_QUAY: 'Tại quầy', DIEN_THOAI: 'Điện thoại', EMAIL: 'Email', TIN_NHAN: 'Tin nhắn', KHAC: 'Khác' };
const payers = { KHACH_HANG: 'Khách hàng', CUA_HANG: 'Cửa hàng', DON_VI_BAO_HANH: 'Đơn vị bảo hành' };
export const fieldLabels = {
  thiet_bi_ban_giao_id: 'Thiết bị bàn giao', ten_nguoi_nhan: 'Tên người nhận', sdt_nguoi_nhan: 'Số điện thoại người nhận', xac_nhan_khach: 'Khách đã nhận đúng thiết bị và phụ kiện', phe_duyet_cong_no_lich_su_id: 'Duyệt công nợ để bàn giao khi còn nợ',
  noi_dung: 'Nội dung', ma_hang_muc: 'Mã hạng mục', loi: 'Lỗi', noi_dung_xu_ly: 'Nội dung xử lý', ly_do: 'Lý do', can_cu: 'Căn cứ', don_vi_ket_luan: 'Đơn vị kết luận', dieu_kien_bao_hanh: 'Điều kiện miễn phí', ben_chiu_phi: 'Bên chịu phí', hang_muc: 'Hạng mục', phu_kien: 'Phụ kiện', ten: 'Tên', so_luong: 'Số lượng', bang_chung_urls: 'Liên kết bằng chứng (mỗi dòng một liên kết)', chung_tu_urls: 'Liên kết chứng từ (mỗi dòng một liên kết)', nha_cung_cap_id: 'Nhà cung cấp', chi_phi: 'Chi phí', xac_nhan_nghia_vu: 'Xác nhận nghĩa vụ chi phí', ten_don_vi: 'Tên đơn vị', thiet_bi_id: 'Thiết bị', thiet_bi_cu_id: 'Thiết bị cũ', noi_dung_yeu_cau: 'Nội dung yêu cầu', thoi_diem: 'Thời điểm thực tế', lan_gui_lich_su_id: 'Lần gửi thiết bị', nguoi_nhan: 'Người nhận', noi_xu_ly: 'Nơi xử lý', phien_ban_bao_gia: 'Phiên bản báo giá', chi_tiet_phi_ids: 'ID chi tiết phí (mỗi dòng một ID)', ket_luan_lich_su_id: 'Kết luận làm căn cứ', ghi_chu: 'Ghi chú', so_serial_thuc_nhan: 'Serial thực nhận', tinh_trang: 'Tình trạng', sai_lech: 'Sai lệch thực nhận', loai: 'Loại', thiet_bi_se_tra_id: 'Thiết bị sẽ trả khách', ket_qua_xu_ly: 'Kết quả xử lý', can_cu_kiem_tra: 'Căn cứ kiểm tra', sai_lech_da_xu_ly: 'ID sai lệch đã xử lý (mỗi dòng một ID)', phien_ban_phuong_an: 'Phiên bản phương án đổi', thay_the_phien_ban: 'Thay thế phiên bản', thoi_gian_du_kien: 'Thời gian xử lý dự kiến', han_phan_hoi: 'Hạn phản hồi', dieu_kien_thanh_toan: 'Điều kiện thanh toán', 'dieu_kien_dat_coc.so_tien_toi_thieu': 'Cọc tối thiểu', don_gia_khach: 'Đơn giá khách', chi_phi_ncc_du_kien: 'Chi phí đơn vị dự kiến', van_phat_sinh_khi_khong_sua: 'Vẫn phát sinh khi không sửa', kenh: 'Kênh xác nhận', hoa_don_id: 'ID hóa đơn', hoa_don_bao_hanh_id: 'Hóa đơn bảo hành', so_tien_mien_giam: 'Số tiền miễn giảm', so_tien_cong_no_toi_da: 'Công nợ tối đa', han_thanh_toan: 'Hạn thanh toán', so_tien: 'Số tiền thực tế', phuong_thuc_thanh_toan: 'Phương thức thanh toán', ten_nguoi_nop_nhan: 'Tên người nộp / nhận', ngay_ghi_nhan: 'Thời điểm ghi nhận', ma_chung_tu_tham_chieu: 'Mã chứng từ tham chiếu', chi_phi_lich_su_id: 'ID lịch sử xác nhận chi phí', giao_dich_chi_goc_id: 'ID giao dịch chi gốc', nghia_vu_lich_su_id: 'ID lịch sử nghĩa vụ', don_vi_phe_duyet: 'Đơn vị phê duyệt', phien_ban_thay_the_id: 'Phiên bản sản phẩm thay thế', tinh_trang_hang: 'Tình trạng hàng', nguon: 'Nguồn hàng', cach_tinh_han: 'Cách tính hạn', han_moi_xac_nhan: 'Hạn mới được xác nhận', can_cu_han: 'Căn cứ áp dụng hạn', bao_gia_phien_ban: 'Phiên bản báo giá phí', huong_xu_ly_thiet_bi_cu: 'Hướng xử lý thiết bị cũ', so_serial_id: 'ID serial trong kho', phien_ban_id: 'ID phiên bản sản phẩm', giu_cho_lich_su_id: 'ID lịch sử giữ chỗ', dau_hieu_nhan_dang: 'Dấu hiệu nhận dạng', phien_ban_thuc_nhan_id: 'ID phiên bản thực nhận', giao_dich_xuat_the_kho_id: 'ID thẻ kho xuất hàng đổi', so_luong_ban_lai: 'Số lượng bán lại', so_luong_can_xu_ly: 'Số lượng cần xử lý', ket_qua_kiem_tra: 'Kết quả kiểm tra', so_luong_can_bu: 'Số lượng cần bù', serials: 'Serial thực nhận (mỗi dòng một serial)', quyen_so_huu: 'Quyền sở hữu', can_cu_so_huu: 'Căn cứ sở hữu', so_luong_quy_doi_duoc_chot: 'Số lượng quy đổi được chốt', so_tien_nghia_vu: 'Số tiền nghĩa vụ', nhan_thiet_bi_cu_lich_su_id: 'ID lịch sử nhận thiết bị cũ', quyet_dinh_xu_ly: 'Quyết định xử lý',
};
export const fieldOptions = {
  dieu_kien_bao_hanh: eligibilityLabels, ben_chiu_phi: payers, kenh: channels, noi_xu_ly: { CUA_HANG: 'Cửa hàng', DON_VI_BAO_HANH: 'Đơn vị bảo hành' },
  ket_qua_xu_ly: { CHUA_CO_KET_QUA: 'Chưa có kết quả (hàng đổi chưa bàn giao)', SUA_THANH_CONG: 'Sửa thành công', KHONG_SUA_DUOC: 'Không sửa được', KHONG_THUC_HIEN_SUA: 'Không thực hiện sửa' },
  phuong_thuc_thanh_toan: { TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', THE: 'Thẻ' }, nguon: { DON_VI_BAO_HANH: 'Đơn vị bảo hành cấp', TON_KHO_CUA_HANG: 'Tồn kho cửa hàng' }, cach_tinh_han: { GIU_HAN_CON_LAI: 'Giữ hạn còn lại', HAN_MOI_XAC_NHAN: 'Hạn mới có căn cứ' }, quyen_so_huu: { CHUA_XAC_DINH: 'Chưa xác định', CUA_HANG: 'Cửa hàng', KHACH_HANG: 'Khách hàng', DON_VI_BAO_HANH: 'Đơn vị bảo hành' },
};
export const arrayFields = {
  phu_kien: ['ten', 'so_luong'], sai_lech: ['loai', 'noi_dung'],
  inspectionItems: ['ma_hang_muc', 'loi', 'noi_dung_xu_ly', 'dieu_kien_bao_hanh', 'ben_chiu_phi', 'ly_do', 'can_cu', 'don_vi_ket_luan'],
  costItems: ['ma_hang_muc', 'chi_phi', 'ben_chiu_phi'],
  quoteItems: ['ma_hang_muc', 'noi_dung', 'so_luong', 'don_gia_khach', 'chi_phi_ncc_du_kien?', 'dieu_kien_bao_hanh', 'ben_chiu_phi', 'van_phat_sinh_khi_khong_sua'],
};
export const fieldType = name => {
  if (arrayFields[name]) return 'rows';
  if (fieldOptions[name]) return 'select';
  if (['xac_nhan_nghia_vu', 'xac_nhan_khach', 'van_phat_sinh_khi_khong_sua'].includes(name)) return 'checkbox';
  if (name === 'sdt_nguoi_nhan') return 'tel';
  if (name === 'ten_nguoi_nhan') return 'text';
  if (name === 'han_thanh_toan') return 'date';
  if (['thoi_diem', 'ngay_ghi_nhan', 'han_phan_hoi', 'han_moi_xac_nhan'].includes(name)) return 'datetime-local';
  if (name.endsWith('_id') || ['phien_ban_bao_gia', 'phien_ban_phuong_an', 'thay_the_phien_ban', 'bao_gia_phien_ban'].includes(name)) return 'id';
  if (/so_luong|so_tien|chi_phi$|don_gia|chi_phi_ncc/.test(name)) return 'number';
  if (['ten', 'ten_don_vi', 'nguoi_nhan', 'don_vi_ket_luan', 'ten_nguoi_nop_nhan', 'ma_chung_tu_tham_chieu', 'ma_hang_muc', 'so_serial_thuc_nhan', 'don_vi_phe_duyet', 'thoi_gian_du_kien'].includes(name)) return 'text';
  return 'textarea';
};

const actions = [];
function action(key, label, group, endpoint, discriminator, fields, extra = {}) {
  actions.push({ key, label, group, endpoint, fields: fields.split(' ').filter(Boolean), fixed: discriminator, ...extra });
}
const event = (key, label, group, fields, extra) => action(key, label, group, 'events', { su_kien: key }, fields, extra);
const docs = 'thoi_diem chung_tu_urls';
const decision = 'kenh thoi_diem bang_chung_urls ly_do?';
action('BAT_DAU_KIEM_TRA', 'BẮT ĐẦU KIỂM TRA', 'inspection', 'status', { su_kien: 'BAT_DAU_KIEM_TRA' }, 'thoi_diem ghi_chu?', { method: 'PATCH' });
action('KIEM_TRA_TIEP', 'KIỂM TRA TIẾP', 'inspection', 'status', { su_kien: 'KIEM_TRA_TIEP' }, 'ly_do', { method: 'PATCH' });
event('GHI_KET_LUAN', 'GHI KẾT LUẬN', 'inspection', 'noi_dung inspectionItems bang_chung_urls?', { arrayName: 'inspectionItems' });
event('GHI_CHI_PHI_DON_VI', 'GHI CHI PHÍ ĐƠN VỊ', 'inspection', 'nha_cung_cap_id costItems xac_nhan_nghia_vu can_cu chung_tu_urls?', { arrayName: 'costItems', afterComplete: true });
event('GUI_DON_VI', 'GỬI THIẾT BỊ', 'custody', `nha_cung_cap_id ten_don_vi thiet_bi_id noi_dung_yeu_cau phu_kien ${docs}`);
event('DON_VI_TIEP_NHAN', 'ĐƠN VỊ ĐÃ NHẬN', 'custody', `lan_gui_lich_su_id nguoi_nhan ${docs}`);
event('YEU_CAU_THU_HOI', 'YÊU CẦU THU HỒI', 'custody', `lan_gui_lich_su_id ly_do ${docs}`);
event('NHAN_LAI', 'NHẬN LẠI THIẾT BỊ', 'custody', `lan_gui_lich_su_id thiet_bi_id so_serial_thuc_nhan? tinh_trang phu_kien sai_lech ${docs}`, { fixed: { su_kien: 'NHAN_LAI', loai_thiet_bi: 'THIET_BI_CU' } });
event('BAT_DAU_CONG_VIEC', 'BẮT ĐẦU CÔNG VIỆC CÓ PHÍ', 'work', 'noi_xu_ly phien_ban_bao_gia chi_tiet_phi_ids thoi_diem ghi_chu?');
event('BAT_DAU_MIEN_PHI', 'BẮT ĐẦU CÔNG VIỆC MIỄN PHÍ', 'work', 'noi_xu_ly ket_luan_lich_su_id ma_hang_muc thoi_diem ghi_chu?', { fixed: { su_kien: 'BAT_DAU_CONG_VIEC' }, stringList: ['ma_hang_muc'] });
event('CAP_NHAT_TIEN_DO', 'CẬP NHẬT TIẾN ĐỘ', 'work', 'noi_dung chi_tiet_phi_ids thoi_diem bang_chung_urls?');
event('YEU_CAU_DUNG', 'YÊU CẦU DỪNG XỬ LÝ', 'work', 'ly_do thoi_diem bang_chung_urls?');
action('SAN_SANG_TRA', 'SẴN SÀNG TRẢ', 'handover', 'status', { su_kien: 'SAN_SANG_TRA' }, 'thiet_bi_se_tra_id ket_qua_xu_ly tinh_trang phu_kien can_cu_kiem_tra sai_lech_da_xu_ly? phien_ban_phuong_an? ly_do?', { method: 'PATCH' });
action('HANDOVER', 'BÀN GIAO & HOÀN TẤT', 'handover', 'handover', {}, 'thiet_bi_ban_giao_id ten_nguoi_nhan sdt_nguoi_nhan thoi_diem tinh_trang phu_kien xac_nhan_khach bang_chung_urls phe_duyet_cong_no_lich_su_id? phien_ban_phuong_an? ghi_chu?');
action('QUOTE', '+ LẬP BÁO GIÁ', 'quotes', 'quotes', {}, 'thay_the_phien_ban? ket_luan_lich_su_id quoteItems thoi_gian_du_kien han_phan_hoi dieu_kien_dat_coc.so_tien_toi_thieu dieu_kien_thanh_toan ly_do', { arrayName: 'quoteItems' });
for (const [key, label, fixed, fields] of [
  ['SEND_QUOTE', 'GỬI BÁO GIÁ', { hanh_dong: 'GUI' }, 'kenh thoi_diem bang_chung_urls'],
  ['ACCEPT_QUOTE', 'GHI KHÁCH ĐỒNG Ý', { hanh_dong: 'QUYET_DINH_KHACH', quyet_dinh: 'DONG_Y' }, decision],
  ['REJECT_QUOTE', 'GHI KHÁCH TỪ CHỐI', { hanh_dong: 'QUYET_DINH_KHACH', quyet_dinh: 'TU_CHOI' }, decision.replace('ly_do?', 'ly_do')],
  ['WITHDRAW_QUOTE', 'THU HỒI BẢN CHỜ', { hanh_dong: 'THU_HOI' }, 'ly_do thoi_diem'],
]) action(key, label, 'quotes', 'quote-events', fixed, fields);
for (const [key, label, fields] of [
  ['AP_DUNG_BAO_GIA_DA_DUYET', 'ÁP DỤNG BÁO GIÁ ĐÃ DUYỆT', 'phien_ban_bao_gia ly_do'],
  ['HUY', 'HỦY HÓA ĐƠN', 'hoa_don_id ly_do can_cu bang_chung_urls'],
  ['DUYET_MIEN_GIAM', 'DUYỆT MIỄN GIẢM', 'hoa_don_id so_tien_mien_giam ly_do can_cu'],
  ['DUYET_CONG_NO', 'DUYỆT CÔNG NỢ', 'hoa_don_id so_tien_cong_no_toi_da han_thanh_toan ly_do'],
]) action(`INVOICE_${key}`, label, 'invoice', 'invoice', { hanh_dong: key }, fields, { method: 'PATCH', afterComplete: true });
for (const [key, label, fields] of [
  ['THU_KHACH', 'THU TIỀN KHÁCH', 'hoa_don_bao_hanh_id'], ['HOAN_KHACH', 'HOÀN TIỀN KHÁCH', 'hoa_don_bao_hanh_id'],
  ['CHI_DON_VI', 'CHI TIỀN ĐƠN VỊ', 'nha_cung_cap_id chi_phi_lich_su_id'], ['THU_HOAN_DON_VI', 'NHẬN TIỀN ĐƠN VỊ HOÀN', 'nha_cung_cap_id giao_dich_chi_goc_id'], ['THU_DOI_SOAT_DON_VI', 'NHẬN TIỀN ĐỐI SOÁT', 'nha_cung_cap_id nghia_vu_lich_su_id'],
]) action(key, label, 'money', 'money-transactions', { loai: key }, `${fields} so_tien phuong_thuc_thanh_toan ten_nguoi_nop_nhan ngay_ghi_nhan ma_chung_tu_tham_chieu chung_tu_urls`, { afterComplete: true });
action('PLAN_CREATE', '+ LẬP PHIÊN BẢN', 'plan', 'replacement-plan', { hanh_dong: 'LAP_PHIEN_BAN' }, 'thay_the_phien_ban? ket_luan_lich_su_id ly_do can_cu don_vi_phe_duyet phien_ban_thay_the_id tinh_trang_hang phu_kien nguon cach_tinh_han han_moi_xac_nhan? can_cu_han bao_gia_phien_ban? huong_xu_ly_thiet_bi_cu chung_tu_urls');
action('PLAN_APPROVE', 'PHÊ DUYỆT PHƯƠNG ÁN', 'plan', 'replacement-plan', { hanh_dong: 'PHE_DUYET' }, 'phien_ban_phuong_an ly_do can_cu');
action('PLAN_ACCEPT', 'GHI KHÁCH ĐỒNG Ý ĐỔI', 'plan', 'replacement-plan', { hanh_dong: 'QUYET_DINH_KHACH', quyet_dinh: 'DONG_Y' }, `phien_ban_phuong_an ${decision}`);
action('PLAN_REJECT', 'GHI KHÁCH TỪ CHỐI ĐỔI', 'plan', 'replacement-plan', { hanh_dong: 'QUYET_DINH_KHACH', quyet_dinh: 'TU_CHOI' }, `phien_ban_phuong_an ${decision.replace('ly_do?', 'ly_do')}`);
action('PLAN_CANCEL', 'HỦY PHƯƠNG ÁN', 'plan', 'replacement-plan', { hanh_dong: 'HUY' }, 'phien_ban_phuong_an ly_do');
for (const [key, label, fixed, fields] of [
  ['HOLD_SERIAL', 'GIỮ CHỖ SERIAL CỬA HÀNG', 'GIU_CHO_HANG_CUA_HANG', 'phien_ban_phuong_an so_serial_id'],
  ['HOLD_UNIT', 'GIỮ CHỖ HÀNG KHÔNG SERIAL', 'GIU_CHO_HANG_CUA_HANG', 'phien_ban_phuong_an phien_ban_id'],
  ['ISSUE', 'XUẤT HÀNG ĐỔI', 'XUAT_HANG_DOI', `phien_ban_phuong_an giu_cho_lich_su_id dau_hieu_nhan_dang? ${docs}`],
  ['RECEIVE', 'NHẬN HÀNG ĐƠN VỊ CẤP', 'NHAN_HANG_DON_VI', `phien_ban_phuong_an nha_cung_cap_id phien_ban_thuc_nhan_id so_serial_thuc_nhan? dau_hieu_nhan_dang? tinh_trang phu_kien sai_lech ${docs}`],
  ['RETURN', 'HOÀN XUẤT HÀNG ĐỔI', 'HOAN_XUAT_HANG_DOI', `giao_dich_xuat_the_kho_id so_serial_thuc_nhan? dau_hieu_nhan_dang? so_luong_ban_lai so_luong_can_xu_ly ket_qua_kiem_tra ${docs}`],
  ['RETURN_SUPPLIER', 'TRẢ HÀNG CẤP RIÊNG CHO ĐƠN VỊ', 'TRA_HANG_CAP_RIENG_DON_VI', `thiet_bi_id nha_cung_cap_id ly_do ${docs}`],
]) action(key, label, 'items', 'replacement-items', { hanh_dong: fixed, ...(key === 'HOLD_UNIT' ? { so_luong: 1 } : {}) }, fields);
for (const [key, label, fields] of [
  ['GHI_NGHIA_VU', 'GHI NHẬN NGHĨA VỤ', 'nha_cung_cap_id giao_dich_xuat_the_kho_id? so_luong_can_bu can_cu'],
  ['GUI_THIET_BI_CU', 'GỬI THIẾT BỊ CŨ', 'nghia_vu_lich_su_id thiet_bi_cu_id nha_cung_cap_id ten_don_vi phu_kien thoi_diem'],
  ['DON_VI_NHAN_THIET_BI_CU', 'ĐƠN VỊ NHẬN THIẾT BỊ CŨ', 'nghia_vu_lich_su_id lan_gui_lich_su_id nguoi_nhan thoi_diem'],
  ['NHAN_THIET_BI_CU', 'NHẬN LẠI THIẾT BỊ CŨ', 'nghia_vu_lich_su_id thiet_bi_id tinh_trang quyen_so_huu thoi_diem'],
  ['NHAN_HANG_BU', 'GHI NHẬN HÀNG BÙ', 'nghia_vu_lich_su_id phien_ban_id so_luong serials? quyen_so_huu tinh_trang thoi_diem can_cu_so_huu so_luong_ban_lai so_luong_can_xu_ly'],
  ['CHOT_PHUONG_AN_KHAC', 'CHỐT BÙ BẰNG TIỀN', 'nghia_vu_lich_su_id noi_dung can_cu so_luong_quy_doi_duoc_chot so_tien_nghia_vu'],
  ['GHI_NCC_TU_CHOI', 'GHI NHẬN ĐƠN VỊ TỪ CHỐI', 'nghia_vu_lich_su_id ly_do quyet_dinh_xu_ly can_cu'],
]) action(`SETTLEMENT_${key}`, label, 'settlement', 'supplier-settlements', { hanh_dong: key }, `${fields} chung_tu_urls`, { afterComplete: true });
action('OLD_COMPENSATION', 'DÙNG THIẾT BỊ CŨ LÀM HÀNG BÙ', 'settlement', 'supplier-settlements', { hanh_dong: 'CHOT_PHUONG_AN_KHAC', hinh_thuc_doi_soat: 'THIET_BI_CU_LAM_HANG_BU', so_tien_nghia_vu: 0 }, 'nghia_vu_lich_su_id noi_dung can_cu so_luong_quy_doi_duoc_chot thiet_bi_id nhan_thiet_bi_cu_lich_su_id quyen_so_huu can_cu_so_huu phien_ban_id so_luong so_luong_ban_lai so_luong_can_xu_ly ket_qua_kiem_tra chung_tu_urls', { afterComplete: true });
export { actions };

export function initialActionValues(operation, detail, quoteVersion) {
  const values = {};
  for (const raw of operation.fields) {
    const name = raw.replace(/\?$/, ''), type = fieldType(name);
    values[name] = type === 'rows' ? ['phu_kien', 'sai_lech'].includes(name) ? [] : [{}] : type === 'checkbox' ? false : type === 'datetime-local' && !name.startsWith('han_') ? receiptNow() : '';
  }
  const defaults = { thiet_bi_id: detail.thiet_bi?.id, thiet_bi_cu_id: detail.thiet_bi?.id, thiet_bi_se_tra_id: detail.phuong_an_doi?.thiet_bi_thay_the_id || detail.thiet_bi?.id, hoa_don_id: detail.hoa_don?.id, hoa_don_bao_hanh_id: detail.hoa_don?.id, phien_ban_bao_gia: quoteVersion, phien_ban_phuong_an: detail.phuong_an_doi?.phien_ban, thay_the_phien_ban: operation.group === 'plan' ? detail.phuong_an_doi?.phien_ban : quoteVersion, ten_nguoi_nop_nhan: detail.nguoi_lien_he?.ten };
  for (const name of Object.keys(values)) if (defaults[name] != null) values[name] = defaults[name];
  for (const raw of operation.fields.filter(field => !field.endsWith('?'))) {
    const choices = referenceOptions(raw, detail);
    if (choices?.length === 1 && values[raw] === '') values[raw] = choices[0].value;
  }
  if ('so_serial_thuc_nhan' in values && operation.key === 'NHAN_LAI') values.so_serial_thuc_nhan = detail.thiet_bi?.so_serial || '';
  if (operation.key === 'HANDOVER') {
    values.ten_nguoi_nhan = detail.nguoi_lien_he?.ten || '';
    values.sdt_nguoi_nhan = detail.nguoi_lien_he?.sdt || '';
    values.phu_kien = (detail.tiep_nhan?.phu_kien || []).map(item => ({ ...item }));
    if (!detail.phuong_an_doi?.thiet_bi_thay_the_id) values.phien_ban_phuong_an = '';
  }
  return values;
}

export function actionBody(operation, values) {
  const body = { ...operation.fixed };
  function convert(raw, value) {
    const optional = raw.endsWith('?'), name = raw.replace(/\?$/, ''), type = fieldType(name);
    if (optional && (value === '' || value == null)) return ['serials', 'sai_lech_da_xu_ly'].includes(name) ? [] : undefined;
    if (type === 'rows') return (value || []).map(row => Object.fromEntries(arrayFields[name].map(field => [field.replace(/\?$/, ''), convert(field, row[field.replace(/\?$/, '')])]).filter(([, v]) => v !== undefined)));
    if (type === 'checkbox') return Boolean(value);
    if (name.endsWith('_urls') || name === 'serials' || name.endsWith('_ids') || name === 'sai_lech_da_xu_ly' || operation.stringList?.includes(name)) {
      const items = String(value || '').split(name.endsWith('_ids') || name === 'sai_lech_da_xu_ly' ? /[\n,]/ : /\n/).map(item => item.trim()).filter(Boolean);
      if (name.endsWith('_ids') || name === 'sai_lech_da_xu_ly') return items.map(item => {
        const id = Number(item); if (!Number.isSafeInteger(id) || id < 1) throw new Error('ID phải là số nguyên dương.'); return id;
      });
      if (!optional && !items.length && name !== 'serials') throw new Error(`Nhập ${fieldLabels[name]}.`);
      return items;
    }
    if (type === 'id' || type === 'number') {
      const number = Number(value);
      if (value === '' || !Number.isFinite(number) || number < 0 || (type === 'id' && (!Number.isSafeInteger(number) || number < 1))) throw new Error(`${fieldLabels[name]} không hợp lệ.`);
      return number;
    }
    if (type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`Nhập ${fieldLabels[name]}.`);
      return value;
    }
    if (type === 'datetime-local') {
      if (!value || !Number.isFinite(Date.parse(localTimestamp(value)))) throw new Error(`Nhập ${fieldLabels[name]}.`);
      return localTimestamp(value);
    }
    if (!optional && !String(value || '').trim()) throw new Error(`Nhập ${fieldLabels[name]}.`);
    return String(value || '').trim();
  }
  for (const raw of operation.fields) {
    const name = raw.replace(/\?$/, ''), value = convert(raw, values[name]);
    if (value === undefined) continue;
    if (name === operation.arrayName) body.hang_muc = value;
    else if (name.includes('.')) { const [parent, child] = name.split('.'); body[parent] = { [child]: value }; }
    else body[name] = value;
  }
  if (body.cach_tinh_han === 'GIU_HAN_CON_LAI') delete body.han_moi_xac_nhan;
  if (body.hang_muc && !body.hang_muc.length) throw new Error('Thêm ít nhất một hạng mục.');
  if (operation.key === 'HANDOVER') {
    if (!body.xac_nhan_khach) throw new Error('Cần xác nhận khách đã nhận đúng thiết bị và phụ kiện.');
    if (body.sdt_nguoi_nhan.length > 20 || !/^\+?[0-9][0-9 .()-]{6,19}$/.test(body.sdt_nguoi_nhan)) throw new Error('Số điện thoại người nhận không hợp lệ.');
  }
  return body;
}
