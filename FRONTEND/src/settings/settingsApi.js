import { apiRequest, getAccessToken } from '../auth/backendAuth';
import { SETTINGS_CHANGED } from './maintenanceState';
export { SETTINGS_CHANGED } from './maintenanceState';

const API_BASE = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
export const TYPOGRAPHY_CHANGED = 'ruventu:typography-changed';

const systemStatusRequests = new Map();

export function getSystemStatus() {
  const token = getAccessToken();

  // Nếu request cùng phiên đang xử lý,
  // sử dụng lại Promise thay vì tạo request mới.
  const existing = systemStatusRequests.get(token);

  if (existing) {
    return existing;
  }

  const request = (async () => {
    if (token) {
      try {
        return await apiRequest('/api/v1/system-settings/status');
      } catch (error) {
        if (error.status !== 401 && error.status !== 403) {
          throw error;
        }
      }
    }

    const response = await fetch(`${API_BASE}/api/v1/system-settings/status`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Không thể kiểm tra trạng thái hệ thống.');
    }

    return (await response.json()).data;
  })();

  systemStatusRequests.set(token, request);

  // Dọn Promise khi request hoàn thành hoặc thất bại.
  const cleanup = () => {
    if (systemStatusRequests.get(token) === request) {
      systemStatusRequests.delete(token);
    }
  };

  request.then(cleanup, cleanup);

  return request;
}

export const getTypography = () => apiRequest('/api/v1/users/me/typography');

export async function saveTypography(value) {
  const saved = await apiRequest('/api/v1/users/me/typography', {
    method: 'PUT',
    body: JSON.stringify(value),
  });
  window.dispatchEvent(new Event(TYPOGRAPHY_CHANGED));
  window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return saved;
}

export async function saveMaintenance(enabled) {
  const saved = await apiRequest('/api/v1/admin/system-settings/maintenance', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
  window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return saved;
}
