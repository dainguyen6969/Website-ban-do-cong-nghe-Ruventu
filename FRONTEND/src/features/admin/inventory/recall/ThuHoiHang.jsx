import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import OrderModal from '../../orders/components/OrderModal';
import {
  errorMessage,
  formatDateTimeVN,
  withIdempotency,
} from '../../../../shared/services/mutationUtils';
import {
  createRecall,
  flag,
  getPurchaseSources,
  getRecall,
  getRecallSources,
  listRecalls,
  RECALL_ACTIONS,
  RECALL_STATUS,
  recordRecallEvent,
  splitCodes,
} from './recallApi';
import '../pages/SerialPages.css';
import './Recall.css';

const localTime = (value) => (value ? `${value}:00+07:00` : null);

const positiveId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Chưa chọn dữ liệu tham chiếu hợp lệ.');
  }
  return id;
};

const needsDocument = (action) =>
  ['GAN_THIET_BI', 'TRA_NCC', 'DOI_NCC', 'DOI_BAO_HANH', 'LOAI_TRU'].includes(action);

const resolving = (action) => ['TRA_NCC', 'DOI_NCC', 'DOI_BAO_HANH', 'LOAI_TRU'].includes(action);

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? 'recall-wide' : undefined}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Check({ children, checked, onChange }) {
  return (
    <label className="recall-check recall-wide">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function Location({ item }) {
  if (!item.serial_id && !flag(item.source_verified)) return 'Cần đối soát nguồn và thiết bị';

  const labels = {
    DANG_GUI_NCC: 'Đang gửi Nhà Cung Cấp',
    DA_TRA_NCC: 'Đã trả Nhà Cung Cấp',
    DA_DOI_NCC: 'Đã đổi với Nhà Cung Cấp',
    DA_THAY_THE_BAO_HANH: 'Thiết bị cũ đã được thay',
    DANG_BAO_HANH: 'Đang xử lý bảo hành',
  };

  if (labels[item.serial_status]) return labels[item.serial_status];
  if (item.chi_tiet_dong_goi_id) return 'Đang đóng gói';
  if (item.chi_tiet_tra_hang_id) return 'Có liên kết nhận lại hàng';
  if (item.ngay_hoan_thanh) return 'Khách đã nhận theo chứng từ';
  if (item.trang_thai_don_hang === 'DANG_GIAO_HANG') return 'Đang giao hàng';
  if (item.order_id) return 'Đã gắn đơn bán / chờ bàn giao';
  if (item.serial_status === 'LOI') return 'Kho hàng lỗi';
  if (item.serial_status === 'TRONG_KHO') return 'Hàng cửa hàng đang bị chặn';
  return 'Cần đối chiếu vị trí thực tế';
}

export default function ThuHoiHang() {
  const { recallId } = useParams();
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], totalItems: 0 });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceOptions, setSourceOptions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [sourceError, setSourceError] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const attempt = useRef(null);
  const writing = useRef(false);
  const sequence = useRef(0);

  useEffect(() => {
    if (recallId) return undefined;
    const controller = new AbortController();
    setLoading(true);

    listRecalls({ keyword, status, page }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setList(data);
          setError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [keyword, status, page, recallId, refresh]);

  const loadDetail = useCallback(
    async (signal) => {
      if (!recallId) return;
      const version = ++sequence.current;
      setLoading(true);

      try {
        const data = await getRecall(recallId, signal);
        if (!signal?.aborted && version === sequence.current) {
          setDetail(data);
          setError('');
        }
      } catch (cause) {
        if (!signal?.aborted && version === sequence.current) {
          setError(errorMessage(cause));
        }
      } finally {
        if (!signal?.aborted && version === sequence.current) setLoading(false);
      }
    },
    [recallId]
  );

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    loadDetail(controller.signal);
    return () => controller.abort();
  }, [loadDetail]);

  useEffect(() => {
    if (dialog?.kind !== 'create') return undefined;
    const controller = new AbortController();

    getRecallSources(sourceQuery, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setSourceOptions(rows);
          setSourceError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setSourceError(errorMessage(cause));
      });

    return () => controller.abort();
  }, [dialog?.kind, sourceQuery]);

  useEffect(() => {
    if (dialog?.kind !== 'create' || !form.purchaseId) {
      setReceipts([]);
      return undefined;
    }

    const controller = new AbortController();
    setSourceLoading(true);

    getPurchaseSources(form.purchaseId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setReceipts(rows);
          setSourceError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setSourceError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSourceLoading(false);
      });

    return () => controller.abort();
  }, [dialog?.kind, form.purchaseId]);

  const frozen = busy || Boolean(attempt.current);

  const change = (name, value) =>
    setForm((current) => ({
      ...current,
      [name]: value,
      confirmed: name === 'confirmed' ? value : false,
    }));

  const sourceLines = receipts.flatMap((receipt) =>
    receipt.items.map((item) => ({ ...item, receiptId: receipt.id }))
  );

  const selectedLine = sourceLines.find((line) => Number(line.id) === Number(form.receiptLineId));

  const openCreate = () => {
    if (frozen) return;
    setError('');
    setNotice('');
    setSourceQuery('');
    setSourceError('');
    setForm({
      purchaseId: '',
      mode: 'serials',
      serials: '',
      receiptLineId: '',
      quantity: '1',
      acceptVariantBlock: false,
      document: '',
      note: '',
      deadline: '',
      confirmed: false,
    });
    setDialog({ kind: 'create' });
  };

  const openAction = (action, item = null) => {
    if (frozen || !detail) return;
    setError('');
    setNotice('');
    setForm({
      action,
      document: '',
      note: '',
      nextContactAt: '',
      deviceId: '',
      nccUnitId: '',
      warrantyId: '',
      sourceVerified: false,
      qualityConfirmed: false,
      confirmed: false,
    });
    setDialog({
      kind: 'event',
      item,
      revision: detail.revision,
      recallId: detail.id,
    });
  };

  const perform = async (scope, body) => {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');

    try {
      const result = await withIdempotency(attempt, scope, body, (key, saved) =>
        scope === 'recall:create'
          ? createRecall(key, saved)
          : recordRecallEvent(positiveId(scope.split(':')[1]), key, saved)
      );

      setDialog(null);
      setNotice('Đã ghi nhận thao tác thu hồi.');

      if (scope === 'recall:create') {
        navigate(`/kho-hang/thu-hoi/${result.id}`);
      } else {
        await loadDetail();
      }

      setRefresh((current) => current + 1);
    } catch (cause) {
      setError(errorMessage(cause));

      if (Number(cause.status || cause.response?.status) === 409 && !attempt.current) {
        setDialog(null);
        await loadDetail();
        setError(errorMessage(cause));
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  const submit = () => {
    if (attempt.current) return perform(attempt.current.scope, attempt.current.body);
    if (!dialog || busy) return;

    try {
      if (!form.confirmed || !form.note.trim()) {
        throw new Error('Nhập nội dung và xác nhận đã đối chiếu.');
      }

      if (dialog.kind === 'create') {
        if (!form.document.trim()) throw new Error('Nhập mã thông báo thu hồi.');

        const serialCodes = form.mode === 'serials' ? splitCodes(form.serials) : [];

        if (form.mode === 'serials' && (!serialCodes.length || serialCodes.length > 500)) {
          throw new Error('Nhập từ 1 đến 500 serial.');
        }

        if (form.mode === 'receipt' && !selectedLine) {
          throw new Error('Chọn dòng nguồn nhận hàng.');
        }

        const nonSerial = form.mode === 'receipt' && !flag(selectedLine.serial_managed);

        if (nonSerial && !form.acceptVariantBlock) {
          throw new Error('Xác nhận phạm vi chặn phiên bản khi đối soát nguồn lô.');
        }

        if (
          nonSerial &&
          (!Number.isSafeInteger(Number(form.quantity)) ||
            Number(form.quantity) < 1 ||
            Number(form.quantity) > Math.min(500, Number(selectedLine.quantity)))
        ) {
          throw new Error('Số thiết bị phải nằm trong số lượng dòng nguồn.');
        }

        return perform('recall:create', {
          purchaseId: positiveId(form.purchaseId),
          serialCodes,
          receiptLineId: form.mode === 'receipt' ? positiveId(form.receiptLineId) : null,
          quantity: nonSerial ? Number(form.quantity) : null,
          acceptVariantBlock: nonSerial && Boolean(form.acceptVariantBlock),
          document: form.document.trim(),
          reason: form.note.trim(),
          deadline: localTime(form.deadline),
          confirmed: true,
        });
      }

      if (needsDocument(form.action) && !form.document.trim()) {
        throw new Error('Nhập mã chứng từ hoặc căn cứ đối soát.');
      }

      return perform(`event:${dialog.recallId}`, {
        revision: Number(dialog.revision),
        action: form.action,
        itemId: dialog.item?.id ?? null,
        deviceId: form.action === 'GAN_THIET_BI' ? positiveId(form.deviceId) : null,
        nccUnitId: ['TRA_NCC', 'DOI_NCC'].includes(form.action) ? positiveId(form.nccUnitId) : null,
        warrantyId: form.action === 'DOI_BAO_HANH' ? positiveId(form.warrantyId) : null,
        document: form.document.trim() || null,
        note: form.note.trim(),
        nextContactAt: localTime(form.nextContactAt),
        sourceVerified: Boolean(form.sourceVerified),
        qualityConfirmed: Boolean(form.qualityConfirmed),
        confirmed: true,
      });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const actions = dialog?.item
    ? [
        'LIEN_HE',
        'CHO_NHAN_LAI',
        ...(!dialog.item.serial_id ? ['GAN_THIET_BI'] : []),
        'TRA_NCC',
        'DOI_NCC',
        'DOI_BAO_HANH',
        'LOAI_TRU',
      ]
    : [form.action];

  return (
    <main className="serial-page recall-page">
      <div className="serial-page__inner">
        <div className="serial-heading-row recall-heading">
          <h1>{recallId ? 'CHI TIẾT THU HỒI' : 'THU HỒI HÀNG'}</h1>
          {recallId ? (
            <button
              type="button"
              className="recall-button"
              disabled={frozen}
              onClick={() => navigate('/kho-hang/thu-hoi')}
            >
              Danh sách
            </button>
          ) : (
            <button
              type="button"
              className="recall-button is-dark"
              disabled={frozen}
              onClick={openCreate}
            >
              Tạo đợt thu hồi
            </button>
          )}
        </div>

        {error && !dialog && (
          <p className="recall-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="recall-success" role="status">
            {notice}
          </p>
        )}

        {!recallId && (
          <>
            <section className="serial-toolbar">
              <label className="serial-search">
                <input
                  type="search"
                  value={keyword}
                  placeholder="Mã thu hồi / đơn nhập / Nhà Cung Cấp..."
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <FilterDropdown
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DANG_XU_LY">Đang xử lý</option>
                <option value="HOAN_TAT">Hoàn tất</option>
              </FilterDropdown>
            </section>

            <div className="serial-table-shell">
              <div className="recall-table-scroll">
                <table className="recall-table">
                  <thead>
                    <tr>
                      <th>Đợt thu hồi</th>
                      <th>Nguồn nhập</th>
                      <th>Tiến độ</th>
                      <th>Hạn xử lý</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6}>Đang tải...</td>
                      </tr>
                    ) : !list.items.length ? (
                      <tr>
                        <td colSpan={6}>Chưa có đợt thu hồi phù hợp.</td>
                      </tr>
                    ) : (
                      list.items.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <strong>{record.code}</strong>
                            <small>{record.reason}</small>
                          </td>
                          <td>
                            <Link to={`/kho-hang/nhap-hang/${record.purchase_id}`}>
                              {record.ma_don_nhap}
                            </Link>
                            <small>{record.ten_nha_cung_cap}</small>
                          </td>
                          <td>
                            {record.resolved_items}/{record.total_items}
                          </td>
                          <td>
                            {record.deadline ? formatDateTimeVN(record.deadline) : 'Không đặt hạn'}
                          </td>
                          <td>
                            <span
                              className={`recall-badge ${record.status === 'HOAN_TAT' ? 'is-done' : 'is-active'}`}
                            >
                              {RECALL_STATUS[record.status]}
                            </span>
                          </td>
                          <td>
                            <Link to={`/kho-hang/thu-hoi/${record.id}`}>Xem chi tiết</Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                totalItems={Number(list.totalItems)}
                pageSize={20}
                currentPage={page}
                onPageChange={setPage}
                idPrefix="recalls"
              />
            </div>
          </>
        )}

        {recallId && !detail && loading && <p role="status">Đang tải chi tiết...</p>}

        {recallId && detail && (
          <>
            <section className="serial-info-card recall-case">
              <h2>THÔNG TIN ĐỢT THU HỒI</h2>
              <div className="recall-body">
                <div className="recall-toolbar">
                  <div>
                    <strong>{detail.code}</strong>
                    <p>{detail.reason}</p>
                  </div>
                  <div className="recall-actions">
                    <span
                      className={`recall-badge ${detail.status === 'HOAN_TAT' ? 'is-done' : 'is-active'}`}
                    >
                      {RECALL_STATUS[detail.status]}
                    </span>
                    {detail.status === 'DANG_XU_LY' ? (
                      <button
                        type="button"
                        className="recall-button is-dark"
                        disabled={frozen || !flag(detail.can_close)}
                        onClick={() => openAction('KET_THUC')}
                      >
                        Kết thúc đợt thu hồi
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="recall-button"
                        disabled={frozen}
                        onClick={() => openAction('MO_LAI')}
                      >
                        Mở lại đợt thu hồi
                      </button>
                    )}
                  </div>
                </div>

                <dl className="recall-facts">
                  <div>
                    <dt>Nguồn nhập</dt>
                    <dd>
                      <Link to={`/kho-hang/nhap-hang/${detail.purchase_id}`}>
                        {detail.ma_don_nhap}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Nhà Cung Cấp</dt>
                    <dd>{detail.ten_nha_cung_cap}</dd>
                  </div>
                  <div>
                    <dt>Thông báo thu hồi</dt>
                    <dd>{detail.notice_document}</dd>
                  </div>
                  <div>
                    <dt>Người phụ trách</dt>
                    <dd>{detail.employee_name}</dd>
                  </div>
                  <div>
                    <dt>Hạn xử lý</dt>
                    <dd>{detail.deadline ? formatDateTimeVN(detail.deadline) : 'Không đặt hạn'}</dd>
                  </div>
                  <div>
                    <dt>Đã giải quyết</dt>
                    <dd>
                      {detail.items.filter((item) => item.status === 'DA_GIAI_QUYET').length}/
                      {detail.items.length}
                    </dd>
                  </div>
                </dl>

                {detail.status === 'DANG_XU_LY' && !flag(detail.can_close) && (
                  <p className="recall-muted">Chưa thể kết thúc: {detail.close_blocker}</p>
                )}
              </div>
            </section>

            <section className="serial-info-card recall-case">
              <h2>THIẾT BỊ TRONG PHẠM VI</h2>
              <div className="recall-table-scroll">
                <table className="recall-table">
                  <thead>
                    <tr>
                      <th>Thiết bị / nguồn</th>
                      <th>Vị trí theo sự kiện</th>
                      <th>Đơn bán / liên hệ</th>
                      <th>Kết quả</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.ten_phien_ban}</strong>
                          <small>
                            {item.serial_id ? (
                              <Link to={`/kho-hang/danh-sach-serial/${item.serial_id}`}>
                                {item.so_serial}
                              </Link>
                            ) : (
                              `Theo dõi nội bộ #${item.id} ${item.ma_theo_doi || ''}`
                            )}
                          </small>
                          <small>
                            {item.supplier_lot ? `Lô: ${item.supplier_lot}` : 'Chưa có mã lô'}
                          </small>
                        </td>
                        <td>
                          <Location item={item} />
                        </td>
                        <td>
                          {item.order_id ? (
                            <>
                              <Link to={`/admin/don-hang/danh-sach-don-hang/${item.order_id}`}>
                                {item.ma_don_hang}
                              </Link>
                              <small>
                                {item.ten_nguoi_nhan} · {item.sdt_nguoi_nhan}
                              </small>
                            </>
                          ) : (
                            'Chưa có đơn hiện tại; xem lịch sử serial nếu có'
                          )}
                          {item.next_contact_at && (
                            <small>Hẹn: {formatDateTimeVN(item.next_contact_at)}</small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`recall-badge ${item.status === 'DA_GIAI_QUYET' ? 'is-done' : 'is-pending'}`}
                          >
                            {RECALL_STATUS[item.status]}
                          </span>
                          {item.result && <small>{RECALL_ACTIONS[item.result]}</small>}
                          {item.contact_note && <small>{item.contact_note}</small>}
                        </td>
                        <td>
                          {detail.status === 'DANG_XU_LY' && item.status !== 'DA_GIAI_QUYET' && (
                            <button
                              type="button"
                              className="recall-button"
                              disabled={frozen}
                              onClick={() =>
                                openAction(
                                  !item.serial_id && !flag(item.source_verified)
                                    ? 'GAN_THIET_BI'
                                    : 'LIEN_HE',
                                  item
                                )
                              }
                            >
                              Xử lý
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="serial-info-card recall-case">
              <h2>CHỨNG TỪ VÀ LỊCH SỬ</h2>
              <div className="recall-body">
                <button
                  type="button"
                  className="recall-button"
                  disabled={frozen}
                  onClick={() => openAction('GHI_CHU')}
                >
                  Ghi nhận đối soát
                </button>
                {detail.events.map((event) => (
                  <article className="recall-history-line" key={event.id}>
                    <strong>
                      {RECALL_ACTIONS[event.action] || event.action}
                      {event.item_id ? ` · Thiết bị #${event.item_id}` : ''}
                    </strong>
                    <small>
                      {formatDateTimeVN(event.occurred_at)} · {event.actor_name}
                      {event.document ? ` · ${event.document}` : ''}
                    </small>
                    <p>{event.note}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {dialog && (
          <OrderModal
            title={dialog.kind === 'create' ? 'TẠO ĐỢT THU HỒI' : RECALL_ACTIONS[form.action]}
            subtitle={
              dialog.item ? dialog.item.so_serial || `Thiết bị #${dialog.item.id}` : detail?.code
            }
            className="recall-modal"
            showClose
            busy={busy}
            error={error}
            disabled={!attempt.current && !form.confirmed}
            confirmLabel={attempt.current ? 'Thử lại yêu cầu cũ' : 'Xác nhận'}
            close={() => {
              if (!frozen) {
                setDialog(null);
                setError('');
              }
            }}
            submit={submit}
          >
            {attempt.current && (
              <p className="recall-notice">
                Chưa xác định được kết quả. Thử lại cùng yêu cầu đang giữ.
              </p>
            )}

            <fieldset className="recall-fields" disabled={frozen}>
              {dialog.kind === 'create' ? (
                <>
                  <Field label="Tìm đơn nhập hoặc Nhà Cung Cấp" wide>
                    <input
                      value={sourceQuery}
                      onChange={(event) => setSourceQuery(event.target.value)}
                    />
                  </Field>
                  <Field label="Đơn nhập nguồn" wide>
                    <select
                      required
                      value={form.purchaseId}
                      onChange={(event) => {
                        change('purchaseId', event.target.value);
                        change('receiptLineId', '');
                      }}
                    >
                      <option value="">Chọn đơn nhập</option>
                      {sourceOptions.map((purchase) => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.ma_don_nhap} · {purchase.ten_nha_cung_cap}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Phạm vi" wide>
                    <select
                      value={form.mode}
                      onChange={(event) => change('mode', event.target.value)}
                    >
                      <option value="serials">Theo danh sách serial</option>
                      <option value="receipt">Theo dòng/lô của nguồn nhận</option>
                    </select>
                  </Field>

                  {form.mode === 'serials' ? (
                    <Field label="Serial bị thu hồi, mỗi dòng một mã" wide>
                      <textarea
                        rows={5}
                        required
                        value={form.serials}
                        onChange={(event) => change('serials', event.target.value)}
                      />
                    </Field>
                  ) : (
                    <>
                      <Field label="Dòng nguồn nhận" wide>
                        <select
                          required
                          disabled={sourceLoading}
                          value={form.receiptLineId}
                          onChange={(event) => change('receiptLineId', event.target.value)}
                        >
                          <option value="">Chọn nguồn và phiên bản</option>
                          {sourceLines.map((line) => (
                            <option key={line.id} value={line.id}>
                              Nguồn #{line.receiptId} · {line.ten_phien_ban} ·{' '}
                              {line.supplier_lot || 'chưa có lô'} · {line.quantity} sản phẩm
                            </option>
                          ))}
                        </select>
                      </Field>
                      {selectedLine && !flag(selectedLine.serial_managed) && (
                        <>
                          <Field label="Số thiết bị trong phạm vi">
                            <input
                              type="number"
                              min="1"
                              max={Math.min(500, Number(selectedLine.quantity))}
                              value={form.quantity}
                              onChange={(event) => change('quantity', event.target.value)}
                            />
                          </Field>
                          <Check
                            checked={form.acceptVariantBlock}
                            onChange={(value) => change('acceptVariantBlock', value)}
                          >
                            Chưa phân bổ chính xác nguồn lô: chặn khả năng bán và bàn giao của toàn
                            bộ phiên bản trong lúc đối soát.
                          </Check>
                        </>
                      )}
                    </>
                  )}

                  {sourceError && <p className="recall-error recall-wide">{sourceError}</p>}

                  <Field label="Mã thông báo thu hồi của Nhà Cung Cấp" wide>
                    <input
                      required
                      maxLength={100}
                      value={form.document}
                      onChange={(event) => change('document', event.target.value)}
                    />
                  </Field>
                  <Field label="Hạn xử lý">
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(event) => change('deadline', event.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  {dialog.item && (
                    <Field label="Thao tác" wide>
                      <select
                        value={form.action}
                        onChange={(event) => change('action', event.target.value)}
                      >
                        {actions.map((action) => (
                          <option key={action} value={action}>
                            {RECALL_ACTIONS[action]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {form.action === 'GAN_THIET_BI' && (
                    <Field label="Thiết bị bán đã đối soát đúng nguồn" wide>
                      <select
                        required
                        value={form.deviceId}
                        onChange={(event) => change('deviceId', event.target.value)}
                      >
                        <option value="">Chọn mã theo dõi và đơn bán</option>
                        {(detail.device_options || [])
                          .filter(
                            (device) =>
                              Number(device.phien_ban_id) === Number(dialog.item.variant_id)
                          )
                          .map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.ma_theo_doi} · {device.ma_don_hang}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}

                  {['TRA_NCC', 'DOI_NCC'].includes(form.action) && (
                    <Field label="Dòng trong hồ sơ Nhà Cung Cấp đã kết thúc" wide>
                      <select
                        required
                        value={form.nccUnitId}
                        onChange={(event) => change('nccUnitId', event.target.value)}
                      >
                        <option value="">Chọn lượt xử lý</option>
                        {(detail.ncc_options || [])
                          .filter(
                            (unit) =>
                              unit.status ===
                              (form.action === 'TRA_NCC' ? 'DA_TRA_NCC' : 'DA_NHAN_DAT')
                          )
                          .map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.code} · #{unit.id} ·{' '}
                              {unit.so_serial || unit.initial_so_serial || unit.ten_phien_ban}
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}

                  {form.action === 'DOI_BAO_HANH' && (
                    <Field label="Phiếu đổi đã bàn giao thiết bị thay thế" wide>
                      <select
                        required
                        value={form.warrantyId}
                        onChange={(event) => change('warrantyId', event.target.value)}
                      >
                        <option value="">Chọn phiếu liên quan</option>
                        {(detail.warranty_options || []).map((ticket) => (
                          <option key={ticket.id} value={ticket.id}>
                            {ticket.ma_phieu}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {['LIEN_HE', 'CHO_NHAN_LAI'].includes(form.action) && (
                    <Field label="Hẹn liên hệ hoặc nhận lại">
                      <input
                        type="datetime-local"
                        value={form.nextContactAt}
                        onChange={(event) => change('nextContactAt', event.target.value)}
                      />
                    </Field>
                  )}

                  {needsDocument(form.action) && (
                    <Field label="Mã chứng từ hoặc căn cứ đối soát" wide>
                      <input
                        required
                        maxLength={100}
                        value={form.document}
                        onChange={(event) => change('document', event.target.value)}
                      />
                    </Field>
                  )}

                  {dialog.item &&
                    !dialog.item.serial_id &&
                    (resolving(form.action) || form.action === 'GAN_THIET_BI') && (
                      <Check
                        checked={form.sourceVerified}
                        onChange={(value) => change('sourceVerified', value)}
                      >
                        Đã đối chiếu đúng từng thiết bị và nguồn nhận thực tế.
                      </Check>
                    )}

                  {form.action === 'LOAI_TRU' && (
                    <Check
                      checked={form.qualityConfirmed}
                      onChange={(value) => change('qualityConfirmed', value)}
                    >
                      Có căn cứ loại trừ hoặc cho phép sử dụng; thao tác không tự sửa trạng thái
                      hàng lỗi.
                    </Check>
                  )}
                </>
              )}

              <Field
                label={dialog.kind === 'create' ? 'Lý do thu hồi' : 'Nội dung và căn cứ xác nhận'}
                wide
              >
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={form.note}
                  onChange={(event) => change('note', event.target.value)}
                />
              </Field>

              <Check checked={form.confirmed} onChange={(value) => change('confirmed', value)}>
                Xác nhận nội dung, phạm vi và chứng từ phù hợp sự việc thực tế.
              </Check>
            </fieldset>
          </OrderModal>
        )}
      </div>
    </main>
  );
}
