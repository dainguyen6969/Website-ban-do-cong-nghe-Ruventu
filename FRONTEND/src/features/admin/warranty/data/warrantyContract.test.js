import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionBody, actions, initialActionValues } from './warrantyActions.js';
import { intakeBody, intakeErrors, intakeReachableStep, intakeStepErrors, localTimestamp, listParams, receiptNow } from './warrantyContract.js';
import { validateImageFiles } from '../../../media/api/imageValidation.js';

test('wizard requires each step and invalidates later steps when earlier information changes', () => {
  const form = { contact: '', phone: '', reason: '', condition: '', verification: '', eligibility: '', receivedAt: receiptNow(), identification: '', photos: [], accessories: [] };
  const device = { thiet_bi_id: 700, co_the_tiep_nhan: true };
  assert.equal(intakeReachableStep(null, form), 0);
  assert.equal(intakeReachableStep(device, form), 1);
  const verified = { ...form, eligibility: 'CHUA_XAC_MINH', verification: 'Đã đối chiếu giao dịch' };
  assert.equal(intakeReachableStep(device, verified), 2);
  const complete = { ...verified, contact: 'An', phone: '0901234567', reason: 'Không lên nguồn', condition: 'Nguyên vẹn' };
  assert.equal(intakeReachableStep(device, complete), 3);
  assert.equal(intakeReachableStep(device, { ...complete, verification: '' }), 1);
  assert.ok(intakeStepErrors(device, { ...complete, phone: '123' }, 2).phone);
  assert.ok(intakeStepErrors(device, { ...complete, eligibility: 'DU_DIEU_KIEN' }, 1).eligibility);
  assert.ok(intakeStepErrors({ ...device, co_the_tiep_nhan: false }, complete, 1).device);
});

test('legacy sold serial never becomes a no-serial intake when the API has no device identity', () => {
  const device = { thiet_bi_id: null, so_serial_id: 3729, so_serial: 'RV26-S659-010', chi_tiet_don_hang_id: 667, co_the_tiep_nhan: true };
  const form = { eligibility: 'CHUA_XAC_MINH', verification: 'Đối chiếu' };
  assert.ok(intakeStepErrors(device, form, 1).device);
  assert.equal(intakeReachableStep(device, form), 1);
  assert.throws(() => intakeBody(device, form), /chưa có hồ sơ thiết bị/);
});

test('upload validation follows the existing backend type and per-file size limits', () => {
  assert.doesNotThrow(() => validateImageFiles([{ type: 'image/png', size: 5 * 1024 * 1024 }]));
  assert.throws(() => validateImageFiles([{ type: 'image/gif', size: 10 }]), /JPG/);
  assert.throws(() => validateImageFiles([{ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }]), /5 MB/);
});

test('intake uses device XOR purchase line, preserves no-serial identity and never sends financial or actor fields', () => {
  const form = { contact: ' An ', phone: '0901000101', reason: 'Lỗi', condition: 'Nguyên vẹn', verification: 'Đã đối chiếu', eligibility: 'CHUA_XAC_MINH', receivedAt: receiptNow(), identification: 'Tem A', unit: '', note: '', photos: [{ url: '/media/a.jpg' }], accessories: [{ name: ' Hộp ', quantity: '1' }] };
  const tracked = { thiet_bi_id: 700, co_the_tiep_nhan: true };
  assert.deepEqual(intakeErrors(tracked, form), []);
  assert.equal(intakeBody(tracked, form, 880).thiet_bi_id, 700);
  assert.equal('chi_tiet_don_hang_id' in intakeBody(tracked, form), false);
  const body = intakeBody({ chi_tiet_don_hang_id: 2002 }, form);
  assert.equal(body.dau_hieu_nhan_dang, 'Tem A');
  assert.equal('thiet_bi_id' in body, false);
  assert.equal('nguoi_tiep_nhan_id' in body, false);
  assert.equal('tong_tien' in body, false);
  assert.deepEqual(body.phu_kien, [{ ten: 'Hộp', so_luong: 1 }]);
  assert.ok(intakeErrors(tracked, { ...form, receivedAt: '2099-01-01T10:00' }).length);
  assert.ok(intakeErrors({ ...tracked, co_the_tiep_nhan: false }, form).length);
});

test('money request keeps an explicit invoice and actual amount, rejects invalid and empty references', () => {
  const operation = actions.find(item => item.key === 'HOAN_KHACH');
  const values = { hoa_don_bao_hanh_id: '42', so_tien: '50000.50', phuong_thuc_thanh_toan: 'CHUYEN_KHOAN', ten_nguoi_nop_nhan: 'An', ngay_ghi_nhan: '2026-10-28T10:30', ma_chung_tu_tham_chieu: 'REF1', chung_tu_urls: '/media/ref1.jpg\n/media/ref2.jpg' };
  const body = actionBody(operation, values);
  assert.equal(body.hoa_don_bao_hanh_id, 42);
  assert.equal(body.so_tien, 50000.5);
  assert.equal(body.ngay_ghi_nhan, '2026-10-28T10:30:00+07:00');
  assert.deepEqual(body.chung_tu_urls, ['/media/ref1.jpg', '/media/ref2.jpg']);
  assert.throws(() => actionBody(operation, { ...values, hoa_don_bao_hanh_id: '1.5' }));
  assert.throws(() => actionBody(operation, { ...values, so_tien: '' }));
  assert.throws(() => actionBody(operation, { ...values, so_tien: '-1' }));
  assert.deepEqual(actionBody(operation, { ...values, chung_tu_urls: 'https://example.test/a,b.jpg' }).chung_tu_urls, ['https://example.test/a,b.jpg']);
});

test('debt keeps a date-only deadline and non-serial supplier receipts send an empty serial array', () => {
  const debt = actionBody(actions.find(item => item.key === 'INVOICE_DUYET_CONG_NO'), { hoa_don_id: '42', so_tien_cong_no_toi_da: '50000', han_thanh_toan: '2026-10-30', ly_do: 'Hẹn thanh toán' });
  assert.equal(debt.han_thanh_toan, '2026-10-30');
  const receipt = actionBody(actions.find(item => item.key === 'SETTLEMENT_NHAN_HANG_BU'), { nghia_vu_lich_su_id: '9', phien_ban_id: '101', so_luong: '1', serials: '', quyen_so_huu: 'CUA_HANG', tinh_trang: 'Nguyên vẹn', thoi_diem: '2026-10-28T09:00', can_cu_so_huu: 'Đối soát', so_luong_ban_lai: '1', so_luong_can_xu_ly: '0', chung_tu_urls: '/media/ref.jpg' });
  assert.deepEqual(receipt.serials, []);
});

test('operation payloads keep separate free-work and paid-work contracts without faking completion', () => {
  const common = { noi_xu_ly: 'CUA_HANG', thoi_diem: '2026-10-28T09:00' };
  const free = actionBody(actions.find(item => item.key === 'BAT_DAU_MIEN_PHI'), { ...common, ket_luan_lich_su_id: '9', ma_hang_muc: 'HM1\nHM2' });
  assert.deepEqual(free.ma_hang_muc, ['HM1', 'HM2']);
  assert.equal('chi_tiet_phi_ids' in free, false);
  const paid = actionBody(actions.find(item => item.key === 'BAT_DAU_CONG_VIEC'), { ...common, phien_ban_bao_gia: '2', chi_tiet_phi_ids: '10\n11' });
  assert.deepEqual(paid.chi_tiet_phi_ids, [10, 11]);
  assert.equal('ket_luan_lich_su_id' in paid, false);
  assert.equal(actions.some(item => item.fixed?.trang_thai_xu_ly === 'HOAN_TAT'), false);
  const ready = actionBody(actions.find(item => item.key === 'SAN_SANG_TRA'), { thiet_bi_se_tra_id: '700', ket_qua_xu_ly: 'SUA_THANH_CONG', tinh_trang: 'Hoạt động', phu_kien: [], can_cu_kiem_tra: 'Đã kiểm tra' });
  assert.deepEqual(ready.sai_lech_da_xu_ly, []);
  assert.equal(new Set(actions.map(item => item.key)).size, actions.length);
  assert.deepEqual([...new Set(actions.map(item => item.endpoint))].sort(), ['events', 'handover', 'invoice', 'money-transactions', 'quote-events', 'quotes', 'replacement-items', 'replacement-plan', 'status', 'supplier-settlements']);
});

test('handover requires customer acknowledgment, evidence and valid recipient without inventing completion fields', () => {
  const operation = actions.find(item => item.key === 'HANDOVER');
  const values = initialActionValues(operation, { thiet_bi: { id: 700 }, nguoi_lien_he: { ten: 'An', sdt: '0901234567' }, tiep_nhan: { phu_kien: [{ ten: 'Cáp', so_luong: 1 }] } });
  assert.equal(values.thiet_bi_ban_giao_id, 700);
  assert.equal(values.xac_nhan_khach, false);
  assert.equal(values.ten_nguoi_nhan, 'An');
  const valid = { ...values, tinh_trang: 'Đã kiểm tra hoạt động tốt', bang_chung_urls: 'https://example.test/receipt.png', xac_nhan_khach: true };
  const body = actionBody(operation, valid);
  assert.equal(operation.endpoint, 'handover');
  assert.deepEqual(Object.keys(body).sort(), ['thiet_bi_ban_giao_id', 'ten_nguoi_nhan', 'sdt_nguoi_nhan', 'thoi_diem', 'tinh_trang', 'phu_kien', 'xac_nhan_khach', 'bang_chung_urls'].sort());
  assert.deepEqual(body.phu_kien, [{ ten: 'Cáp', so_luong: 1 }]);
  assert.equal(body.thiet_bi_ban_giao_id, 700);
  assert.throws(() => actionBody(operation, { ...valid, xac_nhan_khach: false }), /xác nhận khách/);
  assert.throws(() => actionBody(operation, { ...valid, sdt_nguoi_nhan: 'abc' }), /điện thoại/);
  assert.throws(() => actionBody(operation, { ...valid, bang_chung_urls: '' }), /bằng chứng/);
  assert.throws(() => actionBody(operation, { ...valid, thiet_bi_ban_giao_id: '' }), /không hợp lệ/);
  assert.equal(actionBody(operation, { ...valid, phe_duyet_cong_no_lich_su_id: '81' }).phe_duyet_cong_no_lich_su_id, 81);
  const exchanged = initialActionValues(operation, { thiet_bi: { id: 700 }, phuong_an_doi: { phien_ban: 2, thiet_bi_thay_the_id: 800 } });
  assert.equal(exchanged.thiet_bi_ban_giao_id, 800);
  assert.equal(exchanged.phien_ban_phuong_an, 2);
});

test('quote lines use actual numbers and booleans without sending server-calculated totals', () => {
  const operation = actions.find(item => item.key === 'QUOTE');
  const body = actionBody(operation, { ket_luan_lich_su_id: '12', quoteItems: [{ ma_hang_muc: 'HM1', noi_dung: 'Kiểm tra', so_luong: '1', don_gia_khach: '150000', dieu_kien_bao_hanh: 'KHONG_DU_DIEU_KIEN', ben_chiu_phi: 'KHACH_HANG', van_phat_sinh_khi_khong_sua: true }], thoi_gian_du_kien: '3 ngày', han_phan_hoi: '2026-10-29T18:00', 'dieu_kien_dat_coc.so_tien_toi_thieu': '50000', dieu_kien_thanh_toan: 'Trước bàn giao', ly_do: 'Đã kiểm tra' });
  assert.deepEqual(body.dieu_kien_dat_coc, { so_tien_toi_thieu: 50000 });
  assert.equal(body.hang_muc[0].don_gia_khach, 150000);
  assert.equal(body.hang_muc[0].van_phat_sinh_khi_khong_sua, true);
  assert.equal('tong_tien_khach' in body, false);
  assert.equal('chi_phi_ncc_du_kien' in body.hang_muc[0], false);
  const defaults = initialActionValues(operation, {}, 2);
  assert.equal(defaults.thay_the_phien_ban, 2);
});

test('server filters and timestamps preserve raw backend enums and Vietnam time', () => {
  assert.match(receiptNow(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
  assert.equal(localTimestamp('2026-10-29T09:43:33.800'), '2026-10-29T09:43:33.800+07:00');
  assert.equal(listParams({ search: ' abc ', status: 'DANG_KIEM_TRA' }, 0, 20).keyword, 'abc');
  assert.equal(listParams({ search: '', status: 'DANG_KIEM_TRA' }, 0, 20).trang_thai_xu_ly, 'DANG_KIEM_TRA');
  assert.equal(localTimestamp('2026-10-28T09:00'), '2026-10-28T09:00:00+07:00');
});
