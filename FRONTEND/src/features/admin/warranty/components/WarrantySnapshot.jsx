import { fieldLabels, fieldOptions } from '../data/warrantyActions';
import { displayDate, money, quoteLabels, statusLabels, paymentLabels, refundLabels } from '../data/warrantyContract';
import { custodyLabels, eventLabels } from '../data/warrantyExperience';
const labels = { ...fieldLabels, chi_phi_ncc_xac_nhan: 'Chi phí đơn vị xác nhận', da_chi: 'Đã chi', da_nhan_hoan: 'Đã nhận hoàn', con_phai_chi: 'Còn phải chi', con_phai_nhan_hoan: 'Còn phải nhận hoàn', dieu_kien_dat_coc: 'Điều kiện đặt cọc', khoan_phai_thu_hieu_luc: 'Khoản phải thu hiệu lực', tong_can_hoan: 'Tổng cần hoàn', chi_tiet_phi: 'Chi tiết phí', phieu_thu_chi_id: 'ID phiếu thu / chi', id: 'ID', phien_ban: 'Phiên bản', trang_thai: 'Trạng thái', quyet_dinh: 'Quyết định', da_duyet: 'Đã phê duyệt', khach_dong_y: 'Khách đồng ý', da_huy: 'Đã hủy', da_ban_giao: 'Đã bàn giao', han_bao_hanh_ap_dung: 'Hạn bảo hành áp dụng', so_tien_con_doi_soat: 'Số tiền còn đối soát', so_luong_con_bu: 'Số lượng còn bù', so_luong_da_bu: 'Số lượng đã bù', da_giai_quyet: 'Đã giải quyết', nghia_vu: 'Các nghĩa vụ', nghia_vu_gui_thiet_bi_cu_con_mo: 'Còn nghĩa vụ gửi thiết bị cũ', tong_tien_khach: 'Tổng tiền khách', chi_tiet_phi_id: 'ID chi tiết phí', su_kien: 'Sự kiện', ngay: 'Thời điểm', lich_su_id: 'ID lịch sử', thiet_bi_thay_the_id: 'ID thiết bị thay thế', thiet_bi_thuc_nhan_id: 'ID thiết bị thực nhận', da_xu_ly: 'Đã xử lý', loai_su_kien: 'Loại sự kiện', thanh_tien_khach: 'Thành tiền khách', ngay_tao: 'Thời điểm tạo', nguoi_thuc_hien_id: 'ID người thao tác', so_tien_toi_thieu: 'Số tiền tối thiểu', so_serial: 'Serial', ma_theo_doi: 'Mã theo dõi', han_bao_hanh: 'Hạn bảo hành', can_cu_tinh_han: 'Căn cứ tính hạn', la_thiet_bi_hien_hanh: 'Thiết bị hiện hành' };
const enums = { ...quoteLabels, ...statusLabels, ...paymentLabels, ...refundLabels, HIEU_LUC: 'Hiệu lực', HUY: 'Đã hủy', CHUA_CO_KET_QUA: 'Chưa có kết quả', SUA_THANH_CONG: 'Sửa thành công', KHONG_SUA_DUOC: 'Không sửa được', KHONG_THUC_HIEN_SUA: 'Không thực hiện sửa', DOI_SAN_PHAM: 'Đổi sản phẩm' };
export function displayValue(value, field = '') {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (field === 'loai' && custodyLabels[value]) return custodyLabels[value];
  if (['su_kien', 'loai_su_kien'].includes(field) && eventLabels[value]) return eventLabels[value];
  if (enums[value]) return enums[value];
  if (fieldOptions[field]?.[value]) return fieldOptions[field][value];
  if (/(?:tien|chi_phi|don_gia|da_thu|da_hoan|da_chi|da_nhan_hoan|con_phai)/.test(field) && !field.endsWith('_id') && Number.isFinite(Number(value))) return money(value);
  if (/^\d{4}-\d\d-\d\dT/.test(String(value))) return displayDate(value);
  return String(value);
}
export default function WarrantySnapshot({ value, showReferences = false }) {
  if (value == null || (Array.isArray(value) && !value.length)) return <p className="w-shell-note">Chưa có dữ liệu đã lưu.</p>;
  if (Array.isArray(value)) return <div>{value.map((item, index) => <div className="w-shell-subsection" key={item?.id ?? index}>{typeof item === 'object' ? <WarrantySnapshot value={item} /> : <span>{displayValue(item)} </span>}</div>)}</div>;
  if (typeof value !== 'object') return <p>{displayValue(value)}</p>;
  const entries = Object.entries(value), technical = ([key]) => /(^id$|_ids?$)/.test(key);
  const visible = showReferences ? entries : entries.filter(entry => !technical(entry));
  const references = showReferences ? [] : entries.filter(technical);
  return <div className="w-snapshot-block"><dl className="w-shell-fields w-snapshot">{visible.map(([key, item]) => <div key={key}><dt>{labels[key] || key.replaceAll('_', ' ')}</dt><dd>{item != null && typeof item === 'object' ? <WarrantySnapshot value={item} /> : displayValue(item, key)}</dd></div>)}</dl>{references.length > 0 && <details className="w-reference-details"><summary>Mã tham chiếu để đối chiếu</summary><WarrantySnapshot value={Object.fromEntries(references)} showReferences /></details>}</div>;
}
