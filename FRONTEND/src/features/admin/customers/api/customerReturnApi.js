import { apiRequest } from '../../../../auth/backendAuth.js';

const PATH = '/api/v1/admin/returns';

const buildQuery = (values) => {
  const searchParams = new URLSearchParams();
  Object.entries(values).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  });
  return searchParams.toString();
};

const ensureUUID = (key) => {
  if (typeof key === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key)) {
    return key;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export async function getReturns({ keyword, returnStatus, from, to, page = 0, limit = 20 } = {}, signal) {
  const qs = buildQuery({
    keyword: keyword ? keyword.trim() : undefined,
    trang_thai_tra_hang: returnStatus || undefined,
    tu_ngay: from || undefined,
    den_ngay: to || undefined,
    page,
    limit,
  });
  return apiRequest(`${PATH}${qs ? `?${qs}` : ''}`, { signal });
}

export async function getEligibleOrders({ keyword, page = 0, limit = 20 } = {}, signal) {
  const qs = buildQuery({
    keyword: keyword ? keyword.trim() : undefined,
    page,
    limit,
  });
  return apiRequest(`${PATH}/eligible-orders${qs ? `?${qs}` : ''}`, { signal });
}

export async function getEligibleOrderDetail(orderId, signal) {
  return apiRequest(`${PATH}/eligible-orders/${encodeURIComponent(orderId)}`, { signal });
}

export async function previewReturn(payload, signal) {
  return apiRequest(`${PATH}/preview`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function createReturn(payload, idempotencyKey) {
  const headers = {
    'Idempotency-Key': ensureUUID(idempotencyKey),
  };
  return apiRequest(PATH, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getReturnDetail(id, signal) {
  return apiRequest(`${PATH}/${encodeURIComponent(id)}`, { signal });
}

export async function receiveReturnPackage(id, payload, idempotencyKey) {
  const headers = {
    'Idempotency-Key': ensureUUID(idempotencyKey),
  };
  return apiRequest(`${PATH}/${encodeURIComponent(id)}/receive`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export async function refundReturn(id, payload, idempotencyKey) {
  const headers = {
    'Idempotency-Key': ensureUUID(idempotencyKey),
  };
  return apiRequest(`${PATH}/${encodeURIComponent(id)}/refund`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}
