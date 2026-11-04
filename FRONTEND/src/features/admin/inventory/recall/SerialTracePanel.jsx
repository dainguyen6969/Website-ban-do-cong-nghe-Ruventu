import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, formatDateTimeVN } from '../../../../shared/services/mutationUtils';
import { flag, getSerialTrace, RECALL_ACTIONS, RECALL_STATUS } from './recallApi';
import './Recall.css';

function position(row) {
  const states = {
    DANG_GUI_NCC: 'Đang gửi Nhà Cung Cấp',
    DA_TRA_NCC: 'Đã trả Nhà Cung Cấp',
    DA_DOI_NCC: 'Thiết bị cũ đã đổi với Nhà Cung Cấp',
    DA_THAY_THE_BAO_HANH: 'Thiết bị cũ đã được thay; đối chiếu phiếu đổi',
    DANG_BAO_HANH: 'Đang xử lý bảo hành; đối chiếu vị trí trong phiếu',
    LOI: 'Kho hàng lỗi',
  };

  if (states[row.trang_thai]) return states[row.trang_thai];
  if (row.packing_order_id) return 'Đang phân bổ đóng gói';
  if (row.don_hang_id && row.ngay_hoan_thanh) {
    return 'Khách đã nhận theo chứng từ';
  }
  if (row.don_hang_id && row.order_status === 'DANG_GIAO_HANG') {
    return 'Đang giao hàng';
  }
  if (row.don_hang_id) return 'Đã gắn đơn bán; đối chiếu bàn giao';
  if (row.trang_thai === 'TRONG_KHO') return 'Trong kho cửa hàng';

  return 'Cần đối chiếu theo lịch sử thiết bị';
}

const TRACE_TABS = [
  ['receipts', 'Nguồn nhận'],
  ['devices', 'Đơn bán và nhận lại'],
  ['warranty', 'Đổi thiết bị và bảo hành'],
  ['supplierEvents', 'Lịch sử Nhà Cung Cấp'],
  ['recalls', 'Các đợt thu hồi'],
];

function TraceSection({ active, value, label, count, children }) {
  return (
    <section className="trace-content" hidden={active !== value}>
      <h3>
        {label} <span className="ncc-count">{count}</span>
      </h3>
      {count ? children : <p className="recall-muted">Chưa có bản ghi trong nhóm này.</p>}
    </section>
  );
}

export default function SerialTracePanel({ serialId, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState('receipts');

  useEffect(() => {
    const controller = new AbortController();

    getSerialTrace(serialId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError('');
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause));
        }
      });

    return () => controller.abort();
  }, [serialId, refreshKey, retry]);

  return (
    <section className="serial-info-card recall-trace">
      <h2>NGUỒN NHẬP VÀ TRUY VẾT</h2>

      <div className="recall-body">
        {error && (
          <p className="recall-error" role="alert">
            {error}{' '}
            <button
              type="button"
              className="recall-link-button"
              onClick={() => setRetry((current) => current + 1)}
            >
              Thử lại
            </button>
          </p>
        )}

        {!data && !error && <p role="status">Đang tải truy vết...</p>}

        {data && (
          <>
            <dl className="recall-facts">
              <div>
                <dt>Nguồn nhập</dt>
                <dd>
                  {data.current.don_nhap_hang_id ? (
                    <Link to={`/kho-hang/nhap-hang/${data.current.don_nhap_hang_id}`}>
                      {data.current.ma_don_nhap}
                    </Link>
                  ) : (
                    'Chưa có nguồn nhập'
                  )}
                </dd>
              </div>

              <div>
                <dt>Nhà Cung Cấp</dt>
                <dd>{data.current.ten_nha_cung_cap || 'Chưa xác định'}</dd>
              </div>

              <div>
                <dt>Vị trí theo sự kiện</dt>
                <dd>{position(data.current)}</dd>
              </div>

              <div>
                <dt>Thu hồi</dt>
                <dd>
                  {flag(data.current.bi_thu_hoi) ? 'Đang chặn bán và bàn giao' : 'Không bị chặn'}
                </dd>
              </div>
            </dl>

            {flag(data.sourceNeedsVerification) && (
              <p className="recall-notice">
                Chưa đủ thông tin lần nhận hoặc chứng từ giao của Nhà Cung Cấp.
              </p>
            )}

            <nav className="ops-tabs" aria-label="Nhóm thông tin truy vết">
              {TRACE_TABS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tab === value}
                  className={tab === value ? 'is-active' : ''}
                  onClick={() => setTab(value)}
                >
                  {label} <span>{data[value].length}</span>
                </button>
              ))}
            </nav>

            <TraceSection
              active={tab}
              value="receipts"
              label="Nguồn nhận"
              count={data.receipts.length}
            >
              {data.receipts.map((receipt) => (
                <article className="recall-history-line" key={receipt.id}>
                  <strong>
                    Nguồn #{receipt.id} ·{' '}
                    {receipt.supplier_document || 'Chưa có chứng từ Nhà Cung Cấp'}
                  </strong>
                  <p>Lô: {receipt.supplier_lot || 'Chưa ghi mã lô'}</p>
                  <small>
                    {formatDateTimeVN(receipt.recorded_at)}
                    {' · '}
                    {receipt.actor_name}
                  </small>
                </article>
              ))}
            </TraceSection>

            <TraceSection
              active={tab}
              value="devices"
              label="Đơn bán và nhận lại"
              count={data.devices.length}
            >
              {data.devices.map((device) => (
                <article className="recall-history-line" key={device.id}>
                  <strong>{device.ma_theo_doi}</strong>
                  {' · '}
                  <Link to={`/admin/don-hang/danh-sach-don-hang/${device.order_id}`}>
                    {device.ma_don_hang}
                  </Link>
                  <p>
                    {device.ten_nguoi_nhan || 'Chưa có người nhận'}
                    {' · '}
                    {device.sdt_nguoi_nhan || 'Chưa có số điện thoại'}
                  </p>
                  {device.return_id && <small>Phiếu nhận lại: {device.ma_tra_hang}</small>}
                  <small>
                    {device.ngay_hoan_thanh
                      ? `Khách nhận theo chứng từ: ${formatDateTimeVN(device.ngay_hoan_thanh)}`
                      : 'Chưa có mốc khách nhận'}
                  </small>
                </article>
              ))}
            </TraceSection>

            <TraceSection
              active={tab}
              value="warranty"
              label="Đổi thiết bị và bảo hành"
              count={data.warranty.length}
            >
              {data.warranty.map((ticket) => (
                <article className="recall-history-line" key={ticket.id}>
                  <Link to={`/admin/bao-hanh/chi-tiet/${ticket.id}`}>{ticket.ma_phieu}</Link>
                  <p>
                    {ticket.old_serial || ticket.old_device || 'Thiết bị gốc'}
                    {ticket.new_device ? ` → ${ticket.new_serial || ticket.new_device}` : ''}
                  </p>
                  <small>
                    {ticket.trang_thai_xu_ly === 'HOAN_TAT'
                      ? 'Phiếu đã hoàn tất'
                      : 'Phiếu đang xử lý'}
                  </small>
                </article>
              ))}
            </TraceSection>

            <TraceSection
              active={tab}
              value="supplierEvents"
              label="Lịch sử Nhà Cung Cấp"
              count={data.supplierEvents.length}
            >
              {data.supplierEvents.map((event) => (
                <article className="recall-history-line" key={event.id}>
                  <Link to={`/kho-hang/nhap-hang/${event.source_po_id}`}>{event.code}</Link>
                  <small>
                    {formatDateTimeVN(event.occurred_at)}
                    {' · '}
                    {event.document}
                  </small>
                  <p>{event.note}</p>
                  {event.old_serial &&
                    event.new_serial &&
                    event.old_serial !== event.new_serial && (
                      <small>
                        {event.old_serial} → {event.new_serial}
                      </small>
                    )}
                </article>
              ))}
            </TraceSection>

            <TraceSection
              active={tab}
              value="recalls"
              label="Các đợt thu hồi"
              count={data.recalls.length}
            >
              {data.recalls.map((recall) => (
                <article className="recall-history-line" key={recall.id}>
                  <Link to={`/kho-hang/thu-hoi/${recall.recall_id}`}>{recall.code}</Link>
                  <p>{recall.reason}</p>
                  <small>
                    {RECALL_STATUS[recall.status]}
                    {recall.result ? ` · ${RECALL_ACTIONS[recall.result]}` : ''}
                  </small>
                </article>
              ))}
            </TraceSection>
          </>
        )}
      </div>
    </section>
  );
}
