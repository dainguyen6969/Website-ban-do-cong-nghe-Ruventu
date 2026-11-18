import assert from 'node:assert/strict';
import { test } from 'node:test';
import { custodyBlocker, freeWorkItems, referenceOptions, validateFreeWork, workflowGuide } from './warrantyExperience.js';
import { actions, actionBody, initialActionValues } from './warrantyActions.js';

const detail = {
  trang_thai_xu_ly: 'DANG_BAO_HANH', noi_dang_giu: { loai: 'DON_VI_BAO_HANH' },
  thiet_bi: { id: 83, so_serial: 'SN-83' }, thiet_bi_hien_hanh: { id: 83, so_serial: 'SN-83' },
  giao_nhan: [
    { lich_su_id: 5, su_kien: 'GUI_DON_VI', thiet_bi_id: 83, ngay: '2026-10-20T10:00:00+07:00' },
    { lich_su_id: 8, su_kien: 'NHAN_LAI' },
    { lich_su_id: 19, su_kien: 'GUI_DON_VI', thiet_bi_id: 83, ngay: '2026-10-29T17:01:00+07:00' },
    { lich_su_id: 20, su_kien: 'DON_VI_TIEP_NHAN' },
  ],
  ket_luan: [{ lich_su_id: 17, noi_dung: 'Không nhận tín hiệu' }],
};

test('free work uses eligible items from the selected conclusion and keeps the API string array', () => {
  const ticket = { ket_luan: [
    { lich_su_id: 31, hang_muc: [
      { ma_hang_muc: '1', can_cu: 'Tem nguyên vẹn', ben_chiu_phi: 'CUA_HANG', dieu_kien_bao_hanh: 'CHUA_XAC_MINH' },
      { ma_hang_muc: '2', can_cu: 'Còn hạn', ben_chiu_phi: 'DON_VI_BAO_HANH', dieu_kien_bao_hanh: 'DU_DIEU_KIEN' },
      { ma_hang_muc: 'PAID', can_cu: 'Hết hạn', ben_chiu_phi: 'KHACH_HANG', dieu_kien_bao_hanh: 'KHONG_DU_DIEU_KIEN' },
      { ma_hang_muc: 'NO-EVIDENCE', can_cu: ' ', ben_chiu_phi: 'CUA_HANG' },
    ] },
    { lich_su_id: 32, hang_muc: [{ ma_hang_muc: 'OTHER', can_cu: 'Cửa hàng duyệt', ben_chiu_phi: 'CUA_HANG' }] },
  ] };
  assert.deepEqual(freeWorkItems(ticket, '31').map(item => item.ma_hang_muc), ['1', '2']);
  const operation = actions.find(item => item.key === 'BAT_DAU_MIEN_PHI');
  const body = actionBody(operation, { noi_xu_ly: 'CUA_HANG', ket_luan_lich_su_id: '31', ma_hang_muc: '1\n2', thoi_diem: '2026-10-30T15:40:00' });
  assert.doesNotThrow(() => validateFreeWork(ticket, body));
  assert.deepEqual(body.ma_hang_muc, ['1', '2']);
  assert.equal(body.su_kien, 'BAT_DAU_CONG_VIEC');
  assert.equal(body.phien_ban_bao_gia, undefined);
  for (const code of ['123', 'PAID', 'NO-EVIDENCE', 'OTHER']) assert.throws(() => validateFreeWork(ticket, { ...body, ma_hang_muc: [code] }), /đúng kết luận/);
  assert.throws(() => validateFreeWork(ticket, { ...body, ma_hang_muc: [] }), /đúng kết luận/);
  assert.throws(() => validateFreeWork(ticket, { ...body, ket_luan_lich_su_id: 999 }), /đúng kết luận/);
});

test('supplier custody guides receipt and blocks readiness without inventing completion', () => {
  assert.equal(workflowGuide(detail).action, 'NHAN_LAI');
  assert.match(custodyBlocker('SAN_SANG_TRA', detail), /nhận thiết bị về/);
  assert.equal(custodyBlocker('NHAN_LAI', detail), '');
  assert.match(custodyBlocker('DON_VI_TIEP_NHAN', detail), /chờ đơn vị nhận/);
  assert.equal(workflowGuide({ ...detail, trang_thai_xu_ly: 'CHO_TRA_KHACH' }).step, 3);
  assert.equal(workflowGuide({ ...detail, trang_thai_xu_ly: 'HOAN_TAT' }).step, 4);
});

test('references use this ticket and exclude a previous returned trip', () => {
  assert.deepEqual(referenceOptions('lan_gui_lich_su_id', detail).map(item => item.value), [19]);
  assert.deepEqual(referenceOptions('ket_luan_lich_su_id', detail).map(item => item.value), [17]);
  assert.deepEqual(referenceOptions('thiet_bi_id', detail).map(item => item.value), [83]);
  assert.deepEqual(referenceOptions('phien_ban_phuong_an', detail), []);
  assert.equal(referenceOptions('unrelated_field', detail), null);
});

test('receipt form selects the only valid trip and retains the original API payload types', () => {
  const operation = actions.find(item => item.key === 'NHAN_LAI');
  const values = initialActionValues(operation, detail);
  assert.equal(values.lan_gui_lich_su_id, 19);
  assert.equal(values.so_serial_thuc_nhan, 'SN-83');
  const body = actionBody(operation, { ...values, tinh_trang: 'Nguyên vẹn', chung_tu_urls: 'https://example.test/receipt' });
  assert.equal(body.lan_gui_lich_su_id, 19);
  assert.equal(body.thiet_bi_id, 83);
  assert.equal(body.su_kien, 'NHAN_LAI');
  assert.deepEqual(body.sai_lech, []);
  assert.deepEqual(body.phu_kien, []);
});

test('old-device and return selectors distinguish replacement identity', () => {
  const exchanged = { ...detail, phuong_an_doi: { phien_ban: 2, thiet_bi_thay_the_id: 90 } };
  assert.deepEqual(referenceOptions('thiet_bi_cu_id', exchanged).map(item => item.value), [83]);
  assert.deepEqual(referenceOptions('thiet_bi_se_tra_id', exchanged).map(item => item.value), [90]);
  assert.deepEqual(referenceOptions('thiet_bi_ban_giao_id', exchanged).map(item => item.value), [90]);
  assert.deepEqual(referenceOptions('phien_ban_phuong_an', exchanged).map(item => item.value), [2]);
});

test('handover is offered only after readiness at the shop and debt selection uses saved audit records', () => {
  const ready = { ...detail, trang_thai_xu_ly: 'CHO_TRA_KHACH', noi_dang_giu: { loai: 'CUA_HANG' }, lich_su: { items: [
    { id: 81, loai_su_kien: 'DIEU_CHINH_HOA_DON_BAO_HANH', noi_dung: 'Duyệt ngoại lệ công nợ, giữ nguyên khoản phải thu' },
    { id: 82, loai_su_kien: 'DIEU_CHINH_HOA_DON_BAO_HANH', noi_dung: 'Hủy hóa đơn' },
    { id: 83, loai_su_kien: 'GHI_KET_LUAN', noi_dung: 'công nợ' },
  ] } };
  assert.equal(workflowGuide(ready).action, 'HANDOVER');
  assert.equal(custodyBlocker('HANDOVER', ready), '');
  assert.match(custodyBlocker('HANDOVER', detail), /sẵn sàng trả/);
  assert.match(custodyBlocker('HANDOVER', { ...ready, noi_dang_giu: { loai: 'DON_VI_BAO_HANH' } }), /cửa hàng/);
  assert.match(custodyBlocker('HANDOVER', { ...ready, trang_thai_xu_ly: 'HOAN_TAT' }), /sẵn sàng trả/);
  assert.deepEqual(referenceOptions('phe_duyet_cong_no_lich_su_id', ready).map(item => item.value), [81]);
});

test('shop intake and returned equipment recommend the appropriate inspection step', () => {
  const shop = { ...detail, noi_dang_giu: { loai: 'CUA_HANG' } };
  assert.equal(workflowGuide({ ...shop, trang_thai_xu_ly: 'TIEP_NHAN' }).action, 'BAT_DAU_KIEM_TRA');
  assert.equal(workflowGuide({ ...shop, trang_thai_xu_ly: 'DA_NHAN_LAI' }).action, 'KIEM_TRA_TIEP');
  assert.equal(custodyBlocker('SAN_SANG_TRA', shop), '');
  assert.match(custodyBlocker('NHAN_LAI', shop), /không/);
});
