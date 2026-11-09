import { apiRequest } from '../../../../auth/backendAuth';
import { emptyPermissions, fullPermissions } from '../../../../auth/roleModel';

export async function getRolePage(page = 1, limit = 20, keyword = '') {
  const params = new URLSearchParams({
    page: String(Math.max(0, page - 1)),
    limit: String(limit),
  });
  if (keyword?.trim()) params.set('keyword', keyword.trim());

  const data = await apiRequest(`/api/v1/admin/roles?${params}`);
  return {
    items: data?.items || [],
    totalItems: Number(data?.pagination?.total_elements || 0),
    totalPages: Number(data?.pagination?.total_pages || 0),
  };
}

export async function getAllRoles() {
  const data = await apiRequest('/api/v1/admin/roles?page=0&limit=100');
  const roles = (data?.items || []).map((role) => {
    const isSystemAdmin = String(role.ten_vai_tro || role.tenVaiTro || '').toUpperCase() === 'ADMIN';
    const parsed = parseRoleDescription(role.moTa || role.mo_ta);
    const perms = isSystemAdmin && Object.values(parsed.permissions).every((a) => !a.length)
      ? fullPermissions()
      : parsed.permissions;
    return { ...role, permissions: perms };
  });

  if (roles.length > 0) {
    try {
      localStorage.setItem('ruventu.mock.roles', JSON.stringify(roles));
    } catch (e) {
      console.warn('Cannot cache roles', e);
    }
  }

  return roles;
}

const PERMISSION_SEPARATOR = '|||';

const MOD_MAP = {
  tong_quat: 't',
  san_pham: 'p',
  danh_muc: 'm',
  combo_san_pham: 'b',
  kho_hang: 'k',
  kiem_hang: 'l',
  nhap_hang: 'i',
  ban_hang_pos: 's',
  don_hang: 'o',
  giao_hang: 'h',
  khach_tra_hang: 'u',
  khach_hang: 'c',
  nha_cung_cap: 'n',
  doi_tac_van_chuyen: 'y',
  khuyen_mai: 'd',
  bao_hanh: 'g',
  so_quy: 'f',
  bao_cao: 'r',
  nhan_vien: 'e',
  vai_tro_quyen: 'v',
};
const MOD_REV = Object.fromEntries(Object.entries(MOD_MAP).map(([k, v]) => [v, k]));
const ACT_MAP = { xem: '1', them: '2', sua: '3', xoa: '4' };
const ACT_REV = Object.fromEntries(Object.entries(ACT_MAP).map(([k, v]) => [v, k]));

function compressPermissions(permissions) {
  const parts = [];
  for (const [mod, acts] of Object.entries(permissions || {})) {
    if (!acts || !acts.length) continue;
    const m = MOD_MAP[mod];
    if (!m) continue;
    const a = acts
      .map((x) => ACT_MAP[x])
      .filter(Boolean)
      .sort()
      .join('');
    if (a) parts.push(`${m}${a}`);
  }
  return parts.join('-');
}

function decompressPermissions(str) {
  const permissions = emptyPermissions();
  if (!str) return permissions;
  for (const part of str.split('-')) {
    if (!part) continue;
    const mod = MOD_REV[part[0]];
    if (mod) {
      permissions[mod] = part
        .slice(1)
        .split('')
        .map((x) => ACT_REV[x])
        .filter(Boolean);
    }
  }
  return permissions;
}

export function parseRoleDescription(moTaRaw) {
  let description = moTaRaw || '';
  let permissions = emptyPermissions();

  if (moTaRaw && moTaRaw.includes(PERMISSION_SEPARATOR)) {
    const parts = moTaRaw.split(PERMISSION_SEPARATOR);
    const permStr = parts.pop();
    description = parts.join(PERMISSION_SEPARATOR);
    if (permStr.startsWith('{')) {
      try {
        permissions = { ...emptyPermissions(), ...JSON.parse(permStr) };
      } catch (e) {
        console.warn('Cannot parse permissions', e);
      }
    } else {
      permissions = decompressPermissions(permStr);
    }
  }
  return { description, permissions };
}

export function buildRoleDescription(description, permissions) {
  const permStr = compressPermissions(permissions);
  const suffix = `${PERMISSION_SEPARATOR}${permStr}`;
  let desc = description || '';
  const maxDescLen = Math.max(0, 250 - suffix.length);
  if (desc.length > maxDescLen) {
    desc = desc.substring(0, maxDescLen);
  }
  return `${desc}${suffix}`;
}

export async function getRoleDetail(id) {
  return await apiRequest(`/api/v1/admin/roles/${encodeURIComponent(id)}`);
}

export async function createRole({ tenVaiTro, moTa, permissions }) {
  const payload = {
    ten_vai_tro: (tenVaiTro || '').trim(),
    mo_ta: buildRoleDescription(moTa, permissions),
  };
  return await apiRequest('/api/v1/admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRole(id, { tenVaiTro, moTa, permissions }) {
  const payload = {
    ten_vai_tro: (tenVaiTro || '').trim(),
    mo_ta: buildRoleDescription(moTa, permissions),
  };
  return await apiRequest(`/api/v1/admin/roles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteRole(id) {
  return await apiRequest(`/api/v1/admin/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
