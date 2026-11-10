import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addNotification, expireReadNotifications, markNotificationsRead, notificationTarget, NOTIFICATION_CATEGORIES, notificationStatus, READ_NOTIFICATION_TTL_MS } from './notificationState.js';

const event = (category = 'ORDER_STATUS', overrides = {}) => ({
  id: 'event-1', category, itemId: 7, title: 'DH0000007', description: 'Khách hàng',
  occurredAt: '2026-10-20T04:00:00Z', changes: [{ field: 'Đơn hàng', before: 'CHO_DUYET', after: 'CHO_DONG_GOI' }], ...overrides,
});

test('aggregate real changes by category and item; deduplicate event IDs and preserve transitions', () => {
  let items = addNotification([], event());
  assert.equal(addNotification(items, event()), items);
  items = addNotification(items, event('ORDER_STATUS', { id: 'event-2', changes: [{ field: 'Đóng gói', before: 'CHUA_DONG_GOI', after: 'DANG_DONG_GOI' }] }));
  assert.equal(items.length, 1);
  assert.equal(items[0].changes.length, 2);
  items = addNotification(items, event('NEW_ORDER', { id: 'created-1' }));
  assert.equal(items.length, 2);
  items = markNotificationsRead(items, 'ORDER_STATUS');
  assert.equal(items.filter(item => item.unread).length, 1);
  items = addNotification(items, event('ORDER_STATUS', { id: 'event-3' }));
  assert.equal(items.filter(item => item.unread).length, 2);
  assert.equal(markNotificationsRead(items, 'NEW_ORDER', 7).filter(item => item.unread).length, 1);
});

test('all six categories resolve to real detail routes including partner navigation state', () => {
  for (const [category] of NOTIFICATION_CATEGORIES) {
    const items = addNotification([], event(category));
    assert.equal(items.length, 1);
    assert.ok(notificationTarget(items[0]).pathname.startsWith('/'));
  }
  assert.deepEqual(notificationTarget(event('SUPPLIER')).state, { supplierId: 7 });
  assert.deepEqual(notificationTarget(event('SHIPPING_PARTNER')).state, { partnerId: 7 });
  assert.equal(notificationStatus('CHO_DUYET'), 'Chờ duyệt');
});

test('malformed or unknown events cannot inflate the badge', () => {
  for (const bad of [null, event('fake'), event('RECEIPT', { itemId: -1 }), event('RECEIPT', { occurredAt: 'bad' }), event('RECEIPT', { changes: [{}] }), event('RECEIPT', { changes: [null] })]) {
    assert.deepEqual(addNotification([], bad), []);
  }
});

test('read items expire exactly 30 minutes after first reading; unread and renewed items stay', () => {
  const readAt = 1000;
  let items = addNotification([], event());
  items = markNotificationsRead(items, 'ORDER_STATUS', undefined, readAt);
  items = markNotificationsRead(items, 'ORDER_STATUS', undefined, readAt + 5000);
  assert.equal(items[0].readAt, readAt, 'Reading again must not restart the deadline');
  items = addNotification(items, event('NEW_ORDER', { id: 'new-order' }));
  assert.equal(expireReadNotifications(items, readAt + READ_NOTIFICATION_TTL_MS - 1).length, 2);
  const remaining = expireReadNotifications(items, readAt + READ_NOTIFICATION_TTL_MS);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].category, 'NEW_ORDER');
  assert.equal(remaining[0].unread, true);
  const renewed = addNotification(items, event('ORDER_STATUS', { id: 'updated-again' }));
  assert.equal(renewed[0].readAt, undefined);
  assert.equal(expireReadNotifications(renewed, readAt + READ_NOTIFICATION_TTL_MS).length, 2);
});
