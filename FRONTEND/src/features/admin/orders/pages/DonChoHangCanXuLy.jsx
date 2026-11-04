import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import OrderModal from '../components/OrderModal';
import {
  getWaitingActions,
  saveWaitingContact,
  getWaitingContactHistory,
  money,
} from '../api/orderApi';
import { subscribeOrderUpdates } from '../api/orderRealtime';
import {
  apiHasCode,
  errorMessage,
  formatDateTimeVN,
  inputFromApiTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import './DonChoHangCanXuLy.css';

const RESULTS = {
  CHUA_LIEN_HE: 'Chưa ghi nhận liên hệ',
  HEN_XU_LY: 'Phân công / hẹn xử lý',
  KHONG_LIEN_LAC_DUOC: 'Đã thử liên hệ, chưa kết nối được',
  DONG_Y_CHO: 'Khách đồng ý tiếp tục chờ',
  XAC_NHAN_MUA: 'Khách xác nhận tiếp tục mua',
  KHONG_TIEP_TUC: 'Khách không tiếp tục chờ',
  DA_THONG_BAO: 'Đã thông báo có hàng',
  HUY_DANG_KY: 'Khách hủy đăng ký',
};

const PRIORITIES = {
  1: 'Khẩn cấp',
  2: 'Cao',
  3: 'Trung bình',
  4: 'Thông thường',
};

const ORDER_RESULTS = [
  'HEN_XU_LY',
  'KHONG_LIEN_LAC_DUOC',
  'DONG_Y_CHO',
  'XAC_NHAN_MUA',
  'KHONG_TIEP_TUC',
];

const NOTICE_RESULTS = ['HEN_XU_LY', 'KHONG_LIEN_LAC_DUOC', 'DA_THONG_BAO', 'HUY_DANG_KY'];

const CONNECTED = ['DONG_Y_CHO', 'XAC_NHAN_MUA', 'KHONG_TIEP_TUC'];

const cash = (value) => (value == null ? '—' : money(value));
function appointment(value) {
  const text = String(value || '').trim();

  if (!text) return null;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) || Number(text.slice(0, 4)) < 1000) {
    throw new Error('Ngày giờ hẹn không hợp lệ.');
  }

  const result = `${text}:00+07:00`;
  const date = new Date(result);

  if (Number.isNaN(date.getTime()) || inputFromApiTime(date.toISOString()) !== text) {
    throw new Error('Ngày giờ hẹn không hợp lệ.');
  }

  return result;
}

function waitingDuration(value) {
  if (value == null) return 'Chưa rõ thời gian';
  const minutes = Math.max(0, Number(value));
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ`;
  return `${Math.floor(minutes / 1440)} ngày ${Math.floor((minutes % 1440) / 60)} giờ`;
}

function WaitingPriorityIcon({ level }) {
  const value = Number(level);

  return (
    <svg
      className="waiting-priority-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {value === 1 ? (
        <>
          <path d="M12 3 2 21h20L12 3Z" />
          <path d="M12 9v5" />
          <circle cx="12" cy="17.5" r=".7" fill="currentColor" stroke="none" />
        </>
      ) : value === 2 ? (
        <path d="m13 3-8 10h6l-1 8L19 9h-6l0-6Z" />
      ) : value === 3 ? (
        <>
          <rect x="5" y="5" width="14" height="16" rx="2" />
          <path d="M9 5V3h6v2M8 13l3 3 5-6" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
    </svg>
  );
}

function WaitingPriority({ level }) {
  return (
    <span className={`waiting-priority waiting-priority--${level}`}>
      <WaitingPriorityIcon level={level} />
      <span>{PRIORITIES[level] || 'Chưa phân loại'}</span>
    </span>
  );
}

function WaitingBadge({ tone = 'neutral', children }) {
  return <span className={`waiting-badge waiting-badge--${tone}`}>{children}</span>;
}

function waitingPaymentTone(row) {
  if (row.received == null || row.remaining == null) {
    return 'red';
  }

  if (Number(row.received) > 0 && Number(row.remaining) === 0) {
    return 'green';
  }

  return 'amber';
}

function waitingContactTone(result) {
  const tones = {
    CHUA_LIEN_HE: 'neutral',
    HEN_XU_LY: 'blue',
    KHONG_LIEN_LAC_DUOC: 'amber',
    DONG_Y_CHO: 'blue',
    XAC_NHAN_MUA: 'green',
    KHONG_TIEP_TUC: 'red',
    DA_THONG_BAO: 'green',
    HUY_DANG_KY: 'neutral',
  };

  return tones[result] || 'neutral';
}

function WaitingProducts({ row }) {
  const notice = row.kind === 'NOTICE';
  const products = row.products || [];

  if (!products.length) {
    return <span className="waiting-muted">Chưa có dữ liệu sản phẩm.</span>;
  }

  return (
    <div className="waiting-products">
      {products.map((item, index) => {
        const productName = String(item.ten_san_pham || 'Sản phẩm');
        const variantName = String(item.ten_phien_ban || '');

        const showVariant =
          variantName &&
          variantName.trim().toLocaleLowerCase('vi-VN') !==
            productName.trim().toLocaleLowerCase('vi-VN');

        const available = item.ton_co_the_ban == null ? null : Number(item.ton_co_the_ban);

        const hasStock = available != null && available > 0;
        const missing = item.so_luong_thieu;

        return (
          <article className="waiting-product" key={item.phien_ban_id || index}>
            <div className="waiting-product__name">{productName}</div>

            {showVariant && <div className="waiting-product__variant">{variantName}</div>}

            {notice ? (
              <div
                className={
                  'waiting-availability' + (hasStock ? ' waiting-availability--ready' : '')
                }
              >
                <WaitingBadge tone={available == null ? 'neutral' : hasStock ? 'green' : 'amber'}>
                  {available == null
                    ? 'CHƯA XÁC ĐỊNH TỒN'
                    : hasStock
                      ? 'ĐÃ CÓ HÀNG'
                      : 'CHƯA CÓ HÀNG'}
                </WaitingBadge>

                <div className="waiting-availability__quantity">
                  <strong>{available ?? '—'}</strong>
                  <span>Có thể bán</span>
                </div>
              </div>
            ) : (
              <>
                <dl className="waiting-quantities">
                  <div>
                    <dt>Cần giao</dt>
                    <dd>{item.so_luong_can ?? '—'}</dd>
                  </div>

                  <div className="waiting-quantity-held">
                    <dt>Đã giữ</dt>
                    <dd>{item.so_luong_da_giu ?? '—'}</dd>
                  </div>

                  <div
                    className={Number(missing) > 0 ? 'waiting-quantity-missing' : ''}
                    title="Số lượng còn thiếu sau khi tính hàng đã giữ và tồn có thể bán."
                  >
                    <dt>Thiếu thêm</dt>
                    <dd>{missing ?? '—'}</dd>
                  </div>
                </dl>

                <div className="waiting-stock-meta">
                  <span>
                    Chưa giữ:
                    <strong>{item.so_luong_con_can_giu ?? '—'}</strong>
                  </span>

                  <span>
                    Kho có thể bán:
                    <strong>{available ?? '—'}</strong>
                  </span>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function WaitingQueueRow({ row, onOpen, locked }) {
  const notice = row.kind === 'NOTICE';

  const reservationTones = {
    'Đã giữ đủ hàng': 'green',
    'Đã giữ một phần': 'amber',
    'Đã hết hạn giữ': 'red',
    'Chưa giữ hàng': 'neutral',
  };

  const actionTone = row.overdue ? 'red' : row.ready ? 'green' : row.can_add ? 'blue' : 'neutral';

  const hasCod = row.cod_remaining != null && Number(row.cod_remaining) > 0;

  return (
    <tr className={`waiting-row waiting-row--${row.priority}`}>
      <td>
        <WaitingPriority level={row.priority} />

        <strong className={`waiting-task waiting-task--${actionTone}`}>{row.action_label}</strong>

        <div className="waiting-signals">
          {(row.signals || []).map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </td>

      <td>
        <strong className="waiting-customer">{row.customer}</strong>

        {row.phone ? (
          <a className="waiting-phone" href={`tel:${row.phone}`}>
            {row.phone}
          </a>
        ) : (
          <span className="waiting-muted">Chưa có số điện thoại</span>
        )}

        <div className="waiting-reference">
          <span className="waiting-label">{notice ? 'Mã đăng ký' : 'Mã đơn hàng'}</span>

          {notice ? (
            <strong>{row.code}</strong>
          ) : (
            <Link to={`/admin/don-hang/danh-sach-don-hang/${row.id}`}>{row.code}</Link>
          )}
        </div>

        <WaitingBadge tone={notice ? 'neutral' : 'amber'}>{row.status_label}</WaitingBadge>
      </td>

      {!notice && (
        <td>
          <WaitingBadge tone={waitingPaymentTone(row)}>{row.payment_label}</WaitingBadge>

          <dl className="waiting-money">
            <div>
              <dt>Đã thực thu</dt>
              <dd>{cash(row.received)}</dd>
            </div>

            {Number(row.refunded) > 0 && (
              <div>
                <dt>Đã hoàn</dt>
                <dd>{cash(row.refunded)}</dd>
              </div>
            )}

            <div className="waiting-money__remaining">
              <dt>{hasCod ? 'COD dự kiến' : 'Còn phải thu'}</dt>
              <dd>{cash(hasCod ? row.cod_remaining : row.remaining)}</dd>
            </div>
          </dl>
        </td>
      )}

      <td>
        {!notice && (
          <div className="waiting-reservation">
            <WaitingBadge tone={reservationTones[row.reservation_label]}>
              {row.reservation_label}
            </WaitingBadge>
          </div>
        )}

        <WaitingProducts row={row} />
      </td>

      <td>
        <div className={'waiting-schedule' + (row.overdue ? ' waiting-schedule--overdue' : '')}>
          {row.overdue && <WaitingBadge tone="red">ĐẾN / QUÁ HẠN HẸN</WaitingBadge>}

          <dl className="waiting-dates">
            <div>
              <dt>Liên hệ tiếp</dt>
              <dd>{row.next_contact_at ? formatDateTimeVN(row.next_contact_at) : 'Chưa hẹn'}</dd>
            </div>

            {!notice && row.promised_at && (
              <div>
                <dt>Hẹn có hàng</dt>
                <dd>{formatDateTimeVN(row.promised_at)}</dd>
              </div>
            )}
          </dl>

          <span className={'waiting-age' + (row.long_wait ? ' waiting-age--long' : '')}>
            Đã chờ: <strong>{waitingDuration(row.wait_minutes)}</strong>
          </span>

          <small className="waiting-created">Tạo: {formatDateTimeVN(row.created_at)}</small>
        </div>

        <div className="waiting-contact">
          <span className="waiting-label">Phụ trách</span>
          <strong className="waiting-assignee">{row.employee_name || 'Chưa phân công'}</strong>

          <WaitingBadge tone={waitingContactTone(row.contact_result)}>
            {RESULTS[row.contact_result] || 'Chưa có kết quả'}
          </WaitingBadge>

          {(row.contact_note || row.last_contact_name) && (
            <details className="waiting-contact-detail">
              <summary>Chi tiết liên hệ</summary>

              {row.last_contact_name && (
                <small>
                  {row.last_contact_name}
                  {' · '}
                  {formatDateTimeVN(row.last_contact_at)}
                </small>
              )}

              {row.contact_note && <p>{row.contact_note}</p>}
            </details>
          )}
        </div>
      </td>

      <td>
        <div className="waiting-row-actions">
          <button
            type="button"
            className="waiting-button"
            disabled={locked}
            onClick={() => onOpen(row)}
          >
            Liên hệ / hẹn xử lý
          </button>

          {!notice && (
            <Link
              className="waiting-open-order"
              to={`/admin/don-hang/danh-sach-don-hang/${row.id}`}
            >
              Mở chi tiết đơn
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function DonChoHangCanXuLy() {
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState('ORDER');
  const [keyword, setKeyword] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState({
    items: [],
    employees: [],
    summary: {},
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');

  const editing = useRef(false);
  const writing = useRef(false);
  const attempt = useRef(null);

  const orderId = kind === 'ORDER' ? params.get('order_id') : null;
  const request = useMemo(
    () => ({
      kind,
      keyword,
      priority: priority || 0,
      order_id: orderId,
      page,
      limit: 10,
    }),
    [kind, keyword, priority, orderId, page]
  );

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden && !editing.current && !attempt.current) {
        setRevision((value) => value + 1);
      }
    };

    const timer = window.setInterval(refresh, 30000);
    const unsubscribe = subscribeOrderUpdates(refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const result = await getWaitingActions(request, controller.signal);
        if (controller.signal.aborted || editing.current) return;

        setData(result);
        setReadError('');

        if (Number(result.page) !== page) {
          setPage(Number(result.page));
        }
      } catch (error) {
        if (!controller.signal.aborted) setReadError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [request, revision, page]);

  useEffect(() => {
    if (!dialog) return undefined;

    const controller = new AbortController();
    setHistory([]);
    setHistoryError('');

    getWaitingContactHistory(dialog.kind, dialog.id, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setHistory(items);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setHistoryError(errorMessage(error));
      });

    return () => controller.abort();
  }, [dialog?.kind, dialog?.id]);

  const open = (row) => {
    if (busy || attempt.current) return;

    editing.current = true;
    setOperationError('');
    setDialog(row);
    setForm({
      result: 'HEN_XU_LY',
      employeeId: String(data.can_assign_others ? row.employee_id || data.actor_id : data.actor_id),
      nextContactAt: row.next_contact_at ? inputFromApiTime(row.next_contact_at) : '',
      promisedAt: row.promised_at ? inputFromApiTime(row.promised_at) : '',
      remainingMethod: row.remaining_method || '',
      note: '',
      confirmed: false,
    });
  };

  const close = () => {
    if (busy || attempt.current) return;
    editing.current = false;
    setDialog(null);
    setOperationError('');
    setRevision((value) => value + 1);
  };

  const change = (name, value) =>
    setForm((current) => ({
      ...current,
      [name]: value,
      confirmed: name === 'confirmed' ? value : false,
    }));

  const submit = async () => {
    if (writing.current || !dialog) return;

    let body = attempt.current?.body;

    if (!body) {
      try {
        if (!form.confirmed) {
          throw new Error('Cần xác nhận đúng nội dung thao tác.');
        }

        const requiresNext = ['HEN_XU_LY', 'KHONG_LIEN_LAC_DUOC', 'DONG_Y_CHO'].includes(
          form.result
        );

        const nextContactAt = appointment(form.nextContactAt);

        if (requiresNext && !nextContactAt) {
          throw new Error('Chọn lịch xử lý hoặc liên hệ tiếp theo.');
        }

        const connected = dialog.kind === 'ORDER' && CONNECTED.includes(form.result);

        const note =
          form.note.trim() ||
          (form.result === 'HEN_XU_LY'
            ? `Phân công xử lý; hẹn ${formatDateTimeVN(nextContactAt)}.`
            : '');

        if (!note) {
          throw new Error('Nhập kết quả trao đổi thực tế.');
        }

        body = {
          revision: Number(dialog.revision),
          result: form.result,
          employeeId: Number(form.employeeId) || null,
          nextContactAt,
          promisedAt: connected ? appointment(form.promisedAt) : null,
          remainingMethod: connected ? form.remainingMethod || null : null,
          note,
          confirmed: true,
        };
      } catch (error) {
        setOperationError(errorMessage(error));
        return;
      }
    }

    writing.current = true;
    setBusy(true);
    setOperationError('');

    try {
      await withIdempotency(
        attempt,
        `waiting:${dialog.kind}:${dialog.id}`,
        body,
        (key, frozenBody) => saveWaitingContact(dialog.kind, dialog.id, key, frozenBody)
      );

      editing.current = false;
      setDialog(null);
      setRevision((value) => value + 1);
    } catch (error) {
      setOperationError(errorMessage(error));

      if (apiHasCode(error, 'WAITING_REVISION_CHANGED') && !attempt.current) {
        editing.current = false;
        setDialog(null);
        setRevision((value) => value + 1);
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const isNotice = kind === 'NOTICE';

  const visiblePriorities = Object.entries(PRIORITIES).filter(
    ([value]) => !isNotice || value !== '2'
  );

  const priorityNotes = isNotice
    ? {
        1: 'Đến hạn liên hệ',
        3: 'Có hàng để kiểm tra và thông báo',
        4: 'Cần tiếp tục theo dõi',
      }
    : {
        1: 'Đến hạn liên hệ hoặc hẹn có hàng',
        2: 'Đủ hàng · đã nhận tiền',
        3: 'Đủ hàng · chưa nhận tiền',
        4: 'Cần tiếp tục theo dõi',
      };

  const frozen = busy || Boolean(attempt.current);
  const needsNext = ['HEN_XU_LY', 'KHONG_LIEN_LAC_DUOC', 'DONG_Y_CHO'].includes(form.result);
  const connected = dialog?.kind === 'ORDER' && CONNECTED.includes(form.result);

  const employees = data.can_assign_others
    ? data.employees || []
    : (data.employees || []).filter((item) => Number(item.id) === Number(data.actor_id));

  return (
    <div className="waiting-work">
      <section className="order-list-hero">
        <div>
          <nav className="content__breadcrumb">
            <span>Đơn hàng</span>
            <span> › </span>
            <span>Chờ xử lý</span>
          </nav>
          <h1>{kind === 'ORDER' ? 'ĐƠN CHỜ HÀNG CẦN XỬ LÝ' : 'ĐĂNG KÝ BÁO CÓ HÀNG'}</h1>
        </div>

        <Link className="waiting-button" to="/admin/don-hang/danh-sach-don-hang">
          Danh sách đơn hàng
        </Link>
      </section>

      <section className="waiting-controls">
        <div className="waiting-tabs" aria-label="Loại yêu cầu">
          {[
            ['ORDER', 'Đơn chờ hàng'],
            ['NOTICE', 'Đăng ký báo có hàng'],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={kind === value ? 'is-active' : ''}
              aria-pressed={kind === value}
              disabled={frozen}
              onClick={() => {
                if (value === kind) return;

                setKind(value);
                setPage(0);
                setPriority('');
                setKeyword('');
                setReadError('');
                setLoading(true);

                setData((current) => ({
                  ...current,
                  items: [],
                  summary: {},
                  totalItems: 0,
                }));

                if (value === 'NOTICE') setParams({});
              }}
            >
              {text}
            </button>
          ))}
        </div>

        <div className={'waiting-overview' + (isNotice ? ' waiting-overview--notice' : '')}>
          {visiblePriorities.map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={
                `waiting-overview-card waiting-overview-card--${value}` +
                (priority === value ? ' is-selected' : '')
              }
              aria-pressed={priority === value}
              disabled={frozen}
              onClick={() => {
                setPriority((current) => (current === value ? '' : value));
                setPage(0);
              }}
            >
              <span className="waiting-overview-card__title">
                <WaitingPriorityIcon level={value} />
                <span>{text}</span>
              </span>
              <strong>{Number(data.summary?.[value] || 0)}</strong>
              <small>{priorityNotes[value]}</small>
            </button>
          ))}
        </div>

        <div className="waiting-filters">
          <input
            type="search"
            aria-label="Tìm yêu cầu"
            value={keyword}
            maxLength={100}
            placeholder={
              isNotice
                ? 'Tìm khách đăng ký, số điện thoại, sản phẩm...'
                : 'Tìm mã đơn, khách hàng, số điện thoại, sản phẩm...'
            }
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
          />

          <select
            aria-label="Mức ưu tiên"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả mức ưu tiên</option>

            {visiblePriorities.map(([value, text]) => (
              <option key={value} value={value}>
                {text} ({data.summary?.[value] || 0})
              </option>
            ))}
          </select>

          {orderId && (
            <button type="button" className="waiting-button" onClick={() => setParams({})}>
              Bỏ lọc theo đơn
            </button>
          )}
        </div>

        <div className="waiting-resultbar">
          <span>
            <strong>{Number(data.totalItems || 0).toLocaleString('vi-VN')}</strong>{' '}
            {isNotice ? 'đăng ký' : 'đơn hàng'} phù hợp
          </span>

          <small>
            Cập nhật: {formatDateTimeVN(data.updated_at)}
            {loading ? ' · Đang cập nhật...' : ''}
          </small>
        </div>
      </section>

      {readError && (
        <div className="waiting-error" role="alert">
          {readError}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}

      {operationError && !dialog && (
        <p className="waiting-error" role="alert">
          {operationError}
        </p>
      )}

      <div className="waiting-table-scroll" aria-busy={loading}>
        <table className={'waiting-table' + (isNotice ? ' waiting-table--notice' : '')}>
          <thead>
            <tr>
              <th className="waiting-col-priority">Ưu tiên / cần xử lý</th>

              <th className="waiting-col-customer">
                {isNotice ? 'Khách đăng ký' : 'Khách hàng / đơn'}
              </th>

              {!isNotice && <th className="waiting-col-money">Thanh toán</th>}

              <th className="waiting-col-products">
                {isNotice ? 'Sản phẩm / tình trạng hàng' : 'Sản phẩm / số lượng'}
              </th>

              <th className="waiting-col-contact">Lịch hẹn / phụ trách</th>

              <th className="waiting-col-actions">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {!data.items.length ? (
              <tr>
                <td className="waiting-empty" colSpan={isNotice ? 5 : 6}>
                  {loading
                    ? 'Đang lấy danh sách...'
                    : isNotice
                      ? 'Không có đăng ký phù hợp.'
                      : 'Không có đơn chờ hàng phù hợp.'}
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <WaitingQueueRow
                  key={`${row.kind}:${row.id}`}
                  row={row}
                  onOpen={open}
                  locked={frozen}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        totalItems={Number(data.totalItems)}
        pageSize={10}
        currentPage={page + 1}
        onPageChange={(value) => setPage(value - 1)}
        idPrefix="waiting-actions"
      />

      {dialog && (
        <OrderModal
          title="LIÊN HỆ VÀ HẸN XỬ LÝ"
          subtitle={dialog.code}
          className="waiting-modal"
          showClose
          busy={busy}
          error={operationError}
          disabled={!attempt.current && !form.confirmed}
          confirmLabel={attempt.current ? 'Thử lại yêu cầu cũ' : 'Lưu cập nhật'}
          close={close}
          submit={submit}
        >
          <div className="waiting-dialog-context">
            <div>
              <span className="waiting-label">Khách hàng</span>
              <strong>{dialog.customer}</strong>

              {dialog.phone && <a href={`tel:${dialog.phone}`}>{dialog.phone}</a>}
            </div>

            <div>
              <span className="waiting-label">Nội dung cần xử lý</span>
              <strong>{dialog.action_label}</strong>
            </div>
          </div>

          {attempt.current && (
            <p role="status">Chưa xác định được kết quả. Giữ nguyên yêu cầu để thử lại.</p>
          )}

          <fieldset className="waiting-fields" disabled={frozen}>
            <label>
              <span>Nội dung cần cập nhật</span>
              <select
                value={form.result}
                onChange={(event) => change('result', event.target.value)}
              >
                {(dialog.kind === 'ORDER' ? ORDER_RESULTS : NOTICE_RESULTS).map((value) => (
                  <option key={value} value={value}>
                    {RESULTS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Phụ trách sau khi lưu</span>
              <select
                required
                value={form.employeeId}
                onChange={(event) => change('employeeId', event.target.value)}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Lịch xử lý / liên hệ tiếp theo</span>
              <input
                type="datetime-local"
                required={needsNext}
                value={form.nextContactAt}
                onChange={(event) => change('nextContactAt', event.target.value)}
              />
            </label>

            {connected && (
              <>
                <label>
                  <span>Mốc hẹn có hàng đã thống nhất</span>
                  <input
                    type="datetime-local"
                    value={form.promisedAt}
                    onChange={(event) => change('promisedAt', event.target.value)}
                  />
                </label>

                {(dialog.remaining == null || Number(dialog.remaining) > 0) && (
                  <label>
                    <span>Dự kiến thu phần còn thiếu</span>
                    <select
                      title="Lưu phương án dự kiến; việc thực thu được ghi nhận tại chi tiết đơn hoặc đối soát COD."
                      value={form.remainingMethod}
                      onChange={(event) => change('remainingMethod', event.target.value)}
                    >
                      <option value="">Chưa xác định</option>
                      <option value="COD" disabled={!dialog.delivery}>
                        COD khi giao hàng
                      </option>
                      <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                      <option value="TAI_CUA_HANG">Thu tại cửa hàng</option>
                    </select>
                    <small className="waiting-field-note">
                      Còn phải thu: {cash(dialog.remaining)}. Dự kiến.
                    </small>
                  </label>
                )}
              </>
            )}

            <label className="waiting-wide">
              <span>
                {form.result === 'HEN_XU_LY'
                  ? 'Nội dung phân công, nếu cần'
                  : 'Kết quả trao đổi thực tế'}
              </span>
              <textarea
                rows={3}
                maxLength={1000}
                required={form.result !== 'HEN_XU_LY'}
                value={form.note}
                onChange={(event) => change('note', event.target.value)}
              />
            </label>

            <label className="waiting-check waiting-wide">
              <input
                type="checkbox"
                checked={form.confirmed}
                onChange={(event) => change('confirmed', event.target.checked)}
              />
              <span>
                {form.result === 'HEN_XU_LY'
                  ? 'Tôi xác nhận phân công và lịch xử lý.'
                  : 'Tôi đã thực hiện liên hệ và xác nhận đúng kết quả.'}
              </span>
            </label>
          </fieldset>

          {dialog.terms_text && (
            <details className="waiting-history">
              <summary>Điều kiện tiếp nhận lúc khách đặt</summary>
              <p>{dialog.terms_text}</p>
              <small>{formatDateTimeVN(dialog.terms_accepted_at)}</small>
            </details>
          )}

          <details className="waiting-history">
            <summary>Lịch sử liên hệ và phân công</summary>
            {historyError && <p className="waiting-error">{historyError}</p>}
            {!history.length && !historyError && <p>Chưa có cập nhật.</p>}
            {history.map((item) => (
              <article key={item.id}>
                <strong>{RESULTS[item.result] || item.result}</strong>
                <small className="waiting-line">
                  {formatDateTimeVN(item.occurred_at)} · {item.actor_name}
                </small>
                <p>{item.note}</p>
              </article>
            ))}
          </details>
        </OrderModal>
      )}
    </div>
  );
}
