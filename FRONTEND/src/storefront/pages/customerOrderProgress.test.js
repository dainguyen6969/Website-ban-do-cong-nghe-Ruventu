import assert from 'node:assert/strict';
import test from 'node:test';
import { customerOrderProgress } from './customerOrderProgress.js';

test('Progress follows order status without marking future stages complete', () => {
  for (const [status, current] of [['CHO_DUYET', 1], ['CHO_THANH_TOAN', 2], ['CHO_DONG_GOI', 2], ['DANG_GIAO_HANG', 3], ['HOAN_THANH', 4]]) {
    const steps = customerOrderProgress({ trang_thai_don_hang: status });
    assert.equal(steps[current].state, 'active');
    assert.ok(steps.slice(0, current).every(step => step.state === 'done'));
    assert.ok(steps.slice(current + 1).every(step => step.state === 'pending'));
  }
});

test('Pickup uses waiting-for-pickup wording; cancellation and unknown status do not invent progress', () => {
  const pickup = customerOrderProgress({ trang_thai_don_hang: 'CHO_LAY_HANG', hinh_thuc_nhan_hang: 'NHAN_TAI_CUA_HANG' });
  assert.equal(pickup[3].title, 'CHỜ NHẬN HÀNG');
  assert.equal(pickup[3].state, 'active');
  for (const status of ['HUY_HANG', 'UNKNOWN']) {
    const steps = customerOrderProgress({ trang_thai_don_hang: status });
    assert.equal(steps[0].state, 'done');
    assert.ok(steps.slice(1).every(step => step.state === 'pending'));
  }
});
