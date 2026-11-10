import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notifyMaintenance, SETTINGS_CHANGED } from './maintenanceState.js';

test('only an explicit backend maintenance response triggers the maintenance screen check', () => {
  const previous = globalThis.window;
  const events = [];
  globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
  try {
    assert.equal(notifyMaintenance(503, { errors: [{ code: 'SYSTEM_MAINTENANCE' }] }), true);
    assert.equal(notifyMaintenance(503, { message: 'Service unavailable' }), false);
    assert.equal(notifyMaintenance(403, { errors: [{ code: 'SYSTEM_MAINTENANCE' }] }), false);
    assert.equal(notifyMaintenance(500, null), false);
    assert.deepEqual(events, [SETTINGS_CHANGED]);
  } finally { globalThis.window = previous; }
});
