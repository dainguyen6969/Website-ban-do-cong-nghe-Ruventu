import { apiRequest } from '../../../../auth/backendAuth.js';

import { hasAdminPermission } from '../../../../auth/roleModel.js';

const NOTIFICATION_MODULES = new Map([
  ['NEW_ORDER', 'don_hang'],
  ['ORDER_STATUS', 'don_hang'],
  ['RECEIPT', 'so_quy'],
  ['PURCHASE_ORDER', 'nhap_hang'],
  ['SUPPLIER', 'nha_cung_cap'],
  ['SHIPPING_PARTNER', 'doi_tac_van_chuyen'],
]);

const REALTIME_MODULES = [...new Set(NOTIFICATION_MODULES.values())];

export function canReceiveRealtimeNotification(access, category) {
  const moduleId = NOTIFICATION_MODULES.get(category);
  return Boolean(moduleId && hasAdminPermission(access, moduleId, 'xem'));
}

export function getAdminRealtimeScope(access) {
  const allowed = REALTIME_MODULES.filter((moduleId) =>
    hasAdminPermission(access, moduleId, 'xem')
  );
  return allowed.length ? JSON.stringify([access.nguoi_dung_id, ...allowed]) : '';
}

function connectRealtime(onUpdate) {
  let disposed = false;
  let socket;
  let retryTimer;
  let heartbeat;
  let deadline;
  let retryDelay = 1000;
  let ticketRequest;

  const clearConnectionTimers = () => {
    clearInterval(heartbeat);
    clearTimeout(deadline);
  };
  const retry = () => {
    if (disposed) return;
    retryTimer = setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30000);
  };

  async function connect() {
    if (disposed) return;
    ticketRequest = new AbortController();
    try {
      const { ticket } = await apiRequest('/api/v1/admin/orders/realtime-ticket', {
        method: 'POST',
        signal: ticketRequest.signal,
      });
      if (disposed) return;
      if (!ticket) throw new Error('Missing WebSocket ticket');
      const base = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
      const url = new URL(`${base}/api/v1/admin/orders/realtime`, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('ticket', ticket);
      const connection = new WebSocket(url);
      socket = connection;
      let lastMessage = Date.now();
      deadline = setTimeout(() => connection.close(), 10000);
      connection.onopen = () => {
        clearTimeout(deadline);
        heartbeat = setInterval(() => {
          if (Date.now() - lastMessage > 45000) connection.close();
          else if (connection.readyState === WebSocket.OPEN) connection.send('ping');
        }, 15000);
      };
      connection.onmessage = ({ data }) => {
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          return;
        }
        if (event?.type === 'pong') lastMessage = Date.now();
        if (event?.type === 'ready') {
          lastMessage = Date.now();
          retryDelay = 1000;
          // Fetch again after reconnect to recover events missed while disconnected.
          onUpdate(event);
        } else if (
          event?.type === 'order-changed' &&
          Number.isSafeInteger(event.orderId) &&
          event.orderId > 0
        ) {
          lastMessage = Date.now();
          onUpdate(event);
        } else if (event?.type === 'admin-notification') {
          lastMessage = Date.now();
          onUpdate(event);
        }
      };
      connection.onerror = () => connection.close();
      connection.onclose = () => {
        clearConnectionTimers();
        onUpdate({ type: 'disconnected' });
        retry();
      };
    } catch (error) {
      if (disposed) return;

      if (error?.status === 401 || error?.status === 403) {
        onUpdate({ type: 'access-denied', status: error.status });
        return;
      }

      onUpdate({ type: 'disconnected' });
      retry();
    }
  }

  // Wait for synchronous subscription cleanup before requesting a one-use ticket.
  queueMicrotask(connect);
  return () => {
    disposed = true;
    ticketRequest?.abort();
    clearTimeout(retryTimer);
    clearConnectionTimers();
    if (socket) {
      socket.onmessage = null;
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
  };
}

const listeners = new Set();
let realtimeScope = '';
let disconnect;
let connected = false;

function stopRealtime() {
  disconnect?.();
  disconnect = undefined;
  connected = false;
}

function startRealtime() {
  if (!realtimeScope || !listeners.size || disconnect) return;

  disconnect = connectRealtime((event) => {
    if (event.type === 'ready') connected = true;
    if (event.type === 'disconnected' || event.type === 'access-denied') connected = false;
    listeners.forEach((callback) => callback(event));
  });
}

export function setAdminRealtimeScope(scope) {
  if (scope === realtimeScope) return;
  stopRealtime();
  realtimeScope = scope;
  startRealtime();
}

export function subscribeAdminRealtime(listener) {
  listeners.add(listener);
  startRealtime();

  if (connected) listener({ type: 'ready' });

  return () => {
    listeners.delete(listener);
    if (!listeners.size) stopRealtime();
  };
}

export function subscribeOrderUpdates(onUpdate) {
  return subscribeAdminRealtime((event) => {
    if (event.type === 'ready' || event.type === 'order-changed') onUpdate();
  });
}
