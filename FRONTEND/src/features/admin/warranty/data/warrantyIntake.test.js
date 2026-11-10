import test from 'node:test';
import assert from 'node:assert/strict';
import { mockWarrantyData, mockWarrantyDevices, mockIntakeRequests } from './mockData.js';
import { createMockWarranty, deviceIntakeBlocker, filterWarranties, intakeRequestById, lookupWarrantyDevices, receiptNow, saveMockIntakeRequest, validateWarrantyIntake } from './warrantyModel.js';

const device = mockWarrantyDevices.find(item => item.serial === 'SSD1T-SN-002');
const draft = () => ({ eligibility: 'Chưa xác minh', verification: ' Đối chiếu đơn gốc ', reason: ' Không nhận ổ cứng ', condition: ' Tem còn nguyên ', receivedAt: receiptNow(), identification: '', unit: '', note: '', accessories: [{ name: 'Hộp', quantity: 1 }], photos: [] });

test('lookup is exact, normalizes codes and phone, and returns every device in an order', () => {
  for (const criterion of ['serial', 'orderId', 'trackingCode', 'customerPhone', 'requestId']) {
    assert.deepEqual(lookupWarrantyDevices(criterion, ''), []);
    assert.deepEqual(lookupWarrantyDevices(criterion, '   '), []);
    assert.deepEqual(lookupWarrantyDevices(criterion, 'KHONG-TON-TAI'), []);
  }
  assert.deepEqual(lookupWarrantyDevices('serial', ' ssd1t-sn-002 '), [device]);
  assert.deepEqual(lookupWarrantyDevices('serial', 'SSD1T'), []);
  assert.deepEqual(lookupWarrantyDevices('serial', '#'), []);
  assert.deepEqual(lookupWarrantyDevices('customerPhone', '().-'), []);
  const order = lookupWarrantyDevices('orderId', ' # 1013 ');
  assert.ok(order.includes(device));
  assert.ok(order.some(item => item.serial === 'SSD2T-SN-002'));
  assert.ok(order.length > 1);
  assert.ok(lookupWarrantyDevices('customerPhone', '+84912333444').includes(device));
  const tracked = mockWarrantyData.find(item => item.trackingCode);
  assert.ok(lookupWarrantyDevices('trackingCode', ` ${tracked.trackingCode.toLowerCase()} `).some(item => item.serial === tracked.serial));
});

test('intake blocks absent, active, replaced, returned and unsold serials without treating expiry as free approval', () => {
  assert.ok(deviceIntakeBlocker(null));
  assert.ok(deviceIntakeBlocker(mockWarrantyDevices.find(item => !item.serial)));
  assert.match(deviceIntakeBlocker(mockWarrantyDevices.find(item => item.serial === 'SSD1T-SN-001')), /hoạt động/);
  assert.match(deviceIntakeBlocker(mockWarrantyDevices.find(item => item.replacedBy)), /đã được thay/);
  assert.match(deviceIntakeBlocker({ serial: 'LOCKED', returnLocked: true }), /trả hàng/);
  assert.match(deviceIntakeBlocker({ serial: 'STOCK', serialStatus: 'TRONG KHO' }), /đã được bán/);
  assert.equal(deviceIntakeBlocker(device), '');
  assert.deepEqual(validateWarrantyIntake(device, draft()), {});
  for (const field of ['reason', 'condition', 'verification']) assert.ok(validateWarrantyIntake(device, { ...draft(), [field]: ' ' })[field]);
  assert.ok(validateWarrantyIntake(device, { ...draft(), receivedAt: '2026-02-31T10:00' }).receivedAt);
  assert.ok(validateWarrantyIntake(device, { ...draft(), receivedAt: '2099-01-01T10:00' }).receivedAt);
  assert.ok(validateWarrantyIntake(device, { ...draft(), accessories: [{ name: 'Hộp', quantity: -1 }] }).accessories);
});

test('pending requests restore the canonical device and a detached draft without creating a warranty', () => {
  const count = mockWarrantyData.length;
  const form = draft();
  assert.throws(() => saveMockIntakeRequest(device, { ...form, verification: '' }, 'Chờ xác minh'));
  const request = saveMockIntakeRequest(device, form, 'Chờ xác minh');
  assert.equal(mockWarrantyData.length, count);
  assert.deepEqual(lookupWarrantyDevices('requestId', `#${request.id}`), [device]);
  assert.equal(intakeRequestById(request.id), request);
  form.accessories[0].name = 'Đã sửa ở giao diện';
  assert.equal(request.form.accessories[0].name, 'Hộp');
  const total = mockIntakeRequests.length;
  saveMockIntakeRequest(device, draft(), 'Từ chối tiếp nhận', request.id);
  assert.equal(mockIntakeRequests.length, total);
  assert.equal(request.status, 'Từ chối tiếp nhận');
});

test('confirmed creation carries real mock identity, dates and evidence, creates unique IDs and rechecks duplicate state', () => {
  const count = mockWarrantyData.length;
  const form = draft();
  assert.throws(() => createMockWarranty(device.serial, form, false));
  assert.throws(() => createMockWarranty('KHONG-TON-TAI', form, true));
  assert.throws(() => createMockWarranty([device.serial], form, true));
  assert.throws(() => createMockWarranty(device.serial, { ...form, condition: '' }, true));
  assert.equal(mockWarrantyData.length, count);
  const request = saveMockIntakeRequest(device, form, 'Chờ xác minh');
  const ticket = createMockWarranty(device.serial, form, true, request.id);
  assert.equal(mockWarrantyData[0], ticket);
  assert.equal(ticket.customerName, device.customerName);
  assert.equal(ticket.orderId, device.orderId);
  assert.equal(ticket.warrantyExpiry, device.warrantyExpiry);
  assert.equal(ticket.expiryBasis, device.expiryBasis);
  assert.equal(ticket.receptionReason, 'Không nhận ổ cứng');
  assert.deepEqual(ticket.accessories, ['Hộp × 1']);
  assert.equal(ticket.history.length, 1);
  assert.equal(request.status, 'Đã tiếp nhận');
  assert.equal(request.form.reason, form.reason);
  assert.ok(lookupWarrantyDevices('trackingCode', ticket.trackingCode).includes(device));
  assert.deepEqual(filterWarranties(mockWarrantyData, { search: ticket.id }), [ticket]);
  assert.match(deviceIntakeBlocker(device), /hoạt động/);
  assert.throws(() => createMockWarranty(device.serial, form, true));
  const second = createMockWarranty('SSD2T-SN-002', form, true);
  assert.notEqual(second.id, ticket.id);
  assert.equal(new Set(mockWarrantyData.map(item => item.id)).size, mockWarrantyData.length);
});

test('quick groups use the Figma processing statuses and compose with the existing filters', () => {
  const result = filterWarranties(mockWarrantyData, { quick: 'ĐANG XỬ LÝ' });
  assert.ok(result.length);
  assert.ok(result.every(item => ['ĐÃ GỬI BẢO HÀNH', 'ĐANG BẢO HÀNH', 'ĐÃ NHẬN LẠI', 'CHỜ ĐỔI SẢN PHẨM'].includes(item.status)));
  assert.equal(filterWarranties(mockWarrantyData, { quick: 'MỚI TIẾP NHẬN', status: 'HOÀN TẤT' }).length, 0);
});
