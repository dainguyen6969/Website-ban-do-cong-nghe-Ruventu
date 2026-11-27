import { apiRequest } from '../../../../auth/backendAuth';
import { emptyPermissions, fullPermissions, PERMISSION_MODULES } from '../../../../auth/roleModel';

export const ADMIN_ONLY_MODULES = Object.freeze(['nhan_vien', 'vai_tro_quyen']);

export function readRolePermissions(role) {
  if (role?.ma_vai_tro === 'ADMIN') return fullPermissions();

  return Object.fromEntries(
    PERMISSION_MODULES.map(({ id, actions }) => {
      const granted = role?.quyen?.[id];
      const allowed =
        !ADMIN_ONLY_MODULES.includes(id) && Array.isArray(granted)
          ? actions.filter((action) => granted.includes(action))
          : [];
      return [id, allowed];
    })
  );
}

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

export async function getAllRoles(signal) {
  const data = await apiRequest('/api/v1/admin/roles?page=0&limit=100', { signal });
  signal?.throwIfAborted();
  const roles = (data?.items || []).map((role) => ({
    ...role,
    permissions: readRolePermissions(role),
  }));

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

function toRolePayload({ tenVaiTro, moTa, permissions }) {
  return {
    ten_vai_tro: (tenVaiTro || '').trim(),
    mo_ta: (moTa || '').trim() || null,
    quyen: Object.fromEntries(
      Object.entries(permissions || {}).filter(
        ([id, actions]) =>
          !ADMIN_ONLY_MODULES.includes(id) && Array.isArray(actions) && actions.length > 0
      )
    ),
  };
}

export async function createRole(form) {
  return apiRequest('/api/v1/admin/roles', {
    method: 'POST',
    body: JSON.stringify(toRolePayload(form)),
  });
}

export async function updateRole(id, { phienBan, ...form }) {
  return apiRequest(`/api/v1/admin/roles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...toRolePayload(form), phien_ban: phienBan }),
  });
}

export async function deleteRole(id) {
  return apiRequest(`/api/v1/admin/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
