import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilAlt, HiX } from 'react-icons/hi';
import {
  getSerialDetail,
  nextWarehouseStatus,
  SERIAL_STATUS_META,
  updateSerialStatus,
} from '../api/serialApi';
import SerialTracePanel from '../recall/SerialTracePanel';
import { withIdempotency } from '../../../../shared/services/mutationUtils';
import './SerialPages.css';
import { FormDropdown } from '../../../../shared/components/ui/FilterDropdown';

function StatusBadge({ status }) {
  const meta = SERIAL_STATUS_META[status];
  return (
    <span className={`serial-status serial-status--${meta.key}`}>
      <span aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getSerialWarranty(serial, now = Date.now()) {
  const start = Date.parse(serial.activatedAtRaw ?? '');
  const end = Date.parse(serial.warrantyUntilRaw ?? '');
  const unknown = { tone: 'neutral', until: '—', duration: '—' };

  if (!serial.activatedAtRaw) return { ...unknown, label: 'Chưa kích hoạt' };
  if (!Number.isFinite(start)) return { ...unknown, label: 'Chưa rõ ngày kích hoạt' };
  if (start > now) return { ...unknown, label: 'Chưa đến ngày kích hoạt' };
  if (!Number.isFinite(end) || end < start) {
    return { ...unknown, label: 'Chưa xác định hạn' };
  }

  const dates = {
    until: serial.warrantyUntil,
    duration: `${Math.round((end - start) / DAY_MS)} ngày`,
  };

  if (now >= end) return { ...dates, tone: 'red', label: 'Hết hạn' };

  const days = Math.floor((end - now) / DAY_MS);
  return {
    ...dates,
    tone: 'green',
    label: 'Còn bảo hành',
    remaining: days > 0 ? `Còn ${days} ngày` : 'Còn dưới 1 ngày',
  };
}

function serialRecordPath(base, id) {
  const key = String(id ?? '');
  return /^[1-9]\d*$/.test(key) ? `${base}/${key}` : '';
}

function SerialRecordLink({ to, children }) {
  return to ? <Link to={to}>{children}</Link> : children;
}

function SerialFact({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SerialOverview({ serial }) {
  const productHref = serialRecordPath('/admin/san-pham/chi-tiet-san-pham', serial.productId);
  const variantHref = serialRecordPath('/kho-hang/quan-ly-phien-ban/chi-tiet', serial.versionId);
  const orderHref = serialRecordPath('/admin/don-hang/danh-sach-don-hang', serial.order?.id);
  const productName = serial.productName.trim();
  const variantName = serial.version.trim();
  const prefix = `${productName} - `;
  const warranty = getSerialWarranty(serial);

  let variantLabel = variantName || '—';
  if (productName && variantName === productName) {
    variantLabel = variantHref ? 'Xem phiên bản' : 'Cùng tên sản phẩm';
  } else if (productName && variantName.startsWith(prefix)) {
    variantLabel = variantName.slice(prefix.length);
  }

  return (
    <div className="serial-overview">
      <section className="serial-overview-card">
        <h2>SẢN PHẨM LIÊN KẾT</h2>
        <dl>
          <SerialFact label="Sản phẩm">
            <SerialRecordLink to={productHref}>
              {productName || serial.productCode || (productHref ? 'Xem sản phẩm' : '—')}
            </SerialRecordLink>
            {productName && serial.productCode && serial.productCode !== productName && (
              <small>{serial.productCode}</small>
            )}
          </SerialFact>
          <SerialFact label="Phiên bản">
            <SerialRecordLink to={variantHref}>{variantLabel}</SerialRecordLink>
          </SerialFact>
          <SerialFact label="Mã vạch/SKU">{serial.barcode || '—'}</SerialFact>
          {serial.order?.ma_don_hang && (
            <SerialFact label="Đơn hàng liên kết">
              <SerialRecordLink to={orderHref}>{serial.order.ma_don_hang}</SerialRecordLink>
            </SerialFact>
          )}
        </dl>
      </section>

      <section className="serial-overview-card">
        <h2>BẢO HÀNH</h2>
        <dl>
          <SerialFact label="Ngày kích hoạt">{serial.activatedAt}</SerialFact>
          <SerialFact label="Hạn bảo hành">
            <strong>{warranty.until}</strong>
          </SerialFact>
          <SerialFact label="Thời hạn theo hồ sơ">{warranty.duration}</SerialFact>
          <SerialFact label="Trạng thái bảo hành">
            <span data-admin-status={warranty.tone}>{warranty.label}</span>
            {warranty.remaining && <small>{warranty.remaining}</small>}
          </SerialFact>
        </dl>
      </section>
    </div>
  );
}

export default function ChiTietSerial() {
  const { serialId } = useParams();
  const navigate = useNavigate();

  const statusBusy = useRef(false);
  const statusAttempt = useRef(null);

  const [serial, setSerial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getSerialDetail(serialId, controller.signal)
      .then(setSerial)
      .catch((cause) => {
        if (cause.name !== 'AbortError')
          setError(cause.message || 'Không thể tải chi tiết serial.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [serialId]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [modalOpen]);

  if (loading || !serial) {
    return (
      <main className="serial-page">
        <div className="serial-not-found">
          <h1>{loading ? 'ĐANG TẢI SERIAL...' : error || 'SERIAL KHÔNG TỒN TẠI'}</h1>
          <button onClick={() => navigate('/kho-hang/danh-sach-serial')}>← QUAY LẠI</button>
        </div>
      </main>
    );
  }

  const nextStatus = nextWarehouseStatus(serial.status);
  const canEdit = Boolean(nextStatus) && !serial.recallBlocked;
  const nextMeta = nextStatus ? SERIAL_STATUS_META[nextStatus] : null;
  const openModal = () => {
    if (!statusAttempt.current) {
      setReason('');
    }

    setError('');
    setModalOpen(true);
  };
  const saveStatus = async () => {
    if (statusBusy.current || !canEdit || !reason.trim()) {
      return;
    }

    statusBusy.current = true;
    setSaving(true);
    setError('');

    try {
      const result = await withIdempotency(
        statusAttempt,
        `serial:${serial.id}:status`,
        {
          trang_thai: nextStatus,
          ly_do: reason.trim(),
        },
        (key, body) => updateSerialStatus(serial.id, key, body)
      );

      setSerial((current) => ({
        ...current,
        status: result.trang_thai,
      }));

      setModalOpen(false);
    } catch (cause) {
      setError(cause.message || 'Không thể cập nhật trạng thái serial.');
    } finally {
      statusBusy.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="serial-page serial-detail-page ruventu-ops" role="main">
      <div className="serial-page__inner">
        <nav className="serial-secondary-breadcrumb" aria-label="Breadcrumb nội dung">
          <span>Sản phẩm</span>
          <span>›</span>
          <span>Quản lý kho</span>
          <span>›</span>
          <span>Danh sách Serial</span>
          <span>›</span>
          <strong>Chi tiết Serial</strong>
        </nav>
        <div className="serial-detail-heading">
          <div>
            <h1>CHI TIẾT SERIAL</h1>
            <div className="serial-summary-id">
              <span className="serial-id-box">{serial.serial}</span>
              <StatusBadge status={serial.status} />
            </div>
          </div>
          <div className="serial-detail-actions">
            <button
              type="button"
              className="serial-back"
              onClick={() => navigate('/kho-hang/danh-sach-serial')}
            >
              <HiOutlineArrowLeft /> QUAY LẠI
            </button>
            {canEdit && (
              <button type="button" className="serial-edit" onClick={openModal}>
                <HiOutlinePencilAlt /> SỬA TRẠNG THÁI
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="serial-transition-error" role="alert">
            {error}
          </p>
        )}

        {serial.recallBlocked && (
          <p className="recall-notice" role="status">
            Thiết bị thuộc phạm vi thu hồi. Đang chặn bán và bàn giao.
          </p>
        )}

        <SerialOverview serial={serial} />

        <SerialTracePanel serialId={serialId} refreshKey={serial.status} />
      </div>

      {modalOpen && (
        <div
          className="serial-status-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
            <header>
              <div>
                <span aria-hidden="true" />
                <div>
                  <h2 id="status-modal-title">SỬA TRẠNG THÁI</h2>
                  <p>{serial.serial}</p>
                </div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Đóng">
                <HiX size={21} />
              </button>
            </header>
            <div className="serial-status-modal__body">
              <label htmlFor="new-serial-status">Trạng thái mới</label>
              <FormDropdown
                id="new-serial-status"
                value={nextStatus}
                disabled
                className={`serial-modal-select--${nextMeta.key}`}
              >
                <option value={nextStatus}>{nextMeta.label}</option>
              </FormDropdown>
              <label htmlFor="serial-status-reason">Lý do</label>
              <input
                disabled={saving || statusAttempt.current !== null}
                id="serial-status-reason"
                value={reason}
                maxLength="150"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Nhập lý do thay đổi trạng thái"
              />
            </div>
            <footer>
              <button
                type="button"
                className="serial-modal-cancel"
                onClick={() => setModalOpen(false)}
              >
                HỦY
              </button>
              <button
                type="button"
                className="serial-modal-save"
                disabled={saving || !reason.trim()}
                onClick={saveStatus}
              >
                {saving ? 'ĐANG LƯU...' : 'LƯU TRẠNG THÁI'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
