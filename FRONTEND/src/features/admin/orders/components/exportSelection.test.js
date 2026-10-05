import test from 'node:test';
import assert from 'node:assert/strict';
import { canExport, exportPayload } from './exportSelection.js';

test('export requires exact serial counts, distinct serials across lines and a warehouse', () => {
  const groups = [{ lineId: 10, phien_ban_id: 2, so_luong_can_serial: 2, selected: [101, 102] }, { lineId: 11, phien_ban_id: 3, so_luong_can_serial: 1, selected: [103] }];
  assert.equal(canExport(1, groups), true);
  assert.equal(canExport('', groups), false);
  assert.equal(canExport(1, [{ ...groups[0], selected: [101] }]), false);
  assert.equal(canExport(1, [{ ...groups[0], selected: [101, 102, 103] }]), false);
  assert.equal(canExport(1, [groups[0], { ...groups[1], selected: [101] }]), false);
  assert.equal(canExport(1, []), true); // Products without serial requirements.
  assert.deepEqual(exportPayload('1', [{ chi_tiet_don_hang_id: 10 }, { chi_tiet_don_hang_id: 11 }, { chi_tiet_don_hang_id: 12 }], groups), {
    kho_hang_id: 1, items: [
      { chi_tiet_don_hang_id: 10, serials: [{ phien_ban_id: 2, serial_ids: [101, 102] }] },
      { chi_tiet_don_hang_id: 11, serials: [{ phien_ban_id: 3, serial_ids: [103] }] },
      { chi_tiet_don_hang_id: 12, serials: [] },
    ],
  });
});
