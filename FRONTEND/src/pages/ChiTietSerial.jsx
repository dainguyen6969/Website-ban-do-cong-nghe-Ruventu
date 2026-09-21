import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencilAlt, HiX } from 'react-icons/hi';
import { getSerialById, SERIAL_STATUSES, SERIAL_STATUS_META, updateSerialStatus } from '../data/mockSerials';
import './SerialPages.css';

function StatusBadge({ status }) {
  const meta = SERIAL_STATUS_META[status];
  return <span className={`serial-status serial-status--${meta.key}`}><span aria-hidden="true" />{status}</span>;
}

export default function ChiTietSerial() {
  const { serialId } = useParams();
  const navigate = useNavigate();
  const serial = getSerialById(serialId);
  const [status, setStatus] = useState(serial?.status);
  const [modalOpen, setModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState(serial?.status || SERIAL_STATUSES[0]);
  const invalidTransition = status === 'Trong kho' && nextStatus === 'Đang bảo hành';

  useEffect(() => {
    if (!modalOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setModalOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [modalOpen]);

  if (!serial) {
    return <main className="serial-page"><div className="serial-not-found"><h1>KHÔNG TÌM THẤY SERIAL</h1><button onClick={() => navigate('/kho-hang/danh-sach-serial')}>QUAY LẠI DANH SÁCH</button></div></main>;
  }

  const meta = SERIAL_STATUS_META[status];
  const openModal = () => { setNextStatus(status); setModalOpen(true); };
  const saveStatus = () => {
    if (invalidTransition || nextStatus === status) return;
    updateSerialStatus(serial.id, nextStatus);
    setStatus(nextStatus);
    setModalOpen(false);
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
            <button type="button" className="serial-edit" onClick={openModal}><HiOutlinePencilAlt /> SỬA TRẠNG THÁI</button>
          </div>
        </div>

        <div className={`serial-banner serial-banner--${meta.key}`}>
          <span className="serial-banner__square" aria-hidden="true" />
          <div><strong>{status.toLocaleUpperCase('vi')}</strong><p>{meta.description}</p></div>
        </div>

        <div className="serial-detail-grid">
          <div className="serial-detail-main">
            <section className="serial-info-card">
              <h2>THÔNG TIN SERIAL</h2>
              <dl><div><dt>Số serial</dt><dd className="serial-code">{serial.serial}</dd></div><div><dt>Trạng thái</dt><dd><StatusBadge status={status} /></dd></div><div><dt>Ngày kích hoạt</dt><dd>{serial.activatedAt}</dd></div><div><dt>Hạn bảo hành</dt><dd>{serial.warrantyUntil || '-'}</dd></div></dl>
            </section>
            <section className="serial-info-card">
              <h2>PHIÊN BẢN SẢN PHẨM</h2>
              <dl><div><dt>Tên phiên bản</dt><dd>{serial.version}</dd></div><div><dt>Mã vạch/SKU</dt><dd className={`serial-status-text--${meta.key}`}>{serial.barcode}<small>{serial.sku}</small></dd></div></dl>
            </section>
          </div>
          <aside className="serial-detail-sidebar">
            <section className="serial-warehouse-card"><h2>THÔNG TIN KHO</h2><dl><div><dt>Kho</dt><dd>{serial.warehouse}</dd></div><div><dt>Ngày nhập kho</dt><dd>{serial.importedAt}</dd></div></dl></section>
            <section className="serial-note"><h2>GHI CHÚ HỆ THỐNG</h2><p>Dữ liệu Serial là hồ sơ lưu trữ vĩnh viễn. Chỉ được phép chỉnh sửa trạng thái.</p></section>
          </aside>
        </div>
      </div>

      {modalOpen && (
        <div className="serial-status-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
            <header><div><span aria-hidden="true" /><div><h2 id="status-modal-title">SỬA TRẠNG THÁI</h2><p>{serial.serial}</p></div></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Đóng"><HiX size={21} /></button></header>
            <div className="serial-status-modal__body">
              <label htmlFor="new-serial-status">Trạng thái mới</label>
              <select id="new-serial-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className={`serial-modal-select--${SERIAL_STATUS_META[nextStatus].key}`}>
                {SERIAL_STATUSES.map((option) => <option key={option}>{option}</option>)}
              </select>
              {invalidTransition && <p className="serial-transition-error" role="alert">Sản phẩm chưa được xuất bán, không thể chuyển sang trạng thái đang bảo hành.</p>}
            </div>
            <footer><button type="button" className="serial-modal-cancel" onClick={() => setModalOpen(false)}>HỦY</button><button type="button" className="serial-modal-save" disabled={invalidTransition || nextStatus === status} onClick={saveStatus}>LƯU TRẠNG THÁI</button></footer>
          </section>
        </div>
      )}
    </main>
  );
}

