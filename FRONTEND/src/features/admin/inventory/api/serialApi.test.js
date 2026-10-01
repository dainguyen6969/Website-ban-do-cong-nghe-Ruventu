import assert from 'node:assert/strict';
import test from 'node:test';
import { nextWarehouseStatus } from './serialStatus.js';

test('only toggles serials between warehouse and damaged states', () => {
  assert.equal(nextWarehouseStatus('TRONG_KHO'), 'LOI');
  assert.equal(nextWarehouseStatus('LOI'), 'TRONG_KHO');
  assert.equal(nextWarehouseStatus('DA_BAN'), null);
  assert.equal(nextWarehouseStatus('DANG_BAO_HANH'), null);
});
