// Shared IntelliJ/Spring media adapter; the server performs the authenticated Cloudinary upload.
const API_BASE_URL = (import.meta.env.VITE_RUVENTU_API_URL || '').replace(/\/$/, '');
const ACCESS_TOKEN_KEY = 'ruventu_backend_access_token';

/** Calls only the IntelliJ/Spring backend; Cloudinary credentials remain server-side. */
function readToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
    || localStorage.getItem('access_token')
    || localStorage.getItem('accessToken')
    || '';
}

async function parsePayload(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { throw new Error('Backend trả về dữ liệu không hợp lệ.'); }
}

async function login() {
  const username = import.meta.env.VITE_RUVENTU_ADMIN_USERNAME;
  const password = import.meta.env.VITE_RUVENTU_ADMIN_PASSWORD;
  if (!username || !password) throw new Error('Chưa có phiên đăng nhập backend.');
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tai_khoan: username, mat_khau: password, ghi_nho_dang_nhap: false }),
  });
  const payload = await parsePayload(response);
  const token = payload?.data?.access_token;
  if (!response.ok || !token) throw new Error(payload?.message || 'Không thể đăng nhập backend.');
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  return token;
}

async function send(file, folder, retry = true) {
  const token = readToken() || await login();
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/uploads/images`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: form,
  });
  if (response.status === 401 && retry) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    await login();
    return send(file, folder, false);
  }
  const payload = await parsePayload(response);
  if (!response.ok) throw new Error(payload?.message || `Tải ảnh thất bại (${response.status}).`);
  return payload?.data;
}

/** Standard image round-trip: file -> IntelliJ backend -> Cloudinary -> durable URL. */
export async function uploadImage(file, folder = 'general') {
  const data = await send(file, folder);
  if (!data?.url) throw new Error('Cloudinary không trả về URL ảnh.');
  return data;
}
