const CHANNEL_NAME = 'ruventu-admin-sync';
const FALLBACK_EVENT_KEY = 'ruventu_admin_sync_event_v1';

const listeners = new Set();
const seenMessageIds = new Set();
const sourceId = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let channel = null;
let isListening = false;

function remember(messageId) {
  seenMessageIds.add(messageId);
  if (seenMessageIds.size > 200) seenMessageIds.delete(seenMessageIds.values().next().value);
}

function deliver(message) {
  if (!message?.id || message.sourceId === sourceId || seenMessageIds.has(message.id)) return;
  remember(message.id);
  listeners.forEach((listener) => listener(message));
}

function startListening() {
  if (isListening || typeof window === 'undefined') return;
  isListening = true;

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event) => deliver(event.data));
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== FALLBACK_EVENT_KEY || !event.newValue) return;
    try { deliver(JSON.parse(event.newValue)); } catch { /* Ignore malformed external messages. */ }
  });
}

export function readSharedState(storageKey, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return stored ?? fallback;
  } catch {
    return fallback;
  }
}

export function publishAdminChange(slice, detail = {}) {
  if (typeof window === 'undefined') return;
  startListening();
  const message = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    sourceId,
    slice,
    timestamp: Date.now(),
    ...detail,
  };

  remember(message.id);
  channel?.postMessage(message);
  localStorage.setItem(FALLBACK_EVENT_KEY, JSON.stringify(message));
}

export function writeSharedState(storageKey, value, change) {
  localStorage.setItem(storageKey, JSON.stringify(value));
  publishAdminChange(change.slice, { action: change.action, entityId: change.entityId ?? null });
}

export function subscribeToAdminSlice(slice, listener) {
  startListening();
  const scopedListener = (message) => { if (message.slice === slice) listener(message); };
  listeners.add(scopedListener);
  return () => listeners.delete(scopedListener);
}

// This is same-browser, same-origin multi-tab sync, not cross-device realtime.
export const ADMIN_SYNC_CHANNEL = CHANNEL_NAME;
