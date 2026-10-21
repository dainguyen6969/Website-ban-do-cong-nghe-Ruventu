import { apiRequest, getAccessToken } from '../auth/backendAuth';
import { SETTINGS_CHANGED } from './maintenanceState';
export { SETTINGS_CHANGED } from './maintenanceState';

const API_BASE = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
export const TYPOGRAPHY_CHANGED = 'ruventu:typography-changed';

export async function getSystemStatus() {
  if (getAccessToken()) {
    try { return await apiRequest('/api/v1/system-settings/status'); }
    catch (error) { if (error.status !== 401 && error.status !== 403) throw error; }
  }
  const response = await fetch(`${API_BASE}/api/v1/system-settings/status`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Không thể kiểm tra trạng thái hệ thống.');
  return (await response.json()).data;
}

export const getTypography = () => apiRequest('/api/v1/users/me/typography');

export async function saveTypography(value) {
  const saved = await apiRequest('/api/v1/users/me/typography', {
    method: 'PUT', body: JSON.stringify(value),
  });
  window.dispatchEvent(new CustomEvent(TYPOGRAPHY_CHANGED, { detail: saved }));
  window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return saved;
}

export async function saveMaintenance(enabled) {
  const saved = await apiRequest('/api/v1/admin/system-settings/maintenance', {
    method: 'PUT', body: JSON.stringify({ enabled }),
  });
  window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return saved;
}
