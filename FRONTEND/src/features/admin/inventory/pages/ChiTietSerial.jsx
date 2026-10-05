// Admin inventory screen: ChiTietSerial.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilAlt, HiX } from 'react-icons/hi';
import { getSerialDetail, nextWarehouseStatus, SERIAL_STATUS_META, updateSerialStatus } from '../api/serialApi';
import './SerialPages.css';

function StatusBadge({ status }) {
  const meta = SERIAL_STATUS_META[status];
  return <span className={`serial-status serial-status--${meta.key}`}><span aria-hidden="true" />{meta.label}</span>;
}

export default function ChiTietSerial() {
  const { serialId } = useParams();
  const navigate = useNavigate();
  const [serial, setSerial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getSerialDetail(serialId, controller.signal)
      .then(setSerial)
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message || 'Không thể tải chi tiết serial.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [serialId]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setModalOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [modalOpen]);

  if (loading || error || !serial) {
    return <main className="serial-page"><div className="serial-not-found"><h1>{loading ? 'ĐANG TẢI SERIAL...' : error || 'KHÔNG TÌM THẤY SERIAL'}</h1><button onClick={() => navigate('/kho-hang/danh-sach-serial')}>QUAY LẠI DANH SÁCH</button></div></main>;
  }

  const meta = SERIAL_STATUS_META[serial.status];
  const nextStatus = nextWarehouseStatus(serial.status);
  const canEdit = Boolean(nextStatus);
  const nextMeta = nextStatus ? SERIAL_STATUS_META[nextStatus] : null;
  const openModal = () => { setReason(''); setError(''); setModalOpen(true); };
  const saveStatus = async () => {
    if (!canEdit || !reason.trim()) return;
    setSaving(true); setError('');
    try {
      await updateSerialStatus(serial.id, nextStatus, reason);
      setSerial((current) => ({ ...current, status: nextStatus }));
      setModalOpen(false);
    } catch (cause) {
      setError(cause.message || 'Không thể cập nhật trạng thái serial.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="serial-page" role="main">
      <div className="serial-page__inner">
        <nav className="serial-secondary-breadcrumb" aria-label="Breadcrumb nội dung">
          <span>Sản phẩm</span><span>›</span><span>Quản lý kho</span><span>›</span><span>Danh sách Serial</span><span>›</span><strong>Chi tiết Serial</strong>
        </nav>
        <div className="serial-detail-heading">
          <div><h1>CHI TIẾT SERIAL</h1><div className="serial-id-box">{serial.serial}</div></div>
          <div className="serial-detail-actions">
            <button type="button" className="serial-back" onClick={() => navigate('/kho-hang/danh-sach-serial')}><HiOutlineArrowLeft /> QUAY LẠI</button>
            {canEdit && <button type="button" className="serial-edit" onClick={openModal}><HiOutlinePencilAlt /> SỬA TRẠNG THÁI</button>}
          </div>
        </div>
        {error && <p className="serial-transition-error" role="alert">{error}</p>}
        <div className={`serial-banner serial-banner--${meta.key}`}>
          <span className="serial-banner__square" aria-hidden="true" />
          <div><strong>{meta.label.toLocaleUpperCase('vi')}</strong><p>{meta.description}</p></div>
        </div>
        <div className="serial-detail-grid">
          <div className="serial-detail-main">
            <section className="serial-info-card">
              <h2>THÔNG TIN SERIAL</h2>
              <dl><div><dt>Số serial</dt><dd className="serial-code">{serial.serial}</dd></div><div><dt>Trạng thái</dt><dd><StatusBadge status={serial.status} /></dd></div><div><dt>Ngày kích hoạt</dt><dd>{serial.activatedAt}</dd></div><div><dt>Hạn bảo hành</dt><dd>{serial.warrantyUntil}</dd></div></dl>
            </section>
            <section className="serial-info-card">
              <h2>PHIÊN BẢN SẢN PHẨM</h2>
              <dl><div><dt>Sản phẩm</dt><dd>{serial.productName}<small>{serial.productCode}</small></dd></div><div><dt>Tên phiên bản</dt><dd>{serial.version}</dd></div><div><dt>Mã vạch/SKU</dt><dd className={`serial-status-text--${meta.key}`}>{serial.barcode}</dd></div><div><dt>ID phiên bản</dt><dd>{serial.versionId}</dd></div></dl>
            </section>
          </div>
          <aside className="serial-detail-sidebar">
            {serial.order && <section className="serial-warehouse-card"><h2>ĐƠN HÀNG LIÊN KẾT</h2><dl><div><dt>Mã đơn hàng</dt><dd>{serial.order.ma_don_hang}</dd></div></dl></section>}
            <section className="serial-note"><h2>GHI CHÚ HỆ THỐNG</h2><p>Dữ liệu Serial là hồ sơ lưu trữ vĩnh viễn. Chỉ serial trong kho hoặc lỗi mới được chuyển đổi trạng thái tại đây.</p></section>
          </aside>
        </div>
      </div>
      {modalOpen && (
        <div className="serial-status-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
            <header><div><span aria-hidden="true" /><div><h2 id="status-modal-title">SỬA TRẠNG THÁI</h2><p>{serial.serial}</p></div></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Đóng"><HiX size={21} /></button></header>
            <div className="serial-status-modal__body">
              <label htmlFor="new-serial-status">Trạng thái mới</label>
              <select id="new-serial-status" value={nextStatus} disabled className={`serial-modal-select--${nextMeta.key}`}><option value={nextStatus}>{nextMeta.label}</option></select>
              <label htmlFor="serial-status-reason">Lý do</label>
              <input id="serial-status-reason" value={reason} maxLength="150" onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do thay đổi trạng thái" />
            </div>
            <footer><button type="button" className="serial-modal-cancel" onClick={() => setModalOpen(false)}>HỦY</button><button type="button" className="serial-modal-save" disabled={saving || !reason.trim()} onClick={saveStatus}>{saving ? 'ĐANG LƯU...' : 'LƯU TRẠNG THÁI'}</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}
