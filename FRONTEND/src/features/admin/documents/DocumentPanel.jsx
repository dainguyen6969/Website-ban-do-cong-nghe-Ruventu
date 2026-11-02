import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from '../catalog/products/api/versionApi';
import OrderModal from '../orders/components/OrderModal';
import {
  errorMessage,
  formatDateTimeVN,
  withIdempotency,
} from '../../../shared/services/mutationUtils';
import './DocumentPanel.css';

const API = '/api/v1/admin/documents';
const yes = (value) => value === true || Number(value) === 1;
const money = (value) =>
  Number(value ?? 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });

const kindLabel = (kind) =>
  kind === 'HOA_DON' ? 'Hóa đơn Nhà Cung Cấp' : 'Phiếu giao hàng Nhà Cung Cấp';

function Field({ label, children, ...props }) {
  return (
    <label className="rv-doc-field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}

function PurchaseLink({ id, code }) {
  return id ? (
    <Link to={`/kho-hang/nhap-hang/${id}`}>{code || `Đơn nhập #${id}`}</Link>
  ) : (
    <span>Chưa xác định</span>
  );
}

function TraceView({ data }) {
  const receipts = data?.receipts || [];
  const warranties = data?.warranty || [];
  const returns = (data?.devices || []).filter((item) => item.return_id || item.ma_tra_hang);

  return (
    <div className="rv-doc-trace">
      <h3>Nguồn nhận</h3>

      {!receipts.length && <p className="rv-doc-warning">Chưa có nguồn nhận đã được xác minh.</p>}

      {receipts.map((receipt) => (
        <article className="rv-doc-record" key={receipt.receipt_line_id}>
          <strong>{receipt.code || `Nguồn #${receipt.id}`}</strong>

          <p>
            <PurchaseLink id={receipt.purchase_id} code={receipt.ma_don_nhap} />
            {' · '}
            {receipt.ten_nha_cung_cap}
          </p>

          <p>
            Lô: {receipt.supplier_lot || 'Chưa ghi nhận'}
            {' · '}
            Số lượng nguồn: {receipt.quantity}
          </p>

          {receipt.supplier_document && <p>Chứng từ khi nhận: {receipt.supplier_document}</p>}

          {(receipt.documents || []).map((document) => (
            <p key={document.id}>
              {kindLabel(document.kind)}: <b>{document.external_number}</b>
              {' · '}
              SL liên kết: {document.quantity}
              {' · '}
              {money(document.amount)}
            </p>
          ))}
        </article>
      ))}

      <h3>Đổi và bảo hành</h3>

      {!warranties.length && <p className="rv-doc-muted">Chưa có phát sinh.</p>}

      {warranties.map((item) => (
        <article className="rv-doc-record" key={item.id}>
          <Link to={`/admin/bao-hanh/chi-tiet/${item.id}`}>
            {item.ma_phieu || `Phiếu bảo hành #${item.id}`}
          </Link>
          <p>
            {item.trang_thai_xu_ly} · {item.ket_qua_xu_ly || 'Chưa kết luận'}
          </p>

          {(item.old_serial || item.new_serial) && (
            <p>
              {item.old_serial || '—'} → {item.new_serial || '—'}
            </p>
          )}
        </article>
      ))}

      <h3>Trả hàng</h3>

      {!returns.length && <p className="rv-doc-muted">Chưa có phát sinh.</p>}

      {returns.map((item) => (
        <article className="rv-doc-record" key={item.id}>
          <Link to={`/admin/don-hang/khach-tra-hang/${item.return_id}`}>{item.ma_tra_hang}</Link>
          <p>{item.trang_thai_tra_hang}</p>
        </article>
      ))}

      <h3>Xử lý Nhà Cung Cấp</h3>

      {!(data?.supplierEvents || []).length && (
        <p className="rv-doc-muted">Chưa có sự kiện gắn trực tiếp với nhận dạng thiết bị này.</p>
      )}

      {(data?.supplierEvents || []).map((item) => (
        <article className="rv-doc-record" key={item.id}>
          <strong>{item.code || `Hồ sơ #${item.case_id}`}</strong>
          <p>
            {item.action} · {item.document || 'Chưa ghi chứng từ'}
          </p>
          <p>{item.note}</p>
        </article>
      ))}

      <h3>Thu hồi</h3>

      {!(data?.recalls || []).length && (
        <p className="rv-doc-muted">Chưa có phát sinh gắn với thiết bị.</p>
      )}

      {(data?.recalls || []).map((item) => (
        <article className="rv-doc-record" key={item.id}>
          <Link to="/kho-hang/thu-hoi">{item.code}</Link>
          <p>
            {item.status} · {item.result || 'Chưa có kết quả'}
          </p>
        </article>
      ))}

      {!!data?.sourceHistory?.length && (
        <details className="rv-doc-history">
          <summary>Lịch sử xác nhận nguồn</summary>

          {data.sourceHistory.map((item) => (
            <article className="rv-doc-record" key={item.revision}>
              <strong>Lần đối chiếu {item.revision}</strong>
              <p>
                <PurchaseLink id={item.purchase_id} code={item.ma_don_nhap} />
                {' · '}
                {item.receipt_code || `Dòng nguồn #${item.receipt_line_id}`}
              </p>
              <p>{item.note}</p>
              <small>
                {item.actor_name} · {formatDateTimeVN(item.recorded_at)}
              </small>
            </article>
          ))}
        </details>
      )}
    </div>
  );
}

export default function DocumentPanel({ mode, id, locked = false, onEditingChange }) {
  const [options, setOptions] = useState(null);
  const [data, setData] = useState(null);
  const [readError, setReadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const attempt = useRef(null);
  const writing = useRef(false);
  const reader = useRef(null);
  const sequence = useRef(0);

  const path =
    mode === 'money' ? `/money/${id}` : mode === 'purchase' ? `/purchases/${id}` : `/orders/${id}`;

  const load = useCallback(async () => {
    const current = ++sequence.current;
    reader.current?.abort();

    const controller = new AbortController();
    reader.current = controller;
    setReadError('');

    try {
      const nextOptions = await adminRequest(`${API}/options`, {
        signal: controller.signal,
      });

      if (current !== sequence.current) return;
      setOptions(nextOptions);

      if (nextOptions.visible === false) return;

      const next = await adminRequest(`${API}${path}`, {
        signal: controller.signal,
      });

      if (current === sequence.current) setData(next);
    } catch (error) {
      if (!controller.signal.aborted && current === sequence.current) {
        setReadError(errorMessage(error));
      }
    }
  }, [path]);

  useEffect(() => {
    load();

    return () => {
      sequence.current += 1;
      reader.current?.abort();
    };
  }, [load]);

  const editing = Boolean(dialog || busy || attempt.current);

  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  const update = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));

  const open = (kind, extra = {}) => {
    if (locked || busy || attempt.current) return;

    setOperationError('');

    const current = data?.current;

    setForm({
      confirmed: false,
      code: '',
      name: '',
      kind: kind === 'fund' ? 'TIEN_MAT' : 'HOA_DON',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      fundId: current?.fund_id ? String(current.fund_id) : '',
      cashEmployeeId: current?.cash_employee_id ? String(current.cash_employee_id) : '',
      transactionReference: current?.transaction_reference || '',
      note: '',
      documentId: '',
      externalNumber: '',
      issuedDate: new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
      totalAmount: '',
      lines: {},
      receiptLineId: '',
    });

    setDialog({ kind, ...extra });
  };

  const execute = async (scope, body) => {
    if (writing.current) return;

    writing.current = true;
    setBusy(true);
    setOperationError('');

    try {
      await withIdempotency(attempt, scope, body, (key, frozenBody) =>
        adminRequest(scope, {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: JSON.stringify(frozenBody),
        })
      );

      setDialog(null);
      await load();
    } catch (error) {
      setOperationError(errorMessage(error));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const retry = () => {
    const saved = attempt.current;
    if (saved) execute(saved.scope, saved.body);
  };

  const openSource = async (device) => {
    if (locked || busy || attempt.current) return;

    open('source', { device, candidates: null });

    try {
      const candidates = await adminRequest(`${API}/devices/${device.id}/sources`);

      setDialog((current) =>
        current?.kind === 'source' && current.device.id === device.id
          ? { ...current, candidates }
          : current
      );
    } catch (error) {
      setOperationError(errorMessage(error));
    }
  };

  const openTrace = async (deviceId) => {
    if (locked || busy || attempt.current) return;

    setOperationError('');
    setDialog({ kind: 'trace', data: null });

    try {
      const result = await adminRequest(`${API}/devices/${deviceId}/trace`);
      setDialog((current) => (current?.kind === 'trace' ? { ...current, data: result } : current));
    } catch (error) {
      setOperationError(errorMessage(error));
    }
  };

  const selectDocument = (value) => {
    const selected = (data?.documents || []).find((item) => String(item.id) === value);

    setForm((previous) => ({
      ...previous,
      documentId: value,
      kind: selected?.kind || 'HOA_DON',
      externalNumber: selected?.external_number || '',
      issuedDate:
        selected?.issued_date ||
        new Date().toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Ho_Chi_Minh',
        }),
      totalAmount: selected?.total_amount ?? '',
      lines: {},
    }));
  };

  const submit = () => {
    if (attempt.current) return retry();
    if (!dialog || !form.confirmed || busy || locked) return;

    let scope;
    let body;

    if (dialog.kind === 'fund') {
      scope = `${API}/funds`;
      body = {
        code: form.code,
        name: form.name,
        kind: form.kind,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountHolder: form.accountHolder,
        confirmed: true,
      };
    } else if (dialog.kind === 'money') {
      const cash = data.voucher.phuong_thuc_thanh_toan === 'TIEN_MAT';

      scope = `${API}/money/${id}`;
      body = {
        revision: Number(data.current?.revision || 0),
        fundId: Number(form.fundId) || null,
        cashEmployeeId: cash ? Number(form.cashEmployeeId) || null : null,
        transactionReference: cash ? null : form.transactionReference,
        note: form.note,
        confirmed: true,
      };
    } else if (dialog.kind === 'document') {
      const selected = (data.documents || []).find((item) => String(item.id) === form.documentId);

      scope = `${API}/purchases/${id}/supplier-documents`;
      body = {
        documentId: selected?.id || null,
        revision: Number(selected?.revision || 0),
        kind: form.kind,
        externalNumber: form.externalNumber,
        issuedDate: form.issuedDate,
        totalAmount: Number(form.totalAmount),
        items: Object.entries(form.lines)
          .filter(([, item]) => item.selected)
          .map(([lineId, item]) => ({
            receiptLineId: Number(lineId),
            quantity: Number(item.quantity),
            amount: Number(item.amount),
          })),
        confirmed: true,
      };
    } else if (dialog.kind === 'source') {
      scope = `${API}/devices/${dialog.device.id}/source`;
      body = {
        revision: Number(dialog.device.source_revision || 0),
        receiptLineId: Number(form.receiptLineId) || null,
        note: form.note,
        confirmed: true,
      };
    } else {
      return;
    }

    execute(scope, body);
  };

  if (options?.visible === false) return null;

  const frozen = busy || Boolean(attempt.current);
  const current = data?.current;
  const funds = options?.funds || [];
  const cash = data?.voucher?.phuong_thuc_thanh_toan === 'TIEN_MAT';

  const input = (name, label, type = 'text', extra = {}) => (
    <Field
      label={label}
      type={type}
      value={form[name] ?? ''}
      onChange={(event) => update(name, event.target.value)}
      {...extra}
    />
  );

  return (
    <section className="rv-doc" aria-busy={busy}>
      <header className="rv-doc-heading">
        <h2>
          {mode === 'money'
            ? 'NGƯỜI XỬ LÝ VÀ TÀI KHOẢN TIỀN'
            : mode === 'purchase'
              ? 'CHỨNG TỪ NHÀ CUNG CẤP VÀ HÀNG ĐÃ BÁN'
              : 'PHIẾU XUẤT VÀ NGUỒN HÀNG'}
        </h2>

        {data && mode === 'money' && (
          <button
            type="button"
            disabled={locked || frozen || data.voucher.trang_thai !== 'DA_GHI_NHAN'}
            onClick={() => open('money')}
          >
            {current ? 'ĐIỀU CHỈNH ĐỐI CHIẾU' : 'BỔ SUNG ĐỐI CHIẾU'}
          </button>
        )}

        {data && mode === 'purchase' && (
          <button
            type="button"
            disabled={locked || frozen || !data.lines?.length}
            onClick={() => open('document')}
          >
            LIÊN KẾT CHỨNG TỪ NHÀ CUNG CẤP
          </button>
        )}
      </header>

      {readError && (
        <div className="rv-doc-error" role="alert">
          <p>{readError}</p>
          <button type="button" disabled={busy} onClick={load}>
            THỬ TẢI LẠI
          </button>
        </div>
      )}

      {!data && !readError && <p role="status">Đang đọc chứng từ...</p>}

      {mode === 'money' && data && (
        <>
          <span className={`rv-doc-badge ${current ? 'is-ready' : 'is-waiting'}`}>
            {current ? 'ĐÃ CÓ ĐỐI CHIẾU' : 'CHƯA BỔ SUNG ĐỐI CHIẾU'}
          </span>

          <dl className="rv-doc-grid">
            <div>
              <dt>QUỸ / TÀI KHOẢN</dt>
              <dd>{current?.fund_name || 'Chưa xác định'}</dd>
            </div>
            <div>
              <dt>NHÂN VIÊN THỰC THU / CHI TIỀN MẶT</dt>
              <dd>
                {cash
                  ? current?.cash_employee_name || 'Chưa xác định'
                  : 'Không áp dụng cho chuyển khoản/thẻ'}
              </dd>
            </div>
            <div>
              <dt>NGƯỜI ĐỐI CHIẾU</dt>
              <dd>{current?.reconciler_name || 'Chưa ghi nhận'}</dd>
            </div>
            <div>
              <dt>MÃ GIAO DỊCH</dt>
              <dd>{current?.transaction_reference || '—'}</dd>
            </div>
          </dl>

          {current?.account_number && (
            <p>
              {current.bank_name} · {current.account_number}
              {' · '}
              {current.account_holder}
            </p>
          )}

          <details className="rv-doc-history">
            <summary>Quỹ và tài khoản tiền</summary>

            <div className="rv-doc-tools">
              <button type="button" disabled={locked || frozen} onClick={() => open('fund')}>
                THÊM QUỸ / TÀI KHOẢN
              </button>
            </div>

            {funds.map((fund) => (
              <article className="rv-doc-record" key={fund.id}>
                <strong>
                  {fund.code} · {fund.name}
                </strong>
                <p>
                  {fund.kind === 'TIEN_MAT'
                    ? 'Tiền mặt'
                    : `${fund.bank_name} · ${fund.account_number}`}
                </p>

                <button
                  type="button"
                  disabled={locked || frozen}
                  onClick={() =>
                    execute(`${API}/funds/${fund.id}/status`, {
                      revision: Number(fund.revision),
                      active: !yes(fund.active),
                      confirmed: true,
                    })
                  }
                >
                  {yes(fund.active) ? 'NGỪNG SỬ DỤNG' : 'MỞ LẠI SỬ DỤNG'}
                </button>

                {!yes(fund.active) && !yes(fund.has_history) && (
                  <button
                    type="button"
                    disabled={locked || frozen}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Xóa quỹ/tài khoản "${fund.name}" khỏi danh sách?`
                      );

                      if (!confirmed) return;

                      execute(`${API}/funds/${fund.id}/delete`, {
                        revision: Number(fund.revision),
                        confirmed: true,
                      });
                    }}
                  >
                    XÓA QUỸ
                  </button>
                )}
              </article>
            ))}
          </details>

          {!!data.history?.length && (
            <details className="rv-doc-history">
              <summary>Lịch sử đối chiếu phiếu tiền</summary>

              {data.history.map((item) => (
                <article className="rv-doc-record" key={item.revision}>
                  <strong>
                    Lần {item.revision} · {item.fund_name}
                  </strong>
                  <p>{item.note}</p>
                  <small>
                    {item.reconciler_name}
                    {' · '}
                    {formatDateTimeVN(item.recorded_at)}
                  </small>
                </article>
              ))}
            </details>
          )}
        </>
      )}

      {mode === 'purchase' && data && (
        <>
          {(data.documents || [])
            .filter((document) =>
              (document.items || []).some((item) => String(item.purchase_id) === String(id))
            )
            .map((document) => (
              <details className="rv-doc-record" key={document.id}>
                <summary>
                  {kindLabel(document.kind)}
                  {' · '}
                  <b>{document.external_number}</b>
                </summary>

                <p>
                  Tổng chứng từ: <b>{money(document.total_amount)}</b>
                  {' · '}
                  Đã phân bổ: <b>{money(document.allocated_amount)}</b>
                </p>

                <span
                  className={`rv-doc-badge ${
                    Number(document.allocated_amount) === Number(document.total_amount)
                      ? 'is-ready'
                      : 'is-waiting'
                  }`}
                >
                  {Number(document.allocated_amount) === Number(document.total_amount)
                    ? 'ĐÃ PHÂN BỔ ĐỦ GIÁ TRỊ'
                    : 'CÒN GIÁ TRỊ CHƯA PHÂN BỔ'}
                </span>

                {(document.items || []).map((item) => (
                  <p key={item.receipt_line_id}>
                    <PurchaseLink id={item.purchase_id} code={item.ma_don_nhap} />
                    {' · '}
                    {item.receipt_code || `Nguồn #${item.receipt_id}`}
                    {' · '}
                    {item.ten_phien_ban}
                    {' · '}
                    SL {item.quantity}
                    {' · '}
                    {money(item.amount)}
                  </p>
                ))}
              </details>
            ))}

          <h3>Thiết bị đã liên kết đến đơn bán</h3>

          <div className="rv-doc-scroll">
            <table>
              <thead>
                <tr>
                  <th>Đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái đơn</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data.sales || []).map((item) => (
                  <tr key={item.device_id}>
                    <td>
                      <Link to={`/admin/don-hang/danh-sach-don-hang/${item.order_id}`}>
                        {item.ma_don_hang}
                      </Link>
                    </td>
                    <td>{item.customer_name || '—'}</td>
                    <td>
                      <b>{item.ten_phien_ban}</b>
                      <p>{item.so_serial || item.ma_theo_doi}</p>
                    </td>
                    <td>{item.trang_thai_don_hang}</td>
                    <td>
                      <button
                        type="button"
                        disabled={locked || frozen}
                        onClick={() => openTrace(item.device_id)}
                      >
                        TRUY VẾT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data.sales?.length && (
            <p className="rv-doc-muted">
              Chưa có thiết bị bán ra được liên kết với nguồn nhập này.
            </p>
          )}
        </>
      )}

      {mode === 'order' && data && (
        <>
          <p>
            Phiếu xuất: <strong>{data.issue?.code || 'Chưa có mã phiếu xuất riêng'}</strong>
          </p>

          {(data.devices || []).map((device) => (
            <article className="rv-doc-record" key={device.id}>
              <strong>{device.ten_phien_ban}</strong>
              <p>{device.so_serial || device.ma_theo_doi}</p>

              {device.sources?.length ? (
                device.sources.map((source) => (
                  <p key={source.receipt_line_id}>
                    <PurchaseLink id={source.purchase_id} code={source.ma_don_nhap} />
                    {' · '}
                    {source.code || `Nguồn #${source.id}`}
                    {' · '}
                    {source.ten_nha_cung_cap}
                    {source.supplier_lot ? ` · Lô ${source.supplier_lot}` : ''}
                  </p>
                ))
              ) : (
                <span className="rv-doc-badge is-waiting">CHƯA XÁC NHẬN NGUỒN NHẬN</span>
              )}

              <div className="rv-doc-tools">
                <button
                  type="button"
                  disabled={locked || frozen}
                  onClick={() => openTrace(device.id)}
                >
                  TRUY VẾT
                </button>

                {!device.so_serial_id && (
                  <button
                    type="button"
                    disabled={locked || frozen}
                    onClick={() => openSource(device)}
                  >
                    {Number(device.source_revision) > 0 ? 'ĐIỀU CHỈNH NGUỒN' : 'XÁC NHẬN NGUỒN'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </>
      )}

      {attempt.current && !dialog && (
        <div className="rv-doc-warning">
          <p>Chưa xác định được kết quả yêu cầu vừa gửi.</p>
          <button type="button" disabled={busy} onClick={retry}>
            THỬ LẠI YÊU CẦU CŨ
          </button>
        </div>
      )}

      {operationError && !dialog && (
        <p className="rv-doc-error" role="alert">
          {operationError}
        </p>
      )}

      {dialog && (
        <OrderModal
          title={
            dialog.kind === 'trace'
              ? 'TRUY VẾT THIẾT BỊ'
              : dialog.kind === 'money'
                ? 'ĐỐI CHIẾU PHIẾU TIỀN'
                : dialog.kind === 'fund'
                  ? 'THÊM QUỸ / TÀI KHOẢN'
                  : dialog.kind === 'source'
                    ? 'XÁC NHẬN NGUỒN THỰC TẾ'
                    : 'LIÊN KẾT CHỨNG TỪ NHÀ CUNG CẤP'
          }
          className="rv-doc-modal"
          showClose
          busy={busy}
          error={operationError}
          cancelLabel="ĐÓNG"
          confirmLabel={attempt.current ? 'THỬ LẠI YÊU CẦU CŨ' : 'LƯU ĐỐI CHIẾU'}
          disabled={dialog.kind === 'trace' || (!attempt.current && !form.confirmed)}
          close={() => {
            if (!busy && !attempt.current) {
              setDialog(null);
              setOperationError('');
            }
          }}
          submit={submit}
        >
          {dialog.kind === 'trace' ? (
            dialog.data ? (
              <TraceView data={dialog.data} />
            ) : (
              <p role="status">Đang đọc lịch sử thiết bị...</p>
            )
          ) : (
            <fieldset className="rv-doc-fields" disabled={frozen || locked}>
              {dialog.kind === 'fund' && (
                <>
                  {input('code', 'MÃ QUỸ / TÀI KHOẢN', 'text', { maxLength: 50 })}
                  {input('name', 'TÊN HIỂN THỊ', 'text', { maxLength: 150 })}

                  <Field label="LOẠI">
                    <select
                      value={form.kind}
                      onChange={(event) => update('kind', event.target.value)}
                    >
                      <option value="TIEN_MAT">Quỹ tiền mặt</option>
                      <option value="NGAN_HANG">Tài khoản ngân hàng</option>
                    </select>
                  </Field>

                  {form.kind === 'NGAN_HANG' && (
                    <>
                      {input('bankName', 'NGÂN HÀNG', 'text', { maxLength: 150 })}
                      {input('accountNumber', 'SỐ TÀI KHOẢN', 'text', { maxLength: 50 })}
                      {input('accountHolder', 'CHỦ TÀI KHOẢN', 'text', { maxLength: 150 })}
                    </>
                  )}
                </>
              )}

              {dialog.kind === 'money' && (
                <>
                  <p>
                    Phiếu <b>{data.voucher.ma_phieu}</b>
                    {' · '}
                    {money(data.voucher.so_tien)}
                    {' · '}
                    Thực thu/chi: {formatDateTimeVN(data.voucher.ngay_ghi_nhan)}
                  </p>

                  <Field label={cash ? 'QUỸ TIỀN MẶT' : 'TÀI KHOẢN NHẬN / CHI TIỀN'}>
                    <select
                      value={form.fundId}
                      onChange={(event) => update('fundId', event.target.value)}
                    >
                      <option value="">Chọn quỹ / tài khoản</option>
                      {funds
                        .filter((fund) => fund.kind === (cash ? 'TIEN_MAT' : 'NGAN_HANG'))
                        .map((fund) => (
                          <option key={fund.id} value={fund.id} disabled={!yes(fund.active)}>
                            {fund.code} · {fund.name}
                            {!yes(fund.active) ? ' · Đã ngừng sử dụng' : ''}
                          </option>
                        ))}
                    </select>
                  </Field>

                  {cash ? (
                    <Field label="NHÂN VIÊN THỰC THU / CHI">
                      <select
                        value={form.cashEmployeeId}
                        onChange={(event) => update('cashEmployeeId', event.target.value)}
                      >
                        <option value="">Chọn nhân viên thực tế</option>
                        {(options.employees || []).map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.ho_ten}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    input('transactionReference', 'MÃ GIAO DỊCH NGÂN HÀNG / THẺ', 'text', {
                      maxLength: 255,
                    })
                  )}

                  {input('note', 'NỘI DUNG ĐỐI CHIẾU', 'text', { maxLength: 1000 })}
                </>
              )}

              {dialog.kind === 'document' && (
                <>
                  <Field label="CHỨNG TỪ">
                    <select
                      value={form.documentId}
                      onChange={(event) => selectDocument(event.target.value)}
                    >
                      <option value="">Ghi nhận chứng từ mới</option>
                      {(data.documents || []).map((document) => (
                        <option key={document.id} value={document.id}>
                          {kindLabel(document.kind)} · {document.external_number}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="LOẠI CHỨNG TỪ">
                    <select
                      value={form.kind}
                      disabled={Boolean(form.documentId)}
                      onChange={(event) => update('kind', event.target.value)}
                    >
                      <option value="HOA_DON">Hóa đơn Nhà Cung Cấp</option>
                      <option value="PHIEU_GIAO_HANG">Phiếu giao hàng Nhà Cung Cấp</option>
                    </select>
                  </Field>

                  {input('externalNumber', 'SỐ CHỨNG TỪ NGUYÊN GỐC', 'text', {
                    maxLength: 150,
                    readOnly: Boolean(form.documentId),
                  })}
                  {input('issuedDate', 'NGÀY TRÊN CHỨNG TỪ', 'date', {
                    readOnly: Boolean(form.documentId),
                  })}
                  {input('totalAmount', 'TỔNG GIÁ TRỊ GỒM THUẾ', 'number', {
                    min: 0,
                    step: '0.01',
                    readOnly: Boolean(form.documentId),
                  })}

                  <div className="rv-doc-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Chọn</th>
                          <th>Dòng thực nhận</th>
                          <th>SL liên kết</th>
                          <th>Giá trị gồm thuế</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.lines || []).map((line) => {
                          const value = form.lines[line.id] || {};

                          const change = (patch) =>
                            setForm((previous) => ({
                              ...previous,
                              lines: {
                                ...previous.lines,
                                [line.id]: {
                                  ...previous.lines[line.id],
                                  ...patch,
                                },
                              },
                            }));

                          return (
                            <tr key={line.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={Boolean(value.selected)}
                                  onChange={(event) => change({ selected: event.target.checked })}
                                />
                              </td>
                              <td>
                                <b>{line.ten_phien_ban}</b>
                                <p>
                                  {line.receipt_code || `Nguồn #${line.receipt_id}`}
                                  {' · '}
                                  Đã nhận {line.quantity}
                                </p>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  max={line.quantity}
                                  disabled={!value.selected}
                                  value={value.quantity ?? ''}
                                  onChange={(event) => change({ quantity: event.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!value.selected}
                                  value={value.amount ?? ''}
                                  onChange={(event) => change({ amount: event.target.value })}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {dialog.kind === 'source' && (
                <>
                  <p>
                    <b>{dialog.device.ten_phien_ban}</b>
                    {' · '}
                    {dialog.device.ma_theo_doi}
                  </p>

                  <Field label="DÒNG NGUỒN NHẬN THỰC TẾ">
                    <select
                      value={form.receiptLineId}
                      onChange={(event) => update('receiptLineId', event.target.value)}
                    >
                      <option value="">
                        {dialog.candidates === null
                          ? 'Đang đọc nguồn nhận...'
                          : 'Chọn nguồn đã đối chiếu'}
                      </option>

                      {(dialog.candidates || []).map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.ma_don_nhap}
                          {' · '}
                          {line.receipt_code || `Nguồn #${line.receipt_id}`}
                          {' · '}
                          {line.ten_nha_cung_cap}
                          {' · '}
                          Lô {line.supplier_lot || 'chưa ghi'}
                          {' · '}
                          Nhận {line.quantity}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {input('note', 'THÔNG TIN ĐỐI CHIẾU NGUỒN', 'text', {
                    maxLength: 1000,
                    placeholder: 'Mã lô trên tem, phiếu giao hoặc thông tin nhận dạng đã kiểm tra',
                  })}
                </>
              )}

              <label className="rv-doc-confirm">
                <input
                  type="checkbox"
                  checked={Boolean(form.confirmed)}
                  onChange={(event) => update('confirmed', event.target.checked)}
                />
                <span>Tôi đã đối chiếu đúng thông tin và chứng từ thực tế.</span>
              </label>
            </fieldset>
          )}
        </OrderModal>
      )}
    </section>
  );
}
