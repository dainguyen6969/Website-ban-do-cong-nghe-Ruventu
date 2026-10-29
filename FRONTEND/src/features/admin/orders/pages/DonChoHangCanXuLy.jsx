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
const appointment = (value) => (value ? `${value}:00+07:00` : null);

function waitingDuration(value) {
  if (value == null) return 'Chưa rõ thời gian';
  const minutes = Math.max(0, Number(value));
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ`;
  return `${Math.floor(minutes / 1440)} ngày ${Math.floor((minutes % 1440) / 60)} giờ`;
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
      if (!form.confirmed) {
        setOperationError('Cần xác nhận đúng nội dung thao tác.');
        return;
      }

      const note =
        form.note.trim() ||
        (form.result === 'HEN_XU_LY'
          ? `Phân công xử lý; lịch tiếp theo: ${form.nextContactAt}.`
          : '');

      if (!note) {
        setOperationError('Nhập kết quả trao đổi thực tế.');
        return;
      }

      const connected = dialog.kind === 'ORDER' && CONNECTED.includes(form.result);

      body = {
        revision: Number(dialog.revision),
        result: form.result,
        employeeId: Number(form.employeeId) || null,
        nextContactAt: appointment(form.nextContactAt),
        promisedAt: connected ? appointment(form.promisedAt) : null,
        remainingMethod: connected ? form.remainingMethod || null : null,
        note,
        confirmed: true,
      };
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

      if (Number(error.status || error.response?.status) === 409 && !attempt.current) {
        editing.current = false;
        setDialog(null);
        setRevision((value) => value + 1);
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
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
        <div className="waiting-tabs">
          {[
            ['ORDER', 'Đơn chờ hàng'],
            ['NOTICE', 'Đăng ký báo có hàng'],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={kind === value ? 'is-active' : ''}
              onClick={() => {
                setKind(value);
                setPage(0);
                if (value === 'NOTICE') setParams({});
              }}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="waiting-filters">
          <input
            type="search"
            value={keyword}
            maxLength={100}
            placeholder="Mã đơn, khách hàng, số điện thoại, sản phẩm..."
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
          />

          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả mức ưu tiên</option>
            {Object.entries(PRIORITIES).map(([value, text]) => (
              <option key={value} value={value}>
                {text} ({data.summary?.[value] || 0})
              </option>
            ))}
          </select>

          {orderId && (
            <button type="button" className="waiting-button" onClick={() => setParams({})}>
              Xem tất cả đơn chờ
            </button>
          )}
        </div>

        <small>
          {loading ? 'Đang cập nhật...' : `Dữ liệu lúc ${formatDateTimeVN(data.updated_at)}`}
        </small>
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
        <table className="waiting-table">
          <thead>
            <tr>
              <th>Ưu tiên / việc cần làm</th>
              <th>Đơn / khách hàng</th>
              <th>Thanh toán</th>
              <th>Hàng / giữ hàng</th>
              <th>Thời gian / phụ trách</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {!data.items.length ? (
              <tr>
                <td colSpan={6}>
                  {loading ? 'Đang tải...' : 'Không có yêu cầu chờ xử lý phù hợp.'}
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={`${row.kind}:${row.id}`}>
                  <td>
                    <span className={`waiting-priority waiting-priority--${row.priority}`}>
                      {row.priority} · {PRIORITIES[row.priority]}
                    </span>
                    <strong className="waiting-line">{row.action_label}</strong>
                    <div className="waiting-signals">
                      {(row.signals || []).map((signal) => (
                        <small key={signal}>{signal}</small>
                      ))}
                    </div>
                  </td>

                  <td>
                    {row.kind === 'ORDER' ? (
                      <Link to={`/admin/don-hang/danh-sach-don-hang/${row.id}`}>
                        <strong>{row.code}</strong>
                      </Link>
                    ) : (
                      <strong>{row.code}</strong>
                    )}
                    <span className="waiting-line">{row.customer}</span>
                    {row.phone ? (
                      <a href={`tel:${row.phone}`}>{row.phone}</a>
                    ) : (
                      <small>Chưa có số điện thoại</small>
                    )}
                    <small className="waiting-line">{row.status_label}</small>
                  </td>

                  <td>
                    <strong>{row.payment_label}</strong>
                    {row.kind === 'ORDER' && (
                      <>
                        <small className="waiting-line">Thực thu: {cash(row.received)}</small>
                        {Number(row.refunded) > 0 && (
                          <small className="waiting-line">Đã hoàn: {cash(row.refunded)}</small>
                        )}
                        <small className="waiting-line">Còn phải thu: {cash(row.remaining)}</small>
                        {Number(row.cod_remaining) > 0 && (
                          <strong className="waiting-line">
                            COD còn lại: {cash(row.cod_remaining)}
                          </strong>
                        )}
                      </>
                    )}
                  </td>

                  <td>
                    <strong>{row.reservation_label}</strong>
                    <div className="waiting-products">
                      {(row.products || []).map((item, index) => (
                        <div key={item.phien_ban_id || index}>
                          <span>
                            {item.ten_san_pham} · {item.ten_phien_ban}
                          </span>
                          {row.kind === 'ORDER' && (
                            <small className="waiting-line">
                              Cần {item.so_luong_can} · Đã giữ {item.so_luong_da_giu}
                              {' · '}Chưa giữ {item.so_luong_con_can_giu}
                              {' · '}Cần nhập thêm {item.so_luong_thieu}
                            </small>
                          )}
                          <small className="waiting-line">
                            Có thể bán: {item.ton_co_the_ban ?? 'Chưa xác định'}
                          </small>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td>
                    <small className="waiting-line">Tạo: {formatDateTimeVN(row.created_at)}</small>
                    <span className="waiting-line">
                      Đã chờ: {waitingDuration(row.wait_minutes)}
                    </span>
                    <small className="waiting-line">
                      Liên hệ tiếp: {formatDateTimeVN(row.next_contact_at)}
                    </small>
                    {row.promised_at && (
                      <small className="waiting-line">
                        Mốc hẹn có hàng: {formatDateTimeVN(row.promised_at)}
                      </small>
                    )}
                    <strong className="waiting-line">
                      {row.employee_name || 'Chưa phân công'}
                    </strong>
                    <small className="waiting-line">
                      {RESULTS[row.contact_result] || 'Chưa có kết quả'}
                    </small>
                    {row.last_contact_name && (
                      <small className="waiting-line">
                        {row.last_contact_name} · {formatDateTimeVN(row.last_contact_at)}
                      </small>
                    )}
                    {row.contact_note && <small className="waiting-line">{row.contact_note}</small>}
                  </td>

                  <td>
                    <button type="button" className="waiting-button" onClick={() => open(row)}>
                      Liên hệ / hẹn xử lý
                    </button>
                    {row.kind === 'ORDER' && (
                      <Link
                        className="waiting-open-order"
                        to={`/admin/don-hang/danh-sach-don-hang/${row.id}`}
                      >
                        Mở đơn
                      </Link>
                    )}
                  </td>
                </tr>
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
          title="LIÊN HỆ VÀ LỊCH XỬ LÝ"
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

                <label>
                  <span>Thu phần tiền còn lại</span>
                  <select
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
                </label>
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
