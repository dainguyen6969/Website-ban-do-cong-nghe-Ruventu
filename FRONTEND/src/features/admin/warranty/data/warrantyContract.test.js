import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionBody, actions, initialActionValues } from './warrantyActions.js';
import {
  intakeAssessment, intakeBody, intakeContact, intakeDeadlineCheck, intakeDeadlineStatus, intakeDescription,
  intakeErrors, intakeFreeChecks, intakeReachableStep, intakeRequiredChecks, intakeSearch,
  intakeStepErrors, localTimestamp, listParams, receiptNow,
} from './warrantyContract.js';
import { validateImageFiles } from '../../../media/api/imageValidation.js';

test('intake search identifies codes and formatted phones while preserving numeric serials and product names', () => {
  for (const [input, criterion, value] of [
    [' SN-ABC123 ', 'serial', 'SN-ABC123'],
    ['1234567890123', 'serial', '1234567890123'],
    ['ASUS RTX 5070', 'serial', 'ASUS RTX 5070'],
    ['dh20261118001', 'orderId', 'DH20261118001'],
    ['TB-f84a-1234', 'trackingCode', 'TB-f84a-1234'],
    ['090 123 4567', 'customerPhone', '0901234567'],
    ['+84 (90) 123-4567', 'customerPhone', '0901234567'],
    ['# 123', 'requestId', '123'],
    ['', 'serial', ''],
  ]) assert.deepEqual(intakeSearch(input), { criterion, value });
});

test('wizard requires each step and invalidates later steps when earlier information changes', () => {
  const form = { contact: '', phone: '', reason: [], condition: [], checks: [], receivedAt: receiptNow(), identification: '', photos: [], accessories: [] };
  const device = { thiet_bi_id: 700, co_the_tiep_nhan: true };
  assert.equal(intakeReachableStep(null, form), 0);
  assert.equal(intakeReachableStep(device, form), 1);
  const verified = { ...form, checks: intakeRequiredChecks };
  assert.equal(intakeReachableStep(device, verified), 2);
  const complete = { ...verified, contact: 'An', phone: '0901234567', reason: ['Không lên nguồn'], condition: ['Ngoại quan nguyên vẹn'] };
  assert.equal(intakeReachableStep(device, complete), 3);
  assert.equal(intakeReachableStep(device, { ...complete, checks: intakeRequiredChecks.slice(1) }), 1);
  assert.ok(intakeStepErrors(device, { ...complete, phone: '123' }, 2).phone);
  assert.ok(intakeStepErrors(device, { ...complete, checks: intakeFreeChecks }, 1).checks);
  assert.ok(intakeStepErrors({ ...device, co_the_tiep_nhan: false }, complete, 1).device);
});

test('five required checks allow paid intake and only ten valid checks allow free intake', () => {
  assert.equal(new Set([...intakeRequiredChecks, ...intakeFreeChecks]).size, 10);
  const form = { checks: [...intakeRequiredChecks, ...intakeFreeChecks], receivedAt: '2026-11-19T10:00' };
  const device = { thiet_bi_id: 700, han_bao_hanh: '2026-11-19T10:00:00+07:00' };
  assert.equal(intakeAssessment(device, { ...form, checks: form.checks.slice(1) }).eligibility, 'CHUA_XAC_MINH');
  assert.equal(intakeAssessment(device, { ...form, checks: intakeRequiredChecks }).eligibility, 'KHONG_DU_DIEU_KIEN');
  assert.equal(intakeAssessment(device, form).eligibility, 'DU_DIEU_KIEN');
  for (const ineligible of [{ ...device, han_bao_hanh: null }, { ...device, han_bao_hanh: '2026-11-18T10:00:00+07:00' }, { ...device, thiet_bi_id: null }]) {
    const result = intakeAssessment(ineligible, form);
    assert.equal(result.eligibility, 'KHONG_DU_DIEU_KIEN');
    assert.equal(result.total, 9);
    assert.ok(!result.verification.includes(intakeDeadlineCheck));
  }
  assert.equal(intakeDeadlineStatus(device, '2026-11-19T10:01'), 'expired');
  assert.equal(intakeDeadlineStatus(undefined, form.receivedAt), 'unknown');
});

test('intake prioritizes saved contact and serializes all applied custom entries', () => {
  const request = { ten_nguoi_lien_he: ' An ' };
  const customer = { ho_ten: 'Bình', so_dien_thoai: '0901234567' };
  assert.deepEqual(intakeContact(request, customer), { contact: 'An', phone: '0901234567' });
  const form = { reason: ['Không lên hình', 'Không nhận sạc'], reasonOther: ['Sọc khi tải nặng', 'Chỉ lỗi khi cắm sạc'], condition: [], accessories: [] };
  assert.equal(intakeDescription(form, 'reason'), 'Không lên hình · Không nhận sạc · Sọc khi tải nặng · Chỉ lỗi khi cắm sạc');
  assert.equal(intakeDescription({ ...form, reason: [], reasonOther: ['Lý do của phiếu đã lưu'] }, 'reason'), 'Lý do của phiếu đã lưu');
  assert.equal(intakeStepErrors(null, { ...form, reason: [], reasonOther: [] }, 2).reason, 'Chọn lý do bảo hành.');
});

test('legacy sold serial never becomes a no-serial intake when the API has no device identity', () => {
  const device = { thiet_bi_id: null, so_serial_id: 3729, so_serial: 'RV26-S659-010', chi_tiet_don_hang_id: 667, co_the_tiep_nhan: true };
  const form = { checks: intakeRequiredChecks };
  assert.ok(intakeStepErrors(device, form, 1).device);
  assert.equal(intakeReachableStep(device, form), 1);
  assert.throws(() => intakeBody(device, form), /chưa có hồ sơ thiết bị/);
});

test('upload validation follows the existing backend type and per-file size limits', () => {
  assert.doesNotThrow(() => validateImageFiles([{ type: 'image/png', size: 5 * 1024 * 1024 }]));
  assert.throws(() => validateImageFiles([{ type: 'image/gif', size: 10 }]), /JPG/);
  assert.throws(() => validateImageFiles([{ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }]), /5 MB/);
});

test('intake accepts up to 20 accessory lines and 20 photos independently', () => {
  const device = { thiet_bi_id: 700 };
  const item = { name: 'Cáp', quantity: 2 };
  const photo = { url: 'https://example.test/evidence.png' };
  const form = {
    contact: 'An', phone: '0901234567', reason: ['Không lên nguồn'], condition: ['Ngoại quan nguyên vẹn'],
    receivedAt: receiptNow(), accessories: Array(20).fill(item), photos: Array(20).fill(photo),
  };
  assert.deepEqual(intakeStepErrors(device, form, 2), {});
  assert.deepEqual(intakeStepErrors(device, { ...form, accessories: [...form.accessories, item] }, 2), {
    accessories: 'Tối đa 20 dòng phụ kiện.',
  });
  assert.deepEqual(intakeStepErrors(device, { ...form, photos: [...form.photos, photo] }, 2), {
    photos: 'Tối đa 20 ảnh tiếp nhận.',
  });
});

test('intake keeps long descriptions without truncation or a character cap', () => {
  const form = {
    contact: 'An', phone: '0901234567', reason: ['Không lên nguồn'], condition: ['Trầy xước'],
    reasonOther: ['Không nhận điện '.repeat(1100).trim()],
    conditionOther: ['Nhiều vết xước '.repeat(1200).trim()],
    receivedAt: receiptNow(), checks: intakeRequiredChecks, unit: '', note: '', accessories: [], photos: [],
  };
  const device = { thiet_bi_id: 700, co_the_tiep_nhan: true };
  assert.deepEqual(intakeErrors(device, form), []);
  const body = intakeBody(device, form);
  assert.equal(body.ly_do_bao_hanh, `Không lên nguồn · ${form.reasonOther[0]}`);
  assert.equal(body.tinh_trang_tiep_nhan, `Trầy xước · ${form.conditionOther[0]}`);
});

test('intake uses device XOR purchase line, preserves no-serial identity and never sends financial or actor fields', () => {
  const form = { contact: ' An ', phone: '0901000101', reason: ['Không lên nguồn'], condition: ['Ngoại quan nguyên vẹn'], checks: intakeRequiredChecks, receivedAt: receiptNow(), identification: 'Tem A', unit: '', note: '', photos: [{ url: '/media/a.jpg' }], accessories: [{ name: ' Hộp ', quantity: '1' }] };
  const tracked = { thiet_bi_id: 700, co_the_tiep_nhan: true };
  assert.deepEqual(intakeErrors(tracked, form), []);
  assert.equal(intakeBody(tracked, form, 880).thiet_bi_id, 700);
  assert.equal('chi_tiet_don_hang_id' in intakeBody(tracked, form), false);
  const body = intakeBody({ chi_tiet_don_hang_id: 2002 }, form);
  assert.equal(body.dau_hieu_nhan_dang, 'Tem A');
  assert.equal('thiet_bi_id' in body, false);
  assert.equal('nguoi_tiep_nhan_id' in body, false);
  assert.equal('tong_tien' in body, false);
  assert.equal(body.dieu_kien_bao_hanh, 'KHONG_DU_DIEU_KIEN');
  assert.equal(body.can_cu_xac_minh, intakeRequiredChecks.join('\n'));
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

test('ready-to-return uses original intake for the same device and handover uses the saved ready check', () => {
  const ready = actions.find(item => item.key === 'SAN_SANG_TRA');
  const handover = actions.find(item => item.key === 'HANDOVER');
  const detail = {
    thiet_bi: { id: 700 },
    tiep_nhan: { tinh_trang: 'Trầy xước', phu_kien: [{ ten: 'Cáp', so_luong: 2 }] },
  };
  const values = initialActionValues(ready, detail);
  assert.equal(values.tinh_trang, 'Trầy xước');
  assert.deepEqual(values.phu_kien, detail.tiep_nhan.phu_kien);
  assert.notEqual(values.phu_kien[0], detail.tiep_nhan.phu_kien[0]);
  const exchanged = initialActionValues(ready, { ...detail, phuong_an_doi: { thiet_bi_thay_the_id: 800 } });
  assert.equal(exchanged.tinh_trang, '');
  assert.deepEqual(exchanged.phu_kien, []);
  const saved = actionBody(ready, { ...values, tinh_trang: 'Đã kiểm tra hoạt động', phu_kien: [], ket_qua_xu_ly: 'SUA_THANH_CONG', can_cu_kiem_tra: 'Đã kiểm tra' });
  const transfer = initialActionValues(handover, { ...detail, xu_ly_tiep: {
    tinh_trang_san_sang_tra: saved.tinh_trang, phu_kien_san_sang_tra: saved.phu_kien,
  } });
  assert.equal(transfer.tinh_trang, 'Đã kiểm tra hoạt động');
  assert.deepEqual(transfer.phu_kien, []);
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
