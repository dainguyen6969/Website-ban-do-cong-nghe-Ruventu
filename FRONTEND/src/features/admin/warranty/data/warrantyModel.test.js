import test from 'node:test';
import assert from 'node:assert/strict';
import { mockWarrantyData } from './mockData.js';
import { dateKey, filterWarranties, nextStatus, updateMockStatus } from './warrantyModel.js';

test('filters cover contacts, tracking, finance and the whole final date', () => {
  const sample = mockWarrantyData.find(item => item.id === 'BH-113');
  assert.deepEqual(filterWarranties(mockWarrantyData, { search: sample.customerPhone }), [sample]);
  assert.deepEqual(filterWarranties(mockWarrantyData, { search: ' tb-demo-113 ' }), [sample]);
  assert.equal(filterWarranties(mockWarrantyData, { refundStatus: 'Hoàn tiền một phần', fromDate: '2026-10-13', toDate: '2026-10-13' }).length, 1);
  assert.equal(filterWarranties(mockWarrantyData, { status: 'TIẾP NHẬN', quoteStatus: 'Khách đã đồng ý' }).length, 0);
  assert.equal(dateKey('31/02/2026 23:59'), '');
  assert.equal(dateKey('29/02/2024 23:59'), '2024-02-29');
  assert.equal(dateKey('Invalid Date'), '');
  assert.equal(new Set(mockWarrantyData.map(item => item.id)).size, mockWarrantyData.length);
});

test('mock status requires confirmation, validates the live transition and never fabricates past history', () => {
  const item = { status: 'TIẾP NHẬN' };
  assert.throws(() => updateMockStatus(item, 'TIẾP NHẬN', 'ĐANG KIỂM TRA', '', false));
  assert.throws(() => updateMockStatus(item, 'TIẾP NHẬN', 'HOÀN TẤT', '', true));
  assert.equal(item.history, undefined);
  updateMockStatus(item, 'TIẾP NHẬN', 'ĐANG KIỂM TRA', ' Đã kiểm tra ngoại quan ', true);
  assert.equal(item.status, 'ĐANG KIỂM TRA');
  assert.equal(item.history.length, 1);
  assert.equal(item.history[0].description, 'Đã kiểm tra ngoại quan');
  assert.ok(dateKey(item.updated));
  assert.throws(() => updateMockStatus(item, 'TIẾP NHẬN', 'ĐANG KIỂM TRA', '', true));
  assert.equal(item.history.length, 1);
  assert.equal(nextStatus('ĐÃ NHẬN LẠI'), 'CHỜ TRẢ KHÁCH');
  assert.equal(nextStatus('CHỜ TRẢ KHÁCH'), 'HOÀN TẤT');
  assert.equal(nextStatus('HOÀN TẤT'), null);
  assert.equal(nextStatus('không hợp lệ'), null);
});
