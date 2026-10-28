import { adminRequest } from '../../catalog/products/api/versionApi';

const ROOT = '/api/v1/admin/recalls';

const post = (path, key, body) =>
  adminRequest(path, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify(body),
  });

export const listRecalls = (filters, signal) =>
  adminRequest(
    `${ROOT}?${new URLSearchParams({
      keyword: filters.keyword || '',
      status: filters.status || '',
      page: String(Math.max(0, Number(filters.page || 1) - 1)),
      limit: '20',
    })}`,
    { signal }
  );

export const getRecall = (id, signal) =>
  adminRequest(`${ROOT}/${encodeURIComponent(id)}`, { signal });

export const getRecallSources = (keyword = '', signal) =>
  adminRequest(`${ROOT}/sources?${new URLSearchParams({ keyword })}`, { signal });

export const getPurchaseSources = (poId, signal) =>
  adminRequest(`${ROOT}/sources/${encodeURIComponent(poId)}`, { signal });

export const getSerialTrace = (serialId, signal) =>
  adminRequest(`${ROOT}/serials/${encodeURIComponent(serialId)}/trace`, { signal });

export const createRecall = (key, body) => post(ROOT, key, body);

export const recordRecallEvent = (id, key, body) =>
  post(`${ROOT}/${encodeURIComponent(id)}/events`, key, body);

export const recordPurchaseSource = (poId, key, body) =>
  post(`${ROOT}/sources/${encodeURIComponent(poId)}/backfill`, key, body);

export const flag = (value) => value === true || value === 1 || value === '1';

export const splitCodes = (value = '') =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const RECALL_STATUS = {
  DANG_XU_LY: 'Đang xử lý',
  HOAN_TAT: 'Hoàn tất',
  CHO_XU_LY: 'Chờ xử lý',
  DA_LIEN_HE: 'Đã liên hệ',
  CHO_NHAN_LAI: 'Chờ nhận lại',
  DA_GIAI_QUYET: 'Đã giải quyết',
};

export const RECALL_ACTIONS = {
  TAO_THU_HOI: 'Tạo đợt thu hồi',
  LIEN_HE: 'Ghi nhận liên hệ',
  CHO_NHAN_LAI: 'Hẹn nhận lại hàng',
  GAN_THIET_BI: 'Đối soát thiết bị và nguồn lô',
  TRA_NCC: 'Đã trả Nhà Cung Cấp',
  DOI_NCC: 'Đã đổi với Nhà Cung Cấp',
  DOI_BAO_HANH: 'Đã đổi thiết bị cho khách',
  LOAI_TRU: 'Loại trừ hoặc cho phép sử dụng',
  GHI_CHU: 'Ghi nhận đối soát',
  KET_THUC: 'Kết thúc đợt thu hồi',
  MO_LAI: 'Mở lại đợt thu hồi',
};
