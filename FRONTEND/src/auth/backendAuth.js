import { notifyMaintenance } from '../settings/maintenanceState';

const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');

export const AUTH_CHANGED = 'ruventu:auth-changed';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

const SESSION_KEY = 'ruventu.auth.session';

let refreshRequest = null;
let logoutPromise = null;

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY) || '';

export async function getAdminServiceToken() {
  // Giữ tương thích với các chỗ đang import hàm này.
  return getAccessToken() || null;
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED));
}

export function readCurrentUser() {
  try {
    if (!getAccessToken()) return null;

    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isAuthStorageEvent({ key, oldValue, newValue }) {
  return (
    key === null ||
    key === USER_KEY ||
    key === SESSION_KEY ||
    (key === TOKEN_KEY && (!oldValue || !newValue))
  );
}

function getLoginSessionKey() {
  if (!getAccessToken()) return '';
  return localStorage.getItem(SESSION_KEY) || `legacy:${readCurrentUser()?.id ?? ''}`;
}

export function clearAuth() {
  [
    TOKEN_KEY,
    USER_KEY,
    SESSION_KEY,
    'access_token',
    'ruventu_backend_access_token',
    'ruventu.mock.session',
  ].forEach((key) => localStorage.removeItem(key));

  notifyAuthChanged();
}

function decodeClaims(token) {
  const segment = token.split('.')[1];
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}

export function saveLogin(data, identifier = '') {
  const token = data?.access_token;
  const user = data?.user;

  if (!token || !user?.id) {
    throw new Error('Backend không trả đủ token và thông tin người dùng.');
  }

  // Backend hiện đã đưa vai_tro vào JWT.
  // Việc đọc này dùng cho giao diện; backend vẫn xác thực quyền API.
  const claims = decodeClaims(token);

  const roleName = claims.vai_tro ? claims.vai_tro.toUpperCase() : '';
  const roleCode = claims.ma_vai_tro || roleName;
  const isCustomer = ['USER', 'KHACH_HANG', 'KHÁCH HÀNG'].includes(roleCode);
  const isAdmin = !isCustomer && roleCode !== '';

  const account = {
    ...user,
    name: user.ho_ten || identifier,
    email: claims.email || identifier,
    avatar: user.anh_dai_dien || null,
    role: isAdmin ? 'admin' : 'user',
    vaiTro: isAdmin ? (roleCode === 'ADMIN' ? 'admin_toan_quyen' : claims.vai_tro) : 'user',
    trangThai: 'hoat_dong',
  };

  localStorage.removeItem('access_token');
  localStorage.removeItem('ruventu_backend_access_token');
  localStorage.removeItem('ruventu.mock.session');

  const sessionKey =
    claims.sid ||
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(SESSION_KEY, sessionKey);
  localStorage.setItem(USER_KEY, JSON.stringify(account));
  localStorage.setItem(TOKEN_KEY, token);

  notifyAuthChanged();
  return account;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const message = 'API không trả JSON hợp lệ. Kiểm tra proxy/ngrok.';
    throw response.ok ? new Error(message) : apiError(message, response.status);
  }
}

function apiError(message, status, data = null) {
  return Object.assign(new Error(message), { status, data });
}

function assertLoginSession(sessionKey, signal) {
  signal?.throwIfAborted();
  if (getLoginSessionKey() !== sessionKey) {
    throw apiError('Phiên đăng nhập đã thay đổi.', 401);
  }
}

function tryDecodeClaims(token) {
  try {
    return decodeClaims(token);
  } catch {
    return null;
  }
}

export async function refreshAccessToken() {
  const previousToken = getAccessToken();
  const sessionKey = getLoginSessionKey();
  if (!sessionKey) throw apiError('Vui lòng đăng nhập.', 401);

  if (refreshRequest?.sessionKey === sessionKey && refreshRequest.token === previousToken) {
    return refreshRequest.promise;
  }

  const entry = { sessionKey, token: previousToken };
  entry.promise = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    assertLoginSession(sessionKey);
    if (getAccessToken() !== previousToken) return getAccessToken();

    if (response.status === 401 || response.status === 403) {
      clearAuth();
      throw apiError('Phiên đã hết hạn. Vui lòng đăng nhập lại.', 401);
    }

    const payload = await parseResponse(response);
    assertLoginSession(sessionKey);
    if (getAccessToken() !== previousToken) return getAccessToken();

    const token = payload?.data?.access_token;
    if (!response.ok || typeof token !== 'string' || !token) {
      notifyMaintenance(response.status, payload);
      throw apiError(
        payload?.message || 'Không thể làm mới phiên đăng nhập.',
        response.status,
        payload
      );
    }

    const previous = tryDecodeClaims(previousToken);
    const next = tryDecodeClaims(token);
    if (previous && (next?.sub !== previous.sub || (previous.sid && next?.sid !== previous.sid))) {
      clearAuth();
      throw apiError('Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.', 401);
    }

    localStorage.setItem(TOKEN_KEY, token);
    return token;
  })().finally(() => {
    if (refreshRequest === entry) refreshRequest = null;
  });

  refreshRequest = entry;
  return entry.promise;
}

async function retryUnauthorized(sessionKey, token, retry, signal) {
  assertLoginSession(sessionKey, signal);
  if (!token) return false;

  if (!retry) {
    if (getAccessToken() === token) clearAuth();
    return false;
  }

  if (getAccessToken() === token) await refreshAccessToken();
  assertLoginSession(sessionKey, signal);
  return true;
}

export async function apiRequest(path, options = {}, retry = true) {
  const token = getAccessToken();
  const sessionKey = getLoginSessionKey();
  if (!token) throw apiError('Vui lòng đăng nhập.', 401);

  if (options.signal && (!options.method || options.method === 'GET')) {
    await Promise.resolve();
  }
  assertLoginSession(sessionKey, options.signal);

  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  if (options.body != null && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  assertLoginSession(sessionKey, options.signal);

  if (response.status === 401) {
    if (await retryUnauthorized(sessionKey, token, retry, options.signal)) {
      assertLoginSession(sessionKey, options.signal);
      return apiRequest(path, options, false);
    }
    throw apiError('Phiên đã hết hạn. Vui lòng đăng nhập lại.', 401);
  }

  if (response.ok && options.responseType === 'blob') {
    const value = await response.blob();
    assertLoginSession(sessionKey, options.signal);
    return value;
  }

  const payload = await parseResponse(response);
  assertLoginSession(sessionKey, options.signal);

  if (!response.ok) {
    notifyMaintenance(response.status, payload);
    throw apiError(
      payload?.message || `Yêu cầu thất bại (${response.status}).`,
      response.status,
      payload
    );
  }

  return options.responseType === 'payload' ? payload : payload?.data;
}

export function attachSessionAuth(client) {
  client.interceptors.request.use(
    (config) => {
      const sessionKey = getLoginSessionKey();
      assertLoginSession(config._loginSessionKey ?? sessionKey, config.signal);
      config._loginSessionKey = sessionKey;
      config._sentAccessToken = getAccessToken();

      if (config._sentAccessToken) {
        config.headers.set('Authorization', `Bearer ${config._sentAccessToken}`);
      } else {
        config.headers.delete('Authorization');
      }
      return config;
    },
    (error) => {
      throw error;
    },
    { synchronous: true }
  );

  client.interceptors.response.use(
    (response) => {
      assertLoginSession(response.config._loginSessionKey, response.config.signal);
      return response;
    },
    async (error) => {
      const { config, response } = error;
      notifyMaintenance(response?.status, response?.data);
      if (response?.status !== 401 || !config) throw error;

      const { _loginSessionKey, _sentAccessToken, _retried, signal } = config;
      if (!(await retryUnauthorized(_loginSessionKey, _sentAccessToken, !_retried, signal))) {
        throw error;
      }

      config._retried = true;
      return client.request(config);
    }
  );
}

export function getMyPermissions(signal) {
  return apiRequest('/api/v1/users/me/permissions', {
    signal,
    cache: 'no-store',
  });
}

export function logoutBackend() {
  if (logoutPromise) return logoutPromise;

  logoutPromise = fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) {
        throw apiError('Không thể kết thúc phiên trên backend.', response.status);
      }
    })
    .finally(() => {
      logoutPromise = null;
    });

  clearAuth();
  return logoutPromise;
}

export async function waitForPendingLogout() {
  await logoutPromise?.catch(() => {});
}
