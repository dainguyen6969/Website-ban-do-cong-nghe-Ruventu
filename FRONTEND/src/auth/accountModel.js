export const ACCOUNTS_STORAGE_KEY = 'ruventu.mock.accounts';
export const SESSION_STORAGE_KEY = 'ruventu.mock.session';

export const EMPLOYEE_ROLES = Object.freeze([
  { value: 'admin_toan_quyen', label: 'Admin toàn quyền', abbreviation: 'admin' },
  { value: 'nv_ban_hang', label: 'Nhân viên bán hàng', abbreviation: 'nvgh' },
  { value: 'quan_ly_kho', label: 'Quản lý kho', abbreviation: 'qlk' },
  { value: 'ke_toan', label: 'Kế toán', abbreviation: 'kt' },
  { value: 'nv_bao_hanh', label: 'Nhân viên bảo hành', abbreviation: 'nvbh' },
]);

export const EMPLOYEE_ROLE_VALUES = new Set(EMPLOYEE_ROLES.map((role) => role.value));

export const isStaffAccount = (account) => Boolean(
  account && (account.role === 'admin' || EMPLOYEE_ROLE_VALUES.has(account.role) || EMPLOYEE_ROLE_VALUES.has(account.vaiTro)),
);

export const employeeRoleLabel = (value) => EMPLOYEE_ROLES.find((role) => role.value === value)?.label ?? value;

export const employeeStatusLabel = (value) => value === 'ngung_hoat_dong' ? 'NGỪNG HOẠT ĐỘNG' : 'HOẠT ĐỘNG';

export const makeGeneratedPassword = (role, accounts) => {
  if (role === 'admin_toan_quyen') return 'Admin@123';
  const roleInfo = EMPLOYEE_ROLES.find((item) => item.value === role);
  if (!roleInfo) return '';
  const sameRoleCount = accounts.filter((account) => isStaffAccount(account) && account.vaiTro === role).length;
  return `${roleInfo.abbreviation}Ruventu@${sameRoleCount + 1}`;
};

export const nextEmployeeNumber = (accounts) => {
  const numbers = accounts
    .filter(isStaffAccount)
    .map((account) => Number(String(account.employeeId ?? '').match(/\d+/)?.[0] ?? 0));
  return Math.max(0, ...numbers) + 1;
};

export const toEmployee = (account) => ({
  accountId: account.id,
  id: account.employeeId,
  hoTen: account.hoTen ?? account.name,
  soDienThoai: account.soDienThoai ?? account.phone,
  email: account.email,
  vaiTro: account.vaiTro ?? (account.role === 'admin' ? 'admin_toan_quyen' : account.role),
  trangThai: account.trangThai ?? 'hoat_dong',
  passwordHash: account.passwordHash ?? account.password,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

export const createEmployeeAccount = (payload, accounts, now = new Date().toISOString()) => {
  const number = nextEmployeeNumber(accounts);
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = payload.soDienThoai.replace(/\s+/g, '');
  return {
    id: `employee-${number}-${Date.now()}`,
    employeeId: `NV #${number}`,
    name: payload.hoTen.trim(),
    hoTen: payload.hoTen.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    soDienThoai: normalizedPhone,
    password: payload.password,
    passwordHash: payload.password,
    role: payload.vaiTro,
    vaiTro: payload.vaiTro,
    trangThai: 'hoat_dong',
    createdAt: now,
    updatedAt: now,
  };
};

const SEEDED_ACCOUNTS = Object.freeze([
  {
    id: 'admin-1',
    employeeId: 'NV #1',
    name: 'Admin Tổng',
    hoTen: 'Nguyễn Văn Admin',
    email: 'admin@ruventu.com',
    phone: '0901000001',
    soDienThoai: '0901000001',
    password: 'Admin@123',
    passwordHash: 'Admin@123',
    role: 'admin',
    vaiTro: 'admin_toan_quyen',
    trangThai: 'hoat_dong',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-09-18T13:36:00.000Z',
  },
  {
    id: 'user-1', name: 'Nguyễn Văn An', email: 'user1@ruventu.com', phone: '0900000002', password: 'User@123', role: 'user',
  },
  {
    id: 'user-2', name: 'Trần Minh Anh', email: 'user2@ruventu.com', phone: '0900000003', password: 'User@123', role: 'user',
  },
  {
    id: 'user-3', name: 'Lê Hoàng Nam', email: 'user3@ruventu.com', phone: '0900000004', password: 'User@123', role: 'user',
  },
  {
    id: 'employee-2',
    employeeId: 'NV #2',
    name: 'Trần Thị Hương',
    hoTen: 'Trần Thị Hương',
    email: 'huong.tran@ruventu.vn',
    phone: '0912345678',
    soDienThoai: '0912345678',
    password: 'nvghRuventu@1',
    passwordHash: 'nvghRuventu@1',
    role: 'nv_ban_hang',
    vaiTro: 'nv_ban_hang',
    trangThai: 'hoat_dong',
    createdAt: '2026-09-18T08:00:00.000Z',
    updatedAt: '2026-09-18T08:00:00.000Z',
  },
]);

export const cloneSeededAccounts = () => SEEDED_ACCOUNTS.map((account) => ({ ...account }));

export const upgradeAccounts = (storedAccounts) => {
  if (!Array.isArray(storedAccounts)) return cloneSeededAccounts();
  const seededAdmin = SEEDED_ACCOUNTS[0];
  const upgraded = storedAccounts.map((account) => {
    if (account.id !== 'admin-1' && account.role !== 'admin') return account;
    if (account.employeeId) {
      return {
        ...seededAdmin,
        ...account,
        vaiTro: account.vaiTro ?? 'admin_toan_quyen',
        trangThai: account.trangThai ?? 'hoat_dong',
        hoTen: account.hoTen ?? 'Nguyễn Văn Admin',
        soDienThoai: account.soDienThoai ?? account.phone,
        passwordHash: account.passwordHash ?? account.password,
      };
    }
    return {
      ...account,
      ...seededAdmin,
      id: account.id,
      email: account.email ?? seededAdmin.email,
      password: account.password ?? seededAdmin.password,
    };
  });

  if (!upgraded.some((account) => account.id === 'employee-2')) {
    upgraded.push({ ...SEEDED_ACCOUNTS[4] });
  }
  return upgraded;
};
