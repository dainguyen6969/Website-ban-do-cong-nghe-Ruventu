import { apiRequest, getAccessToken, readCurrentUser } from '../auth/backendAuth';
import { isMaintenanceResponse, SETTINGS_CHANGED } from './maintenanceState';
export { SETTINGS_CHANGED } from './maintenanceState';

const API_BASE = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
export const TYPOGRAPHY_CHANGED = 'ruventu:typography-changed';
export const SYSTEM_STATUS_TTL_MS = 5 * 60 * 1000;
const STATUS_CACHE_KEY = `ruventu:system-status:v1:${API_BASE}`;

let statusRequest = null;
let cacheVersion = 0;

function statusScope() {
  if (!getAccessToken()) return 'guest';
  const user = readCurrentUser();
  return user?.id ? JSON.stringify([user.id, user.role, user.vaiTro]) : null;
}

export function getCachedSystemStatus() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(STATUS_CACHE_KEY));
    const status = cached?.status;
    const scope = statusScope();
    return scope && cached?.scope === scope && cached.expiresAt > Date.now()
      && cached.expiresAt <= Date.now() + SYSTEM_STATUS_TTL_MS
      && typeof status?.maintenance === 'boolean' && typeof status.canManage === 'boolean'
      && (scope !== 'guest' || !status.canManage)
      && typeof status.fontFamily === 'string' && Number.isInteger(status.fontSize)
      && status.fontSize >= 12 && status.fontSize <= 20 ? status : null;
  } catch { return null; }
}

function clearStatusSnapshot() {
  cacheVersion++;
  try { sessionStorage.removeItem(STATUS_CACHE_KEY); }
  catch { /* Browser storage can be disabled. */ }
}

export function getSystemStatus({ force = false } = {}) {
  const token = getAccessToken();
  if (statusRequest?.token === token && (statusRequest.pending || (!force && Date.now() < statusRequest.expiresAt))) {
    return statusRequest.promise;
  }
  const entry = { token, pending: true, expiresAt: Date.now() + SYSTEM_STATUS_TTL_MS, version: cacheVersion };
  const scope = statusScope();
  entry.promise = fetchSystemStatus().then((status) => {
    if (scope && token === getAccessToken() && entry.version === cacheVersion) {
      try { sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ scope, expiresAt: entry.expiresAt, status })); }
      catch { /* Keep the live result when storage is unavailable. */ }
    }
    return status;
  }).catch((error) => {
    entry.expiresAt = Date.now() + 30000;
    if (isMaintenanceResponse(error.status, error.data) && token === getAccessToken() && statusRequest === entry) clearStatusSnapshot();
    throw error;
  }).finally(() => { entry.pending = false; });
  statusRequest = entry;
  return entry.promise;
}

async function fetchSystemStatus() {
  if (getAccessToken()) {
    try { return await apiRequest('/api/v1/system-settings/status'); }
    catch (error) { if (error.status !== 401 && error.status !== 403) throw error; }
  }
  const response = await fetch(`${API_BASE}/api/v1/system-settings/status`, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error('Không thể kiểm tra trạng thái hệ thống.'), { status: response.status, data: payload });
  return payload.data;
}

export const getTypography = () => apiRequest('/api/v1/users/me/typography');

export async function saveTypography(value) {
  const saved = await apiRequest('/api/v1/users/me/typography', {
    method: 'PUT',
    body: JSON.stringify(value),
  });
  statusRequest = null;
  clearStatusSnapshot();
  window.dispatchEvent(new Event(TYPOGRAPHY_CHANGED));
  window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return saved;
}

export async function saveMaintenance(enabled) {
  const saved = await apiRequest('/api/v1/admin/system-settings/maintenance', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
  statusRequest = null;
  clearStatusSnapshot();
  window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return saved;
}
