export const SETTINGS_CHANGED = 'ruventu:settings-changed';

export function isMaintenanceResponse(status, payload) {
  return status === 503 && Boolean(payload?.errors?.some((detail) => detail.code === 'SYSTEM_MAINTENANCE'));
}

export function notifyMaintenance(status, payload) {
  const blocked = isMaintenanceResponse(status, payload);
  if (blocked) window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return blocked;
}
