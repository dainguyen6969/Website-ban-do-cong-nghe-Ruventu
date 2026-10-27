import { useCallback, useEffect, useRef, useState } from 'react';
import OrderModal from '../../orders/components/OrderModal';
import { PurchaseCard } from '../pages/PurchaseShared';
import { getSupplierCases, openSupplierCase, sendSupplierCaseEvent } from '../api/purchaseOrderApi';
import {
  errorMessage,
  formatDateTimeVN,
  inputFromApiTime,
  nowLocalInput,
  toApiDateTime,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import './SupplierCasePanel.css';

const ACTIONS = {
  OPEN: 'MỞ HỒ SƠ NCC',
  GUI: 'GỬI HÀNG CHO NCC',
  PHUONG_AN: 'CHỐT PHƯƠNG ÁN',
  NHAN: 'NHẬN HÀNG TỪ NCC',
  GUI_LAI: 'GỬI LẠI HÀNG CÒN LỖI',
  CHOT_TRA: 'NCC ĐÃ CHẤP NHẬN TRẢ HÀNG',
  CHAP_NHAN_LOI: 'KẾT THÚC ĐỐI SOÁT HÀNG LỖI',
  NHAN_BO_SUNG: 'NHẬN BỔ SUNG ĐÃ THỐNG NHẤT',
  PHI: 'GHI NHẬN ĐIỀU CHỈNH PHÍ',
  THU_TIEN: 'ĐÃ NHẬN TIỀN NCC HOÀN',
  CHI_TIEN: 'ĐÃ TRẢ TIỀN CHO NCC',
  THEO_DOI: 'NGƯỜI PHỤ TRÁCH VÀ HẠN XỬ LÝ',
  GHI_CHU: 'GHI NHẬN ĐỐI SOÁT',
  KET_THUC: 'KẾT THÚC HỒ SƠ',
  MO_LAI: 'MỞ LẠI ĐỂ ĐỐI SOÁT',
  MO_HO_SO: 'MỞ HỒ SƠ',
};

const STATES = {
  DANG_O_NCC: 'Đang ở NCC',
  DA_NHAN_LOI: 'Nhận lại nhưng còn lỗi',
  DA_NHAN_DAT: 'Đã nhận đạt',
  DA_TRA_NCC: 'Đã trả NCC',
  CHAP_NHAN_LOI: 'Đã đối soát, giữ ở hàng lỗi',
  DANG_XU_LY: 'Đang xử lý',
  HOAN_TAT: 'Hoàn tất',
  KET_THUC_DOI_SOAT: 'Kết thúc có đối soát',
};

const CONDITIONS = {
  CHUA_XAC_DINH: 'Chưa xác định',
  MOI: 'Mới',
  DA_SUA_CHUA: 'Đã sửa chữa',
  DA_QUA_SU_DUNG: 'Đã qua sử dụng',
};

const METHODS = {
  SUA_CHUA: 'Sửa chữa',
  DOI_HANG: 'Đổi hàng',
  TRA_HANG: 'Trả hàng',
};

const bool = (value) => value === true || value === 1 || value === '1';

const cash = (value) =>
  value == null
    ? '—'
    : `${Number(value).toLocaleString('vi-VN', {
        maximumFractionDigits: 2,
      })} đ`;

const codes = (value = '') =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const optionalId = (value) => (value ? Number(value) : null);

function deadlineValue(value) {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Hạn xử lý không hợp lệ.');
  }

  return `${value}:00+07:00`;
}

export default function SupplierCasePanel({ order, locked = false, onRefresh, onLockChange }) {
  const [data, setData] = useState(null);
  const [readError, setReadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});

  const attempt = useRef(null);
  const writing = useRef(false);
  const readSequence = useRef(0);
  const controller = useRef(null);

  const refresh = useCallback(async () => {
    const sequence = ++readSequence.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;

    setLoading(true);

    try {
      const result = await getSupplierCases(order.id, nextController.signal);

      if (sequence === readSequence.current && !nextController.signal.aborted) {
        setData(result);
        setReadError('');
      }
    } catch (error) {
      if (error.name !== 'AbortError' && sequence === readSequence.current) {
        setReadError(errorMessage(error));
      }
    } finally {
      if (sequence === readSequence.current && !nextController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [order.id]);

  useEffect(() => {
    refresh();
    return () => controller.current?.abort();
  }, [refresh, order.debt, order.refundDue, order.nccAdjustment]);

  useEffect(() => {
    onLockChange?.(busy || Boolean(attempt.current) || Boolean(dialog));
  }, [busy, dialog, operationError, onLockChange]);

  useEffect(() => () => onLockChange?.(false), [onLockChange]);

  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const open = (action, supplierCase = null, unit = null, followUp = false) => {
    if (locked || busy || attempt.current) return;

    setOperationError('');
    setNotice('');

    setDialog({
      action,
      caseId: supplierCase?.id ?? null,
      revision: supplierCase?.revision ?? null,
      unit,
      followUp,
    });

    const first = data?.sources?.[0];

    setForm({
      detailId: String(first?.id ?? ''),
      previousUnitId: followUp ? unit.id : null,
      quantity: 1,
      damagedQuantity:
        unit?.live_serial_status === 'LOI' ||
        ['DA_NHAN_LOI', 'CHAP_NHAN_LOI'].includes(unit?.status)
          ? 1
          : 0,
      serialIds: [],
      serialCodes: '',
      method: action === 'PHUONG_AN' ? unit?.method || 'SUA_CHUA' : 'SUA_CHUA',
      variantId: String(unit?.expected_variant_id ?? first?.phien_ban_id ?? ''),
      credit: unit?.credit ?? 0,
      value: unit?.receive_value ?? '',
      condition: action === 'NHAN_BO_SUNG' ? 'MOI' : 'CHUA_XAC_DINH',
      passed: false,
      alreadyInStock: false,
      amount:
        action === 'THU_TIEN'
          ? (data?.balance?.refundDue ?? '')
          : action === 'CHI_TIEN'
            ? (data?.balance?.debt ?? '')
            : '',
      paymentMethod: 'CHUYEN_KHOAN',
      transactionId: '',
      employeeId: supplierCase?.employee_id ? String(supplierCase.employee_id) : '',
      deadline: supplierCase?.deadline ? inputFromApiTime(supplierCase.deadline) : '',
      document: '',
      note: '',
      at: nowLocalInput(),
      confirmed: false,
    });
  };

  const source = data?.sources?.find((item) => Number(item.id) === Number(form.detailId));

  const unit = dialog?.unit;
  const action = dialog?.action;

  const isSourceAction = action === 'NHAN_BO_SUNG' || (action === 'GUI' && !dialog?.followUp);

  const sourceManaged = dialog?.followUp
    ? bool(unit?.serial_managed)
    : bool(source?.co_quan_ly_serial);

  const receiveManaged = action === 'NHAN' && bool(unit?.expected_serial_managed);

  const frozen = busy || Boolean(attempt.current);

  const close = () => {
    if (busy || attempt.current) return;
    setDialog(null);
    setOperationError('');
  };

  const send = (scope, body) =>
    withIdempotency(attempt, scope, body, (key, payload) => {
      if (scope === 'open') return openSupplierCase(order.id, key, payload);

      return sendSupplierCaseEvent(order.id, Number(scope.split(':')[1]), key, payload);
    });

  const execute = async (scope, body) => {
    if (writing.current) return;

    writing.current = true;
    setBusy(true);
    setOperationError('');

    try {
      await send(scope, body);
      setDialog(null);
      setNotice('Đã ghi nhận thao tác và đồng bộ dữ liệu.');
      await Promise.all([refresh(), onRefresh?.()]);
    } catch (error) {
      setOperationError(errorMessage(error));

      const status = Number(error.status || error.response?.status);

      if (status === 409 && !attempt.current) {
        setDialog(null);
        await refresh();
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const submit = () => {
    if (attempt.current) {
      return execute(attempt.current.scope, attempt.current.body);
    }

    if (!dialog || locked || busy) return;

    try {
      if (!form.confirmed) {
        throw new Error('Chỉ xác nhận khi sự việc thực tế đã xảy ra hoặc đã được chốt.');
      }

      if (!form.document.trim() || !form.note.trim()) {
        throw new Error('Cần mã chứng từ/thỏa thuận và nội dung đối soát.');
      }

      const at = toApiDateTime(form.at);

      if (action === 'OPEN') {
        return execute('open', {
          reason: form.note.trim(),
          employeeId: optionalId(form.employeeId),
          deadline: deadlineValue(form.deadline),
          document: form.document.trim(),
          at,
          confirmed: true,
        });
      }

      let quantity = Number(form.quantity);
      let damagedQuantity = Number(form.damagedQuantity);
      let serialIds = form.serialIds.map(Number);
      let serialCodes = codes(form.serialCodes);

      if (action === 'GUI' && !dialog.followUp && sourceManaged) {
        quantity = serialIds.length;
        damagedQuantity = (source?.serials ?? []).filter(
          (item) => serialIds.includes(Number(item.id)) && item.trang_thai === 'LOI'
        ).length;
      }

      if (action === 'NHAN_BO_SUNG' && sourceManaged) {
        quantity = form.alreadyInStock ? serialIds.length : serialCodes.length;
      }

      if (action === 'GUI' && dialog.followUp) {
        quantity = 1;
        serialIds = [];
      }

      const body = {
        revision: Number(dialog.revision),
        action,
        unitId: action === 'GUI' ? null : (unit?.id ?? null),
        detailId: optionalId(form.detailId),
        previousUnitId: form.previousUnitId,
        quantity,
        damagedQuantity,
        serialIds,
        serialCodes,
        method: form.method,
        variantId: optionalId(form.variantId),
        credit: form.credit === '' ? null : String(form.credit),
        value: form.value === '' ? null : String(form.value),
        condition: form.condition,
        passed: form.passed,
        alreadyInStock: form.alreadyInStock,
        amount: form.amount === '' ? null : String(form.amount),
        paymentMethod: form.paymentMethod,
        transactionId: form.transactionId.trim(),
        employeeId: optionalId(form.employeeId),
        deadline: deadlineValue(form.deadline),
        document: form.document.trim(),
        note: form.note.trim(),
        at,
        confirmed: true,
      };

      if (action === 'NHAN') {
        body.variantId = Number(unit.expected_variant_id);
      }

      if (['GUI', 'NHAN_BO_SUNG'].includes(action)) {
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
          throw new Error('Mỗi lần cần từ 1 đến 100 thiết bị.');
        }
      }

      return execute(`case:${dialog.caseId}`, body);
    } catch (error) {
      setOperationError(errorMessage(error));
    }
  };

  const button = (label, callback, disabled = false) => (
    <button
      type="button"
      className="ncc-btn"
      disabled={locked || busy || Boolean(attempt.current) || disabled}
      onClick={callback}
    >
      {label}
    </button>
  );

  const selectSerials = () => (
    <div className="ncc-serials">
      {(source?.serials ?? []).map((serial) => {
        const selected = form.serialIds.includes(String(serial.id));

        return (
          <label key={serial.id}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() =>
                change(
                  'serialIds',
                  selected
                    ? form.serialIds.filter((id) => id !== String(serial.id))
                    : [...form.serialIds, String(serial.id)]
                )
              }
            />
            <span>{serial.so_serial}</span>
            <small>{serial.trang_thai === 'LOI' ? 'Hàng lỗi' : 'Trong kho'}</small>
          </label>
        );
      })}
      {!source?.serials?.length && <p>Không có serial nguồn đang có thể chọn.</p>}
    </div>
  );

  return (
    <PurchaseCard title="XỬ LÝ VÀ ĐỐI SOÁT NHÀ CUNG CẤP">
      <section className="ncc-panel" aria-busy={loading || busy}>
        <div className="ncc-toolbar">
          <p>
            Theo dõi hàng gửi sửa, đổi, trả và hàng nhận bổ sung. Tiền được đối chiếu theo đơn nhập.
          </p>
          {button(
            'MỞ HỒ SƠ NCC',
            () => open('OPEN'),
            ['DAT_HANG', 'HUY'].includes(order.importStatus) || !data
          )}
        </div>

        {loading && !data && <p role="status">Đang tải hồ sơ NCC...</p>}

        {readError && (
          <div className="ncc-error" role="alert">
            <p>{readError}</p>
            {button('THỬ TẢI LẠI', refresh)}
          </div>
        )}

        {notice && (
          <p className="ncc-notice" role="status">
            {notice}
          </p>
        )}

        {operationError && !dialog && (
          <p className="ncc-error" role="alert">
            {operationError}
          </p>
        )}

        {data && (
          <div className="ncc-summary">
            <div>
              <span>Nghĩa vụ sau điều chỉnh</span>
              <b>{cash(data.balance.effective)}</b>
            </div>
            <div>
              <span>Tổng điều chỉnh NCC</span>
              <b>{cash(data.balance.adjustment)}</b>
            </div>
            <div>
              <span>Cửa hàng còn phải trả</span>
              <b>{cash(data.balance.debt)}</b>
            </div>
            <div>
              <span>NCC còn phải hoàn</span>
              <b>{cash(data.balance.refundDue)}</b>
            </div>
          </div>
        )}

        {data?.cases?.length === 0 && (
          <p className="ncc-muted">Đơn nhập chưa có hồ sơ xử lý NCC.</p>
        )}

        {data?.cases?.map((supplierCase) => {
          const active = supplierCase.status === 'DANG_XU_LY';
          const units = supplierCase.units ?? [];
          const overdue =
            active &&
            supplierCase.deadline &&
            new Date(supplierCase.deadline).getTime() < Date.now();

          return (
            <article className="ncc-case" key={supplierCase.id} id={`ncc-case-${supplierCase.id}`}>
              <header className="ncc-case__header">
                <div>
                  <strong>{supplierCase.code}</strong>
                  <p>{supplierCase.reason}</p>
                  <small>
                    Phụ trách: {supplierCase.employee_name} · Hạn:{' '}
                    {formatDateTimeVN(supplierCase.deadline)}
                  </small>
                </div>
                <span className={overdue ? 'ncc-status ncc-status--error' : 'ncc-status'}>
                  {overdue ? 'QUÁ HẠN · ' : ''}
                  {STATES[supplierCase.status] ?? supplierCase.status}
                </span>
              </header>

              <div className="ncc-case__totals">
                <span>
                  Ở NCC: <b>{units.filter((u) => u.status === 'DANG_O_NCC').length}</b>
                </span>
                <span>
                  Còn lỗi: <b>{units.filter((u) => u.status === 'DA_NHAN_LOI').length}</b>
                </span>
                <span>
                  Đã nhận đạt: <b>{units.filter((u) => u.status === 'DA_NHAN_DAT').length}</b>
                </span>
                <span>
                  Điều chỉnh: <b>{cash(supplierCase.adjustment)}</b>
                </span>
              </div>

              <div className="ncc-actions">
                {active && (
                  <>
                    {button('GỬI HÀNG', () => open('GUI', supplierCase))}
                    {button('NHẬN BỔ SUNG', () => open('NHAN_BO_SUNG', supplierCase))}
                    {button('ĐIỀU CHỈNH PHÍ', () => open('PHI', supplierCase))}
                    {button(
                      'ĐÃ TRẢ TIỀN',
                      () => open('CHI_TIEN', supplierCase),
                      Number(data.balance.debt) <= 0
                    )}
                    {button(
                      'ĐÃ NHẬN TIỀN HOÀN',
                      () => open('THU_TIEN', supplierCase),
                      Number(data.balance.refundDue) <= 0
                    )}
                    {button('PHỤ TRÁCH / HẠN', () => open('THEO_DOI', supplierCase))}
                    {button('KẾT THÚC', () => open('KET_THUC', supplierCase))}
                  </>
                )}
                {button('GHI NHẬN ĐỐI SOÁT', () => open('GHI_CHU', supplierCase))}
                {!active && button('MỞ LẠI', () => open('MO_LAI', supplierCase))}
              </div>

              {units.length > 0 && (
                <div className="ncc-table-wrap">
                  <table className="ncc-table">
                    <thead>
                      <tr>
                        <th>Thiết bị / nguồn</th>
                        <th>Phương án / giá trị</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>
                              #{item.id} · {item.variant_name}
                            </strong>
                            <p>{item.so_serial || 'Không quản lý serial'}</p>
                            <small>
                              {CONDITIONS[item.condition_code] ?? item.condition_code}
                              {item.parent_id ? ` · Nối từ thiết bị #${item.parent_id}` : ''}
                              {item.origin !== 'ORIGINAL' ? ' · Hàng nhận bổ sung' : ''}
                            </small>
                          </td>
                          <td>
                            <strong>{METHODS[item.method]}</strong>
                            <p>Nhận: {item.expected_variant_name}</p>
                            <small>
                              NCC nhận quy đổi: {cash(item.credit)}
                              {' · '}Hàng nhận: {cash(item.receive_value)}
                            </small>
                            {item.status === 'DANG_O_NCC' && !bool(item.planned) && (
                              <p className="ncc-error">Chưa chốt phương án.</p>
                            )}
                          </td>
                          <td>
                            <b>{STATES[item.status]}</b>
                            {bool(item.has_child) && <p>Đã có lần xử lý tiếp theo.</p>}
                          </td>
                          <td>
                            <div className="ncc-actions ncc-actions--column">
                              {active && item.status === 'DANG_O_NCC' && (
                                <>
                                  {button('CHỐT PHƯƠNG ÁN', () =>
                                    open('PHUONG_AN', supplierCase, item)
                                  )}
                                  {button(
                                    'NHẬN HÀNG',
                                    () => open('NHAN', supplierCase, item),
                                    !bool(item.planned)
                                  )}
                                  {item.method === 'TRA_HANG' &&
                                    button(
                                      'CHỐT TRẢ NCC',
                                      () => open('CHOT_TRA', supplierCase, item),
                                      !bool(item.planned)
                                    )}
                                </>
                              )}
                              {active && item.status === 'DA_NHAN_LOI' && (
                                <>
                                  {button('GỬI LẠI', () => open('GUI_LAI', supplierCase, item))}
                                  {button('CHẤP NHẬN GIỮ HÀNG LỖI', () =>
                                    open('CHAP_NHAN_LOI', supplierCase, item)
                                  )}
                                </>
                              )}
                              {active &&
                                ['DA_NHAN_DAT', 'CHAP_NHAN_LOI'].includes(item.status) &&
                                !bool(item.has_child) &&
                                button('XỬ LÝ TIẾP', () => open('GUI', supplierCase, item, true))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <details className="ncc-history">
                <summary>CHỨNG TỪ VÀ LỊCH SỬ ({supplierCase.events?.length ?? 0})</summary>
                {(supplierCase.events ?? []).map((event) => (
                  <article key={event.id}>
                    <strong>{ACTIONS[event.action] ?? event.action}</strong>
                    <small>
                      {formatDateTimeVN(event.occurred_at)} · {event.actor_name}
                      {event.unit_id ? ` · Thiết bị #${event.unit_id}` : ''}
                    </small>
                    {(event.old_serial || event.new_serial) && (
                      <p>
                        {event.old_serial || '—'} → {event.new_serial || '—'}
                      </p>
                    )}
                    <p>Chứng từ: {event.document}</p>
                    <p>{event.note}</p>
                    {event.voucher_id && <p>Phiếu tiền #{event.voucher_id}</p>}
                    <details>
                      <summary>Dữ liệu đã chốt</summary>
                      <pre>{event.payload}</pre>
                    </details>
                  </article>
                ))}
              </details>
            </article>
          );
        })}

        {dialog && (
          <OrderModal
            title={ACTIONS[action]}
            subtitle={
              unit ? `Thiết bị #${unit.id} · ${unit.so_serial || unit.variant_name}` : order.code
            }
            className="ncc-modal"
            showClose
            busy={busy}
            error={operationError}
            disabled={!form.confirmed && !attempt.current}
            confirmLabel={attempt.current ? 'THỬ LẠI YÊU CẦU CŨ' : 'XÁC NHẬN'}
            close={close}
            submit={submit}
          >
            {attempt.current && (
              <p className="ncc-error">
                Chưa xác định được kết quả. Giữ nguyên yêu cầu và thử lại.
              </p>
            )}

            <fieldset className="ncc-fields" disabled={frozen}>
              {isSourceAction && (
                <label>
                  <span>DÒNG ĐƠN NHẬP</span>
                  <select
                    value={form.detailId}
                    onChange={(event) => {
                      change('detailId', event.target.value);
                      change('serialIds', []);
                      change('serialCodes', '');
                      change('alreadyInStock', false);
                    }}
                  >
                    {(data?.sources ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.ten_phien_ban} · Nguồn chưa gửi: {item.capacity}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {action === 'GUI' && dialog.followUp && (
                <p>Gửi tiếp đúng thiết bị đang có, giữ toàn bộ chuỗi lịch sử trước đó.</p>
              )}

              {action === 'GUI' && (
                <label>
                  <span>MỤC ĐÍCH GỬI</span>
                  <select
                    value={form.method}
                    onChange={(event) => change('method', event.target.value)}
                  >
                    {Object.entries(METHODS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {action === 'GUI' && !dialog.followUp && sourceManaged && selectSerials()}

              {action === 'GUI' && !sourceManaged && (
                <>
                  {!dialog.followUp && (
                    <label>
                      <span>SỐ LƯỢNG GỬI</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={form.quantity}
                        onChange={(event) => change('quantity', event.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    <span>SỐ LƯỢNG ĐANG THUỘC HÀNG LỖI</span>
                    <input
                      type="number"
                      min="0"
                      max={dialog.followUp ? 1 : form.quantity}
                      step="1"
                      value={form.damagedQuantity}
                      onChange={(event) => change('damagedQuantity', event.target.value)}
                    />
                  </label>
                </>
              )}

              {action === 'PHUONG_AN' && (
                <>
                  <label>
                    <span>PHƯƠNG ÁN ĐÃ THỐNG NHẤT</span>
                    <select
                      value={form.method}
                      onChange={(event) => change('method', event.target.value)}
                    >
                      {Object.entries(METHODS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.method === 'DOI_HANG' && (
                    <label>
                      <span>PHIÊN BẢN HÀNG ĐỔI</span>
                      <select
                        value={form.variantId}
                        onChange={(event) => change('variantId', event.target.value)}
                      >
                        {(data?.variants ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.ten_san_pham} · {item.ten_phien_ban}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.method !== 'SUA_CHUA' && (
                    <label>
                      <span>GIÁ TRỊ NCC CHẤP NHẬN QUY ĐỔI / TRẢ, GỒM THUẾ</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.credit}
                        onChange={(event) => change('credit', event.target.value)}
                      />
                    </label>
                  )}

                  {form.method === 'DOI_HANG' && (
                    <label>
                      <span>GIÁ TRỊ HÀNG NHẬN THAY THẾ, GỒM THUẾ</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.value}
                        onChange={(event) => change('value', event.target.value)}
                      />
                    </label>
                  )}

                  <p className="ncc-muted">
                    Chốt phương án chưa phát sinh thu/chi tiền. Chênh lệch được ghi khi nhận hàng
                    đổi hoặc khi NCC chấp nhận trả hàng.
                  </p>
                </>
              )}

              {action === 'NHAN_BO_SUNG' && (
                <>
                  <p>
                    Chỉ dùng khi cửa hàng đã đồng ý nhận mua phần bổ sung và chốt giá với NCC. Đơn
                    đặt ban đầu được giữ nguyên.
                  </p>

                  {Number(source?.legacy_extra_capacity) > 0 && (
                    <label className="ncc-check">
                      <input
                        type="checkbox"
                        checked={form.alreadyInStock}
                        onChange={(event) => {
                          change('alreadyInStock', event.target.checked);
                          change('serialIds', []);
                          change('serialCodes', '');
                        }}
                      />
                      <span>
                        Đối chiếu hàng đã nhập thừa trong dữ liệu cũ ({source.legacy_extra_capacity}{' '}
                        sản phẩm); không nhập kho lần nữa.
                      </span>
                    </label>
                  )}

                  {sourceManaged && form.alreadyInStock && selectSerials()}

                  {sourceManaged && !form.alreadyInStock && (
                    <label>
                      <span>SERIAL HÀNG BỔ SUNG — MỖI DÒNG MỘT MÃ</span>
                      <textarea
                        rows="4"
                        value={form.serialCodes}
                        onChange={(event) => change('serialCodes', event.target.value)}
                      />
                    </label>
                  )}

                  {!sourceManaged && (
                    <>
                      <label>
                        <span>SỐ LƯỢNG</span>

                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={form.quantity}
                          onChange={(event) => change('quantity', event.target.value)}
                        />
                      </label>

                      {form.alreadyInStock && (
                        <label>
                          <span>TRONG ĐÓ, SỐ LƯỢNG ĐANG THUỘC HÀNG LỖI</span>

                          <input
                            type="number"
                            min="0"
                            max={form.quantity}
                            step="1"
                            value={form.damagedQuantity}
                            onChange={(event) => change('damagedQuantity', event.target.value)}
                          />
                        </label>
                      )}
                    </>
                  )}

                  <label>
                    <span>GIÁ ĐÃ CHỐT CHO MỖI SẢN PHẨM, GỒM THUẾ</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(event) => change('value', event.target.value)}
                    />
                  </label>
                </>
              )}

              {action === 'NHAN' && (
                <>
                  <p>
                    Nhận: <b>{unit.expected_variant_name}</b>.
                    {unit.method !== 'DOI_HANG'
                      ? ' Phải nhận lại đúng thiết bị đã gửi.'
                      : ' Serial hàng đổi phải chưa tồn tại trong hệ thống.'}
                  </p>
                  {receiveManaged && (
                    <label>
                      <span>SERIAL THỰC NHẬN</span>
                      <input
                        value={form.serialCodes}
                        maxLength={100}
                        onChange={(event) => change('serialCodes', event.target.value)}
                      />
                    </label>
                  )}
                </>
              )}

              {(action === 'NHAN' || (action === 'NHAN_BO_SUNG' && !form.alreadyInStock)) && (
                <>
                  <label>
                    <span>TÌNH TRẠNG HÀNG THỰC NHẬN</span>
                    <select
                      value={form.condition}
                      onChange={(event) => change('condition', event.target.value)}
                    >
                      {Object.entries(CONDITIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ncc-check">
                    <input
                      type="checkbox"
                      checked={form.passed}
                      onChange={(event) => change('passed', event.target.checked)}
                    />
                    <span>Đã kiểm tra đạt, đủ điều kiện đưa vào tồn có thể bán.</span>
                  </label>
                  <p className="ncc-muted">
                    Không đánh dấu đạt: hàng nhận vào tồn thực tế và hàng lỗi, không tăng tồn có thể
                    bán.
                  </p>
                </>
              )}

              {['PHI', 'THU_TIEN', 'CHI_TIEN'].includes(action) && (
                <label>
                  <span>
                    {action === 'PHI' ? 'PHÍ ĐIỀU CHỈNH (+ TĂNG / − GIẢM)' : 'SỐ TIỀN THỰC TẾ'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => change('amount', event.target.value)}
                  />
                </label>
              )}

              {['THU_TIEN', 'CHI_TIEN'].includes(action) && (
                <>
                  <p>Khoản này được đối chiếu vào công nợ chung của đơn nhập {order.code}.</p>
                  <label>
                    <span>PHƯƠNG THỨC</span>
                    <select
                      value={form.paymentMethod}
                      onChange={(event) => change('paymentMethod', event.target.value)}
                    >
                      <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                      <option value="TIEN_MAT">Tiền mặt</option>
                      <option value="THE">Thẻ</option>
                    </select>
                  </label>
                  {form.paymentMethod !== 'TIEN_MAT' && (
                    <label>
                      <span>MÃ GIAO DỊCH</span>
                      <input
                        maxLength="255"
                        value={form.transactionId}
                        onChange={(event) => change('transactionId', event.target.value)}
                      />
                    </label>
                  )}
                </>
              )}

              {['OPEN', 'THEO_DOI'].includes(action) && (
                <>
                  <label>
                    <span>NGƯỜI PHỤ TRÁCH</span>
                    <select
                      value={form.employeeId}
                      onChange={(event) => change('employeeId', event.target.value)}
                    >
                      <option value="">Tôi phụ trách</option>
                      {(data?.employees ?? []).map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>HẠN XỬ LÝ</span>
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(event) => change('deadline', event.target.value)}
                    />
                  </label>
                </>
              )}

              {action === 'CHOT_TRA' && (
                <p>NCC đã chấp nhận nhận lại hàng và giá trị đã chốt. Không trừ tồn lần nữa.</p>
              )}

              {action === 'CHAP_NHAN_LOI' && (
                <p>Hàng vẫn thuộc hàng lỗi trong kho; thao tác này không làm hàng có thể bán.</p>
              )}

              <label>
                <span>CHỨNG TỪ / MÃ THỎA THUẬN / MÃ ĐỐI SOÁT</span>
                <input
                  maxLength="100"
                  value={form.document}
                  onChange={(event) => change('document', event.target.value)}
                />
              </label>

              <label>
                <span>NỘI DUNG VÀ CĂN CỨ XÁC NHẬN</span>
                <textarea
                  rows="3"
                  maxLength={action === 'OPEN' ? 500 : 1000}
                  value={form.note}
                  onChange={(event) => change('note', event.target.value)}
                />
              </label>

              <label>
                <span>THỜI ĐIỂM THỰC HIỆN</span>
                <input
                  type="datetime-local"
                  value={form.at}
                  onChange={(event) => change('at', event.target.value)}
                />
              </label>

              <label className="ncc-check">
                <input
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={(event) => change('confirmed', event.target.checked)}
                />
                <span>
                  Tôi xác nhận nội dung, chứng từ và sự việc thực tế phù hợp với thao tác này.
                </span>
              </label>
            </fieldset>
          </OrderModal>
        )}
      </section>
    </PurchaseCard>
  );
}
