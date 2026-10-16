import { apiRequest } from '../../../../auth/backendAuth.js';

export function subscribeOrderUpdates(onUpdate) {
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
        method: 'POST', signal: ticketRequest.signal,
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
        try { event = JSON.parse(data); } catch { return; }
        if (event?.type === 'pong') lastMessage = Date.now();
        if (event?.type === 'ready') {
          lastMessage = Date.now();
          retryDelay = 1000;
          // Fetch again after reconnect to recover events missed while disconnected.
          onUpdate();
        } else if (event?.type === 'order-changed' && Number.isSafeInteger(event.orderId) && event.orderId > 0) {
          lastMessage = Date.now();
          onUpdate();
        }
      };
      connection.onerror = () => connection.close();
      connection.onclose = () => {
        clearConnectionTimers();
        retry();
      };
    } catch {
      retry();
    }
  }

  connect();
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
