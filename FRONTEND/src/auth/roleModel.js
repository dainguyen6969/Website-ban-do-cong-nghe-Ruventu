export const ROLES_STORAGE_KEY = 'ruventu.mock.roles';
export const ROLE_ACTIONS = Object.freeze(['xem', 'them', 'sua', 'xoa']);

export const PERMISSION_GROUPS = Object.freeze([
  {
    id: 'overview',
    label: 'TỔNG QUAN',
    modules: [
      {
        id: 'tong_quat',
        label: 'Tổng quan hệ thống',
        description: 'Xem bảng điều khiển (dashboard) và số liệu tổng quát',
        actions: ['xem'],
      },
    ],
  },
  {
    id: 'catalog',
    label: 'DANH MỤC & SẢN PHẨM',
    modules: [
      {
        id: 'san_pham',
        label: 'Sản phẩm',
        description: 'Danh sách, chi tiết, thêm/sửa/xóa sản phẩm và phiên bản',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'danh_muc',
        label: 'Danh mục & Thương hiệu',
        description: 'Quản lý danh mục, nhóm sản phẩm, thương hiệu, tags',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'combo_san_pham',
        label: 'Combo sản phẩm',
        description: 'Quản lý bộ PC và các gói sản phẩm combo',
        actions: ROLE_ACTIONS,
      },
    ],
  },
  {
    id: 'inventory',
    label: 'KHO & NHẬP HÀNG',
    modules: [
      {
        id: 'kho_hang',
        label: 'Kho hàng & Serial',
        description: 'Xem tồn kho theo chi nhánh, danh sách serial thiết bị',
        actions: ['xem', 'sua'],
      },
      {
        id: 'nhap_hang',
        label: 'Nhập hàng',
        description: 'Lập, quản lý và duyệt đơn nhập hàng từ nhà cung cấp',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'kiem_hang',
        label: 'Kiểm hàng',
        description: 'Kiểm kê, đối soát và điều chỉnh tồn kho',
        actions: ['xem', 'them', 'sua'],
      },
    ],
  },
  {
    id: 'sales',
    label: 'BÁN HÀNG & ĐƠN HÀNG',
    modules: [
      {
        id: 'ban_hang_pos',
        label: 'Bán hàng tại quầy (POS)',
        description: 'Tạo đơn bán hàng và thanh toán trực tiếp tại quầy',
        actions: ['xem', 'them'],
      },
      {
        id: 'don_hang',
        label: 'Đơn hàng',
        description: 'Xem, xử lý danh sách đơn hàng và đặt hàng online',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'giao_hang',
        label: 'Quản lý giao hàng',
        description: 'Điều phối vận chuyển, tạo phiếu giao và theo dõi đơn',
        actions: ['xem', 'them', 'sua'],
      },
      {
        id: 'khach_tra_hang',
        label: 'Khách trả hàng',
        description: 'Lập phiếu đổi/trả hàng, tiếp nhận kiện và chứng từ hoàn tiền',
        actions: ROLE_ACTIONS,
      },
    ],
  },
  {
    id: 'partners',
    label: 'KHÁCH HÀNG & ĐỐI TÁC',
    modules: [
      {
        id: 'khach_hang',
        label: 'Khách hàng',
        description: 'Hồ sơ khách hàng và lịch sử mua sắm',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'nha_cung_cap',
        label: 'Nhà cung cấp',
        description: 'Danh sách và thông tin đối tác cung cấp hàng hóa',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'doi_tac_van_chuyen',
        label: 'Đối tác vận chuyển',
        description: 'Quản lý các hãng vận chuyển và cấu hình kết nối',
        actions: ROLE_ACTIONS,
      },
    ],
  },
  {
    id: 'promotions',
    label: 'KHUYẾN MẠI',
    modules: [
      {
        id: 'khuyen_mai',
        label: 'Khuyến mại',
        description: 'Tạo và quản lý voucher, chương trình ưu đãi giảm giá',
        actions: ROLE_ACTIONS,
      },
    ],
  },
  {
    id: 'warranty',
    label: 'BẢO HÀNH',
    modules: [
      {
        id: 'bao_hanh',
        label: 'Bảo hành & Sửa chữa',
        description: 'Lập phiếu tiếp nhận, thẩm định và theo dõi bảo hành',
        actions: ['xem', 'them', 'sua'],
      },
    ],
  },
  {
    id: 'finance',
    label: 'SỔ QUỸ & BÁO CÁO',
    modules: [
      {
        id: 'so_quy',
        label: 'Sổ quỹ tiền mặt',
        description: 'Quản lý phiếu thu, phiếu chi và tổng quan thu chi',
        actions: ['xem', 'them', 'sua'],
      },
      {
        id: 'bao_cao',
        label: 'Báo cáo & Thống kê',
        description: 'Xem và xuất các báo cáo doanh thu, hàng tồn kho',
        actions: ['xem'],
      },
    ],
  },
  {
    id: 'staff',
    label: 'NHÂN SỰ & HỆ THỐNG',
    modules: [
      {
        id: 'nhan_vien',
        label: 'Nhân viên',
        description: 'Quản lý danh sách nhân viên và tài khoản nội bộ',
        actions: ROLE_ACTIONS,
      },
      {
        id: 'vai_tro_quyen',
        label: 'Vai trò & Phân quyền',
        description: 'Cấu hình vai trò và ma trận quyền hạn các chức năng',
        actions: ROLE_ACTIONS,
      },
    ],
  },
]);

export const PERMISSION_MODULES = Object.freeze(
  PERMISSION_GROUPS.flatMap((group) => group.modules)
);

export const emptyPermissions = () =>
  Object.fromEntries(PERMISSION_MODULES.map((module) => [module.id, []]));
export const fullPermissions = () =>
  Object.fromEntries(PERMISSION_MODULES.map((module) => [module.id, [...module.actions]]));

const permissionSet = (entries) => {
  const permissions = emptyPermissions();
  Object.entries(entries).forEach(([moduleId, actions]) => {
    if (permissions[moduleId]) {
      permissions[moduleId] = [...actions];
    }
  });
  return permissions;
};

export const ROLE_PRESETS = Object.freeze([
  {
    id: 'nv_ban_hang',
    label: 'Nhân viên bán hàng',
    abbreviation: 'nvgh',
    permissions: permissionSet({
      tong_quat: ['xem'],
      san_pham: ['xem'],
      danh_muc: ['xem'],
      ban_hang_pos: ['xem', 'them'],
      don_hang: ['xem', 'sua'],
      khach_hang: ['xem', 'them', 'sua'],
      khuyen_mai: ['xem'],
      bao_hanh: ['xem', 'them'],
    }),
  },
  {
    id: 'quan_ly_kho',
    label: 'Quản lý kho',
    abbreviation: 'qlk',
    permissions: permissionSet({
      tong_quat: ['xem'],
      san_pham: ['xem', 'sua'],
      danh_muc: ['xem'],
      combo_san_pham: ['xem', 'them', 'sua'],
      kho_hang: ['xem', 'sua'],
      nhap_hang: ['xem', 'them', 'sua'],
      kiem_hang: ['xem', 'them', 'sua'],
      don_hang: ['xem'],
      giao_hang: ['xem', 'sua'],
      khach_tra_hang: ['xem', 'sua'],
    }),
  },
  {
    id: 'ke_toan',
    label: 'Kế toán',
    abbreviation: 'kt',
    permissions: permissionSet({
      tong_quat: ['xem'],
      don_hang: ['xem'],
      khach_hang: ['xem'],
      so_quy: ['xem', 'them', 'sua'],
      bao_cao: ['xem'],
    }),
  },
  {
    id: 'admin_toan_quyen',
    label: 'Admin toàn quyền',
    abbreviation: 'admin',
    permissions: fullPermissions(),
  },
]);

export const normalizeRoleName = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();

export const rolePresetFromRole = (role) => {
  if (!role) return null;
  const normalized = normalizeRoleName(role.name);
  if (normalized === 'admin' || normalized.includes('toan quyen')) {
    return ROLE_PRESETS.find((preset) => preset.id === 'admin_toan_quyen') ?? null;
  }
  return (
    ROLE_PRESETS.find(
      (preset) =>
        preset.id === role.id ||
        normalizeRoleName(preset.label) === normalized ||
        preset.abbreviation === role.abbreviation
    ) ?? null
  );
};

export const makeRoleSlug = (name, roles = []) => {
  const base =
    normalizeRoleName(name)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `vai_tro_${Date.now()}`;
  if (!roles.some((role) => role.id === base)) return base;
  let suffix = 2;
  while (roles.some((role) => role.id === `${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
};

export const roleAbbreviationFromName = (name) => {
  const words =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? [];
  return words.map((word) => word[0]).join('') || 'vt';
};

export const routePermissionModule = (pathname) => {
  if (
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname.startsWith('/admin/tong-quat')
  )
    return 'tong_quat';
  if (pathname.startsWith('/admin/nhan-vien/vai-tro')) return 'vai_tro_quyen';
  if (pathname.startsWith('/admin/nhan-vien')) return 'nhan_vien';
  if (pathname.startsWith('/admin/san-pham/danh-muc') || pathname.startsWith('/admin/danh-muc'))
    return 'danh_muc';
  if (pathname.startsWith('/kho-hang/combo-san-pham')) return 'combo_san_pham';
  if (pathname.startsWith('/admin/san-pham')) return 'san_pham';
  if (pathname.startsWith('/kho-hang/nhap-hang')) return 'nhap_hang';
  if (pathname.startsWith('/kho-hang/kiem-hang')) return 'kiem_hang';
  if (pathname.startsWith('/kho-hang')) return 'kho_hang';
  if (pathname.startsWith('/admin/pos') || pathname.startsWith('/admin/ban-hang')) return 'ban_hang_pos';
  if (pathname.startsWith('/admin/don-hang/quan-ly-giao-hang')) return 'giao_hang';
  if (pathname.startsWith('/admin/don-hang/khach-tra-hang')) return 'khach_tra_hang';
  if (pathname.startsWith('/admin/don-hang')) return 'don_hang';
  if (pathname.startsWith('/admin/khach-hang-doi-tac/nha-cung-cap')) return 'nha_cung_cap';
  if (pathname.startsWith('/admin/khach-hang-doi-tac/doi-tac-van-chuyen')) return 'doi_tac_van_chuyen';
  if (pathname.startsWith('/admin/khach-hang-doi-tac')) return 'khach_hang';
  if (pathname.startsWith('/admin/khuyen-mai')) return 'khuyen_mai';
  if (pathname.startsWith('/admin/bao-hanh')) return 'bao_hanh';
  if (pathname.startsWith('/admin/so-quy-tien-mat')) return 'so_quy';
  if (pathname.startsWith('/admin/bao-cao')) return 'bao_cao';
  return null;
};

const warrantyRole = {
  id: 'nv_bao_hanh',
  label: 'Nhân viên bảo hành',
  description: 'Tiếp nhận và theo dõi bảo hành',
  abbreviation: 'nvbh',
  permissions: permissionSet({
    bao_hanh: ['xem', 'them', 'sua'],
    san_pham: ['xem'],
    khach_hang: ['xem'],
  }),
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
};

export const SEEDED_ROLES = Object.freeze([
  ...ROLE_PRESETS.map((preset) => ({
    ...preset,
    description: '',
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
  })),
  warrantyRole,
]);

const normalizePermissions = (permissions = {}) =>
  Object.fromEntries(
    PERMISSION_MODULES.map((module) => [
      module.id,
      module.actions.filter((action) => permissions[module.id]?.includes(action)),
    ])
  );

export const upgradeRoles = (storedRoles) => {
  if (!Array.isArray(storedRoles))
    return SEEDED_ROLES.map((role) => ({
      ...role,
      permissions: normalizePermissions(role.permissions),
    }));
  const roles = storedRoles.map((role) => ({
    ...role,
    permissions: normalizePermissions(role.permissions),
  }));
  SEEDED_ROLES.forEach((seed) => {
    if (!roles.some((role) => role.id === seed.id))
      roles.push({ ...seed, permissions: normalizePermissions(seed.permissions) });
  });
  return roles;
};

export const roleHasPermission = (roles, roleId, moduleId, action = 'xem') => {
  if (!roleId) return false;
  const targetId = String(roleId).toLowerCase();
  if (targetId === 'admin_toan_quyen' || targetId === 'admin') return true;

  return (
    roles
      ?.find((role) => {
        const id = String(role.id).toLowerCase();
        const name = String(role.tenVaiTro || role.ten_vai_tro || role.label || '').toLowerCase();
        return id === targetId || name === targetId;
      })
      ?.permissions?.[moduleId]?.includes(action) ?? false
  );
};

export const roleIdFromName = (name, roles = []) => {
  const base =
    String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `vai_tro_${Date.now()}`;
  if (!roles.some((role) => role.id === base)) return base;
  let suffix = 2;
  while (roles.some((role) => role.id === `${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
};
