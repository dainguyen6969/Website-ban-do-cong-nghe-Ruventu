import assert from 'node:assert/strict';
import test from 'node:test';

class MockBroadcastChannel {
  static channels = new Map();

  constructor(name) {
    this.name = name;
    this.listeners = new Set();
    const peers = MockBroadcastChannel.channels.get(name) || new Set();
    peers.add(this);
    MockBroadcastChannel.channels.set(name, peers);
  }

  addEventListener(type, listener) {
    if (type === 'message') this.listeners.add(listener);
  }

  postMessage(data) {
    MockBroadcastChannel.channels.get(this.name).forEach((peer) => {
      if (peer !== this) peer.listeners.forEach((listener) => listener({ data }));
    });
  }
}

const values = new Map();
const storageListeners = new Set();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => {
    values.set(key, value);
    storageListeners.forEach((listener) => listener({ key, newValue: value }));
  },
};
globalThis.BroadcastChannel = MockBroadcastChannel;
globalThis.window = {
  BroadcastChannel: MockBroadcastChannel,
  addEventListener: (type, listener) => { if (type === 'storage') storageListeners.add(listener); },
};

test('syncs an affected order slice between two same-origin tabs', async () => {
  const tabA = await import('./adminSync.js?tab=a');
  const tabB = await import('./adminSync.js?tab=b');
  let received = null;
  const unsubscribe = tabB.subscribeToAdminSlice('orders', (message) => { received = message; });

  const nextOrders = [{ id: 'ORD-2026-001', status: 'Đã hủy' }];
  tabA.writeSharedState('orders-test', nextOrders, { slice: 'orders', action: 'cancelled', entityId: 'ORD-2026-001' });

  assert.equal(received?.slice, 'orders');
  assert.equal(received?.entityId, 'ORD-2026-001');
  assert.deepEqual(tabB.readSharedState('orders-test', []), nextOrders);
  unsubscribe();
});

test('falls back to storage events when BroadcastChannel is unavailable', async () => {
  delete globalThis.window.BroadcastChannel;
  delete globalThis.BroadcastChannel;
  const tabA = await import('./adminSync.js?fallback-tab=a');
  const tabB = await import('./adminSync.js?fallback-tab=b');
  let received = null;
  const unsubscribe = tabB.subscribeToAdminSlice('customers', (message) => { received = message; });

  tabA.writeSharedState('customers-test', [{ id: '32', status: 'active' }], { slice: 'customers', action: 'created', entityId: '32' });

  assert.equal(received?.slice, 'customers');
  assert.equal(received?.entityId, '32');
  unsubscribe();
});
