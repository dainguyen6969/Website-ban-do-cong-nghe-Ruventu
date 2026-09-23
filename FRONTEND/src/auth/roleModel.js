export const ROLES_STORAGE_KEY = 'ruventu.mock.roles';
export const ROLE_ACTIONS = Object.freeze(['xem', 'them', 'sua', 'xoa']);

export const PERMISSION_GROUPS = Object.freeze([
  { id: 'catalog', label: 'DANH MỤC & SẢN PHẨM', modules: [
    { id: 'san_pham', label: 'Sản phẩm', description: 'Danh sách, chi tiết, thêm/sửa sản phẩm', actions: ROLE_ACTIONS },
    { id: 'danh_muc', label: 'Danh mục', description: 'Quản lý danh mục và nhóm sản phẩm', actions: ROLE_ACTIONS },
  ] },
  { id: 'inventory', label: 'KHO & NHẬP HÀNG', modules: [
    { id: 'kho_hang', label: 'Kho hàng', description: 'Xem tồn kho theo chi nhánh', actions: ['xem', 'sua'] },
    { id: 'nhap_hang', label: 'Nhập hàng', description: 'Lập và duyệt đơn nhập hàng', actions: ROLE_ACTIONS },
  ] },
  { id: 'sales', label: 'BÁN HÀNG & ĐƠN HÀNG', modules: [
    { id: 'ban_hang_pos', label: 'Bán hàng (POS)', description: 'Tạo đơn bán hàng tại quầy', actions: ['xem', 'them'] },
    { id: 'don_hang', label: 'Đơn hàng', description: 'Xem và xử lý danh sách đơn hàng', actions: ROLE_ACTIONS },
  ] },
  { id: 'customers', label: 'KHÁCH HÀNG', modules: [
    { id: 'khach_hang', label: 'Khách hàng', description: 'Hồ sơ khách hàng và đối tác', actions: ROLE_ACTIONS },
  ] },
  { id: 'promotions', label: 'KHUYẾN MẠI', modules: [
    { id: 'khuyen_mai', label: 'Khuyến mại', description: 'Tạo và quản lý chương trình khuyến mại', actions: ROLE_ACTIONS },
  ] },
  { id: 'warranty', label: 'BẢO HÀNH', modules: [
    { id: 'bao_hanh', label: 'Bảo hành', description: 'Lập và theo dõi phiếu bảo hành', actions: ['xem', 'them', 'sua'] },
  ] },
  { id: 'finance', label: 'TÀI CHÍNH & BÁO CÁO', modules: [
    { id: 'so_quy', label: 'Sổ quỹ', description: 'Xem sổ quỹ thu chi', actions: ['xem', 'them'] },
    { id: 'bao_cao', label: 'Báo cáo', description: 'Xem và xuất báo cáo doanh thu, kho', actions: ['xem'] },
  ] },
  { id: 'staff', label: 'NHÂN VIÊN & VAI TRÒ', modules: [
    { id: 'nhan_vien', label: 'Nhân viên', description: 'Quản lý hồ sơ nhân viên và vai trò', actions: ROLE_ACTIONS },
    { id: 'vai_tro_quyen', label: 'Vai trò & Quyền', description: 'Phân quyền hệ thống', actions: ROLE_ACTIONS },
  ] },
]);

export const PERMISSION_MODULES = Object.freeze(PERMISSION_GROUPS.flatMap((group) => group.modules));

export const emptyPermissions = () => Object.fromEntries(PERMISSION_MODULES.map((module) => [module.id, []]));
export const fullPermissions = () => Object.fromEntries(PERMISSION_MODULES.map((module) => [module.id, [...module.actions]]));

const permissionSet = (entries) => {
  const permissions = emptyPermissions();
  Object.entries(entries).forEach(([moduleId, actions]) => { permissions[moduleId] = [...actions]; });
  return permissions;
};

export const ROLE_PRESETS = Object.freeze([
  {
    id: 'nv_ban_hang', label: 'Nhân viên bán hàng', abbreviation: 'nvgh',
    permissions: permissionSet({
      san_pham: ['xem'], danh_muc: ['xem'], ban_hang_pos: ['xem', 'them'], don_hang: ['xem', 'sua'],
      khach_hang: ['xem', 'them', 'sua'], khuyen_mai: ['xem'], bao_hanh: ['xem', 'them'],
    }),
  },
  {
    id: 'quan_ly_kho', label: 'Quản lý kho', abbreviation: 'qlk',
    permissions: permissionSet({
      san_pham: ['xem', 'sua'], danh_muc: ['xem'], kho_hang: ['xem', 'sua'], nhap_hang: ['xem', 'them', 'sua'], don_hang: ['xem'],
    }),
  },
  {
    id: 'ke_toan', label: 'Kế toán', abbreviation: 'kt',
    permissions: permissionSet({ don_hang: ['xem'], khach_hang: ['xem'], so_quy: ['xem', 'them'], bao_cao: ['xem'] }),
  },
  { id: 'admin_toan_quyen', label: 'Admin toàn quyền', abbreviation: 'admin', permissions: fullPermissions() },
]);

const warrantyRole = {
  id: 'nv_bao_hanh', label: 'Nhân viên bảo hành', description: 'Tiếp nhận và theo dõi bảo hành', abbreviation: 'nvbh',
  permissions: permissionSet({ bao_hanh: ['xem', 'them', 'sua'], san_pham: ['xem'], khach_hang: ['xem'] }),
  createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:00.000Z',
};

export const SEEDED_ROLES = Object.freeze([
  ...ROLE_PRESETS.map((preset) => ({ ...preset, description: '', createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:00.000Z' })),
  warrantyRole,
]);

const normalizePermissions = (permissions = {}) => Object.fromEntries(PERMISSION_MODULES.map((module) => [
  module.id,
  module.actions.filter((action) => permissions[module.id]?.includes(action)),
]));

export const upgradeRoles = (storedRoles) => {
  if (!Array.isArray(storedRoles)) return SEEDED_ROLES.map((role) => ({ ...role, permissions: normalizePermissions(role.permissions) }));
  const roles = storedRoles.map((role) => ({ ...role, permissions: normalizePermissions(role.permissions) }));
  SEEDED_ROLES.forEach((seed) => {
    if (!roles.some((role) => role.id === seed.id)) roles.push({ ...seed, permissions: normalizePermissions(seed.permissions) });
  });
  return roles;
};

export const roleHasPermission = (roles, roleId, moduleId, action = 'xem') => {
  if (roleId === 'admin_toan_quyen') return true;
  return roles.find((role) => role.id === roleId)?.permissions?.[moduleId]?.includes(action) ?? false;
};

export const roleIdFromName = (name, roles) => {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `vai_tro_${Date.now()}`;
  if (!roles.some((role) => role.id === base)) return base;
  let suffix = 2;
  while (roles.some((role) => role.id === `${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
};

export const roleAbbreviationFromName = (name) => {
  const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return words.map((word) => word[0]).join('') || 'vt';
};

export const routePermissionModule = (pathname) => {
  if (pathname.startsWith('/admin/nhan-vien/vai-tro')) return 'vai_tro_quyen';
  if (pathname.startsWith('/admin/nhan-vien')) return 'nhan_vien';
  if (pathname.startsWith('/admin/san-pham/danh-muc') || pathname.startsWith('/admin/danh-muc')) return 'danh_muc';
  if (pathname.startsWith('/admin/san-pham')) return 'san_pham';
  if (pathname.startsWith('/kho-hang/nhap-hang')) return 'nhap_hang';
  if (pathname.startsWith('/kho-hang')) return 'kho_hang';
  if (pathname.startsWith('/admin/ban-hang')) return 'ban_hang_pos';
  if (pathname.startsWith('/admin/don-hang')) return 'don_hang';
  if (pathname.startsWith('/admin/khach-hang-doi-tac')) return 'khach_hang';
  if (pathname.startsWith('/admin/khuyen-mai')) return 'khuyen_mai';
  if (pathname.startsWith('/admin/bao-hanh')) return 'bao_hanh';
  if (pathname.startsWith('/admin/so-quy-tien-mat')) return 'so_quy';
  if (pathname.startsWith('/admin/bao-cao')) return 'bao_cao';
  return null;
};
