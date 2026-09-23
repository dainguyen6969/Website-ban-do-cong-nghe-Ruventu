import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStockCheck, updateStockCheck, updateVersionStock } from '../data/mockStockChecks';
import { subscribeToAdminSlice } from '../sync/adminSync';
import './StockCheckFlow.css';

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}${withTime && time ? ` ${time}` : ''}`;
};

const statusClass = (status) => status === 'Đang kiểm' ? 'checking' : status === 'Đã cân bằng' ? 'balanced' : 'cancelled';

export default function ChiTietPhieuKiemHang() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [check, setCheck] = useState(() => getStockCheck(id));
  const [balanceModal, setBalanceModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [balanceSuccess, setBalanceSuccess] = useState(null);

  useEffect(() => subscribeToAdminSlice('stock-checks', () => setCheck(getStockCheck(id))), [id]);

  if (!check) return <main className="stock-flow-page"><div className="stock-flow-not-found">Không tìm thấy phiếu kiểm hàng.</div></main>;

  const difference = check.adjustedStock - check.systemStock;
  const displayReason = check.reason === 'Nhập tay...' ? check.customReason : check.reason;
  const isOpen = check.status === 'Đang kiểm';

  const openBalance = () => {
    if (difference !== 0 && !displayReason?.trim()) { setBalanceError(true); return; }
    setBalanceError(false);
    setBalanceModal(true);
  };

  const confirmBalance = () => {
    const previousStock = check.systemStock;
    const nextStock = check.adjustedStock;
    updateVersionStock(check.versionId, nextStock);
    const updated = updateStockCheck(check.id, {
      status: 'Đã cân bằng',
      systemStock: nextStock,
      adjustedStock: nextStock,
      reason: '',
      customReason: '',
      balancedAt: new Date().toISOString(),
    });
    setCheck(updated);
    setBalanceSuccess({ previousStock, nextStock, change: nextStock - previousStock, date: new Date().toLocaleDateString('vi-VN') });
    setBalanceModal(false);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError(true); return; }
    const updated = updateStockCheck(check.id, { status: 'Đã hủy', cancelReason: cancelReason.trim() });
    setCheck(updated);
    setCancelModal(false);
  };

  return <main className="stock-flow-page">
    <header className="stock-detail-heading">
      <nav>KIỂM HÀNG <b>›</b> DANH SÁCH PHIẾU KIỂM HÀNG <b>›</b> <strong>{check.id}</strong></nav>
      <div className="stock-detail-title-row">
        <div><button type="button" className="stock-action outline" onClick={() => navigate('/kho-hang/kiem-hang')}>‹ &nbsp; QUAY LẠI DANH SÁCH</button><h1>{check.id}</h1><span className={`stock-check-status stock-check-status--${statusClass(check.status)}`}>{check.status.toLocaleUpperCase('vi')}</span></div>
        {isOpen && <div className="stock-detail-actions"><button type="button" className="stock-action outline" onClick={() => navigate(`/kho-hang/kiem-hang/${check.id}/chinh-sua`)}>CHỈNH SỬA</button><button type="button" className="stock-action outline red-text" onClick={() => setCancelModal(true)}>HỦY PHIẾU</button><button type="button" className="stock-action black" onClick={openBalance}>CÂN BẰNG KHO</button></div>}
      </div>
      {balanceError && <div className="stock-inline-banner error">Vui lòng cung cấp lý do chênh lệch trước khi cân bằng kho</div>}
      {check.status === 'Đã hủy' && <div className="stock-inline-banner error">Phiếu kiểm đã hủy. Không phát sinh điều chỉnh tồn kho từ phiếu này.</div>}
      {check.status === 'Đã cân bằng' && <div className="stock-inline-banner success">Phiếu kiểm đã được chốt và cập nhật tồn kho, không thay đổi.</div>}
      {balanceSuccess && <div className="stock-balance-success"><strong>ĐÃ CÂN BẰNG KHO THÀNH CÔNG</strong><div><span>Tồn trước: <b>{balanceSuccess.previousStock}</b></span><span>Tồn sau: <b>{balanceSuccess.nextStock}</b></span><span>Thay đổi: <b>{balanceSuccess.change > 0 ? `+${balanceSuccess.change}` : balanceSuccess.change}</b></span><span>Cập nhật: {balanceSuccess.date}</span></div></div>}
    </header>

    <div className="stock-detail-grid">
      <section className="stock-flow-card">
        <h2>SẢN PHẨM KIỂM</h2>
        <div className="stock-form-table-wrap"><table className={`stock-form-table stock-detail-table ${check.status === 'Đã hủy' ? 'is-muted' : ''}`}>
          <thead><tr><th>MÃ HÀNG</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>MÃ VẠCH</th><th>TỒN HỆ THỐNG</th><th>SAU ĐIỀU CHỈNH</th><th>CHÊNH LỆCH</th><th>LÝ DO</th></tr></thead>
          <tbody><tr><td>{check.sku}</td><td><strong>{check.productName}</strong><small>{check.variant}</small></td><td>{check.barcode}</td><td className="stock-number">{check.systemStock}</td><td className="stock-number">{check.adjustedStock}</td><td><span className={`stock-difference ${difference !== 0 ? 'has-difference' : ''}`}>{difference > 0 ? `+${difference}` : difference}</span></td><td>{displayReason || '—'}</td></tr></tbody>
        </table></div>
        <div className="stock-form-summary"><div><span>SỐ LƯỢNG SAU ĐIỀU CHỈNH</span><strong>{check.adjustedStock}</strong></div><div><span>CHÊNH LỆCH TỒN KHO</span><strong className={difference !== 0 ? 'is-red' : ''}>{difference > 0 ? `+${difference}` : difference}</strong></div></div>
      </section>

      <aside className="stock-detail-side"><section className="stock-flow-card stock-info-card"><h2>THÔNG TIN PHIẾU</h2><dl><dt>MÃ PHIẾU</dt><dd>{check.id}</dd><dt>TRẠNG THÁI</dt><dd><span className={`stock-check-status stock-check-status--${statusClass(check.status)}`}>{check.status.toLocaleUpperCase('vi')}</span></dd><dt>NGÀY TẠO</dt><dd>{formatDate(check.createdAt)}</dd><dt>NGÀY KIỂM HÀNG</dt><dd>{formatDate(check.checkedAt, true)}</dd><dt>KHO</dt><dd>{check.warehouse.toLocaleUpperCase('vi')}</dd></dl></section><p className="stock-lock-note">Sản phẩm và kho không thể thay đổi sau khi tạo phiếu.</p></aside>
    </div>

    {balanceModal && <div className="stock-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setBalanceModal(false)}><section className="stock-modal" role="dialog" aria-modal="true"><h2>XÁC NHẬN CÂN BẰNG KHO <button type="button" onClick={() => setBalanceModal(false)}>×</button></h2><div className="stock-modal-body"><dl><dt>PHIẾU KIỂM</dt><dd>{check.id}</dd><dt>KHO KIỂM HÀNG</dt><dd>{check.warehouse.toLocaleUpperCase('vi')}</dd><dt>SẢN PHẨM / PHIÊN BẢN</dt><dd>{check.productName}</dd><dt>TỒN HỆ THỐNG GHI NHẬN</dt><dd>{check.systemStock}</dd><dt>SỐ LƯỢNG THỰC TẾ ĐÃ KIỂM</dt><dd>{check.adjustedStock}</dd><dt>CHÊNH LỆCH</dt><dd>{difference > 0 ? `+${difference}` : difference}</dd><dt>LÝ DO</dt><dd>{displayReason || '—'}</dd></dl><p className="stock-modal-note">Cân bằng kho sẽ cập nhật tồn thực tế theo số lượng đã kiểm. Sau khi chốt, phiếu không thể sửa hoặc hủy.</p><footer><button type="button" className="stock-action outline" onClick={() => setBalanceModal(false)}>QUAY LẠI</button><button type="button" className="stock-action black" onClick={confirmBalance}>XÁC NHẬN CÂN BẰNG</button></footer></div></section></div>}

    {cancelModal && <div className="stock-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCancelModal(false)}><section className="stock-modal" role="dialog" aria-modal="true"><h2>XÁC NHẬN HỦY PHIẾU <button type="button" onClick={() => setCancelModal(false)}>×</button></h2><div className="stock-modal-body"><span className="stock-modal-label">PHIẾU KIỂM</span><strong>{check.id}</strong><span className="stock-modal-label">KHO - SẢN PHẨM</span><p>{check.warehouse.toLocaleUpperCase('vi')} — {check.productName}</p><label className="stock-cancel-field"><span>LÝ DO HỦY *</span><textarea value={cancelReason} onChange={(event) => { setCancelReason(event.target.value); setCancelError(false); }} placeholder="Nhập lý do hủy phiếu kiểm..." />{cancelError && <small>Vui lòng nhập lý do hủy phiếu.</small>}</label><p className="stock-modal-note">Hủy phiếu không điều chỉnh tồn kho. Thao tác này không thể hoàn tác.</p><footer><button type="button" className="stock-action outline" onClick={() => setCancelModal(false)}>ĐÓNG</button><button type="button" className="stock-action red" onClick={confirmCancel}>XÁC NHẬN HỦY</button></footer></div></section></div>}
  </main>;
}
