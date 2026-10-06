export const errorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Không thể thực hiện thao tác.';

export function createRequestKey() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (!cryptoApi?.getRandomValues) {
    throw new Error('Trình duyệt không hỗ trợ tạo mã yêu cầu an toàn.');
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

export function parseApiTime(value) {
  if (!value) return null;

  let text = String(value).trim().replace(' ', 'T');

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    text += 'T00:00:00';
  }

  // DATETIME không có offset được hiểu theo giờ Việt Nam.
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(text)) {
    text += '+07:00';
  }

  const result = new Date(text);
  return Number.isNaN(result.getTime()) ? null : result;
}

function localInputValue(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export const nowLocalInput = () => localInputValue(new Date());

export const inputFromApiTime = (value) => {
  const date = parseApiTime(value);
  return date ? localInputValue(date) : nowLocalInput();
};

export function toApiDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) {
    throw new Error('Vui lòng nhập thời điểm hợp lệ.');
  }

  const result = `${value}:00+07:00`;
  const date = parseApiTime(result);

  if (!date || localInputValue(date) !== value) {
    throw new Error('Thời điểm không hợp lệ.');
  }

  if (date.getTime() > Date.now()) {
    throw new Error('Thời điểm ghi nhận không được nằm trong tương lai.');
  }

  return result;
}

export function formatDateTimeVN(value, timeStyle = 'short') {
  const date = parseApiTime(value);

  return date
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'short',
        timeStyle,
      }).format(date)
    : '—';
}

/**
 * Giữ UUID và body khi lỗi mạng/5xx chưa xác định kết quả.
 * Không cho đổi body rồi gửi UUID mới khi yêu cầu trước còn chưa rõ.
 */
export async function withIdempotency(slot, scope, body, send) {
  const signature = JSON.stringify(body);
  let attempt = slot.current;

  if (attempt && (
    attempt.scope !== scope ||
    attempt.signature !== signature
  )) {
    throw new Error(
      'Yêu cầu trước chưa xác định kết quả. Hãy giữ nguyên dữ liệu để thử lại hoặc kiểm tra kết quả trước.',
    );
  }

  if (!attempt) {
    attempt = {
      scope,
      signature,
      key: createRequestKey(),
      body: JSON.parse(signature),
      inFlight: false,
    };
    slot.current = attempt;
  }

  if (attempt.inFlight) {
    throw new Error('Yêu cầu đang được xử lý.');
  }

  attempt.inFlight = true;

  try {
    const result = await send(attempt.key, attempt.body);
    slot.current = null;
    return result;
  } catch (error) {
    const status = Number(error.status || error.response?.status);

    // Các lỗi bị từ chối rõ ràng: cho phép sửa dữ liệu và gửi yêu cầu mới.
    if ([400, 401, 403, 404, 409, 422].includes(status)) {
      slot.current = null;
    }

    throw error;
  } finally {
    attempt.inFlight = false;
  }
}