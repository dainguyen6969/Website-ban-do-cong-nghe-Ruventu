const API_BASE_URL = (
  import.meta.env.VITE_RUVENTU_API_URL || ''
).replace(/\/$/, '');

export const AUTH_CHANGED = 'ruventu:auth-changed';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

let refreshPromise = null;

export const getAccessToken = () =>
  localStorage.getItem(TOKEN_KEY) || '';

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

export function clearAuth() {
  [
    TOKEN_KEY,
    USER_KEY,
    'access_token',
    'ruventu_backend_access_token',
    'ruventu.mock.session',
  ].forEach((key) => localStorage.removeItem(key));

  notifyAuthChanged();
}

function decodeClaims(token) {
  const segment = token.split('.')[1];
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '='
  );

  const bytes = Uint8Array.from(
    atob(padded),
    (char) => char.charCodeAt(0)
  );

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
  const isCustomer = roleName === 'USER' || roleName === 'KHACH_HANG' || roleName === 'KHÁCH HÀNG';
  const isAdmin = !isCustomer && roleName !== '';

  const account = {
    ...user,
    name: user.ho_ten || identifier,
    email: claims.email || identifier,
    avatar: user.anh_dai_dien || null,
    role: isAdmin ? 'admin' : 'user',
    vaiTro: isAdmin ? (claims.vai_tro === 'ADMIN' ? 'admin_toan_quyen' : claims.vai_tro) : 'user',
    trangThai: 'hoat_dong',
  };

  localStorage.removeItem('access_token');
  localStorage.removeItem('ruventu_backend_access_token');
  localStorage.removeItem('ruventu.mock.session');

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(account));

  notifyAuthChanged();
  return account;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('API không trả JSON hợp lệ. Kiểm tra proxy/ngrok.');
  }
}

function apiError(message, status, data = null) {
  return Object.assign(new Error(message), { status, data });
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const previousToken = getAccessToken();

    refreshPromise = (async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }
      );

      // Không ghi đè phiên mới nếu người dùng đã logout/login
      // trong lúc request refresh đang chạy.
      if (getAccessToken() !== previousToken) {
        const currentToken = getAccessToken();

        if (currentToken) return currentToken;
        throw apiError('Phiên đăng nhập đã thay đổi.', 401);
      }

      if (response.status === 401 || response.status === 403) {
        clearAuth();
        throw apiError('Phiên đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }

      const payload = await parseResponse(response);
      const token = payload?.data?.access_token;

      if (!response.ok || !token) {
        throw apiError(
          payload?.message || 'Không thể làm mới phiên đăng nhập.',
          response.status,
          payload
        );
      }

      // Kiểm tra lại sau khi đọc response.
      if (getAccessToken() !== previousToken) {
        const currentToken = getAccessToken();

        if (currentToken) return currentToken;
        throw apiError('Phiên đăng nhập đã thay đổi.', 401);
      }

      localStorage.setItem(TOKEN_KEY, token);
      return token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}, retry = true) {
  const token = getAccessToken();

  if (!token) {
    throw apiError('Vui lòng đăng nhập.', 401);
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  if (
    options.body != null &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry) {
    // Request khác có thể đã refresh xong.
    if (getAccessToken() === token) {
      await refreshAccessToken();
    }

    return apiRequest(path, options, false);
  }

  if (response.status === 401 && getAccessToken() === token) {
    clearAuth();
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw apiError(
      payload?.message || `Yêu cầu thất bại (${response.status}).`,
      response.status,
      payload
    );
  }

  return payload?.data;
}

export async function logoutBackend() {
  // Xóa phiên FE ngay để request cũ không khôi phục token.
  clearAuth();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/logout`,
    {
      method: 'POST',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw apiError('Không thể kết thúc phiên trên backend.', response.status);
  }
}