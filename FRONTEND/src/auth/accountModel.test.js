import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessAdmin } from './accountModel.js';
import { roleHasPermission, routePermissionModule } from './roleModel.js';

const roles = [{ id: 'sales', permissions: { don_hang: ['xem'] } }];

test('admin access fails closed for guests, customers, disabled staff and unknown roles', () => {
  assert.equal(canAccessAdmin(null, roles), false);
  assert.equal(canAccessAdmin({ role: 'user', trangThai: 'hoat_dong' }, roles), false);
  assert.equal(canAccessAdmin({ employeeId: 'NV #1', vaiTro: 'sales', trangThai: 'ngung_hoat_dong' }, roles), false);
  assert.equal(canAccessAdmin({ employeeId: 'NV #1', vaiTro: 'missing', trangThai: 'hoat_dong' }, roles), false);
});

test('active staff need a real role with dashboard permissions', () => {
  const staff = { employeeId: 'NV #1', vaiTro: 'sales', trangThai: 'hoat_dong' };
  assert.equal(canAccessAdmin(staff, roles), true);
  assert.equal(roleHasPermission(roles, staff.vaiTro, routePermissionModule('/admin/don-hang')), true);
  assert.equal(roleHasPermission(roles, staff.vaiTro, routePermissionModule('/admin/nhan-vien')), false);
});
