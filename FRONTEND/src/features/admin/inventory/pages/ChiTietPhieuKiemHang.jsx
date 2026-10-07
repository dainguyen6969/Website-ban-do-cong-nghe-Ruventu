// Admin inventory screen: ChiTietPhieuKiemHang.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInventoryCheckDetail, cancelInventoryCheck, balanceInventoryCheck } from '../api/inventoryCheckApi';
import './StockCheckFlow.css';

const formatDate = (value, withTime = false) => {
  if (!value) return '—';
  const dateObj = new Date(value);
  const dateStr = dateObj.toLocaleDateString('vi-VN');
  const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return withTime ? `${dateStr} ${timeStr}` : dateStr;
};

const STOCK_CHECK_LABELS = {
  DANG_KIEM: 'Đang kiểm',
  DA_CAN_BANG: 'Đã cân bằng',
  DA_HUY: 'Đã hủy',
};

const statusClass = (status) => status === 'DANG_KIEM' ? 'checking' : status === 'DA_CAN_BANG' ? 'balanced' : 'cancelled';

export default function ChiTietPhieuKiemHang() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [check, setCheck] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [balanceModal, setBalanceModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [balanceSuccess, setBalanceSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getInventoryCheckDetail(id)
      .then(data => {
        setCheck(data);
        setErrorMsg(null);
      })
      .catch(err => setErrorMsg(err.message || 'Không thể tải chi tiết phiếu kiểm hàng'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <main className="stock-flow-page"><div className="stock-flow-not-found">Đang tải dữ liệu...</div></main>;
  if (errorMsg || !check) return <main className="stock-flow-page"><div className="stock-flow-not-found">{errorMsg || 'Không tìm thấy phiếu kiểm hàng.'}</div></main>;

  const difference = check.so_luong_chenh_lech;
  const isOpen = check.trang_thai === 'DANG_KIEM';

  const openBalance = () => {
    setBalanceError(false);
    setBalanceModal(true);
  };

  const confirmBalance = async () => {
    setIsSubmitting(true);
    try {
      const result = await balanceInventoryCheck(check.id);
      setCheck(prev => ({ ...prev, trang_thai: 'DA_CAN_BANG' }));
      setBalanceSuccess({
        previousStock: result.ton_cu,
        nextStock: result.ton_moi,
        change: result.so_luong_thay_doi,
        date: new Date().toLocaleDateString('vi-VN')
      });
      setBalanceModal(false);
    } catch (err) {
      alert(err.message || 'Lỗi khi cân bằng kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) { setCancelError(true); return; }
    setIsSubmitting(true);
    try {
      await cancelInventoryCheck(check.id, cancelReason.trim());
      setCheck(prev => ({ ...prev, trang_thai: 'DA_HUY', ly_do: cancelReason.trim() }));
      setCancelModal(false);
    } catch (err) {
      alert(err.message || 'Lỗi khi hủy phiếu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="stock-flow-page">
    <header className="stock-detail-heading">
      <nav>KIỂM HÀNG <b>›</b> DANH SÁCH PHIẾU KIỂM HÀNG <b>›</b> <strong>{check.ma_phieu}</strong></nav>
      <div className="stock-detail-title-row">
        <div><button type="button" className="stock-action outline" onClick={() => navigate('/kho-hang/kiem-hang')}>‹ &nbsp; QUAY LẠI DANH SÁCH</button><h1>{check.ma_phieu}</h1><span className={`stock-check-status stock-check-status--${statusClass(check.trang_thai)}`}>{STOCK_CHECK_LABELS[check.trang_thai]?.toLocaleUpperCase('vi')}</span></div>
        {isOpen && <div className="stock-detail-actions"><button type="button" className="stock-action outline" onClick={() => navigate(`/kho-hang/kiem-hang/${check.id}/chinh-sua`)}>CHỈNH SỬA</button><button type="button" className="stock-action outline red-text" onClick={() => setCancelModal(true)}>HỦY PHIẾU</button><button type="button" className="stock-action black" onClick={openBalance}>CÂN BẰNG KHO</button></div>}
      </div>
      {check.trang_thai === 'DA_HUY' && <div className="stock-inline-banner error">Phiếu kiểm đã hủy. Không phát sinh điều chỉnh tồn kho từ phiếu này.</div>}
      {check.trang_thai === 'DA_CAN_BANG' && <div className="stock-inline-banner success">Phiếu kiểm đã được chốt và cập nhật tồn kho, không thay đổi.</div>}
      {balanceSuccess && <div className="stock-balance-success"><strong>ĐÃ CÂN BẰNG KHO THÀNH CÔNG</strong><div><span>Tồn trước: <b>{balanceSuccess.previousStock}</b></span><span>Tồn sau: <b>{balanceSuccess.nextStock}</b></span><span>Thay đổi: <b>{balanceSuccess.change > 0 ? `+${balanceSuccess.change}` : balanceSuccess.change}</b></span><span>Cập nhật: {balanceSuccess.date}</span></div></div>}
    </header>

    <div className="stock-detail-grid">
      <section className="stock-flow-card">
        <h2>SẢN PHẨM KIỂM</h2>
        <div className="stock-form-table-wrap"><table className={`stock-form-table stock-detail-table ${check.trang_thai === 'DA_HUY' ? 'is-muted' : ''}`}>
          <thead><tr><th>MÃ HÀNG</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>MÃ VẠCH</th><th>TỒN HỆ THỐNG</th><th>SAU ĐIỀU CHỈNH</th><th>CHÊNH LỆCH</th><th>LÝ DO</th></tr></thead>
          <tbody><tr><td>{check.phien_ban?.ma_san_pham}</td><td><strong>{check.phien_ban?.ten_san_pham}</strong><small>{check.phien_ban?.ten_phien_ban}</small></td><td>{check.phien_ban?.ma_vach}</td><td className="stock-number">{check.ton_he_thong}</td><td className="stock-number">{check.ton_thuc_te}</td><td><span className={`stock-difference ${difference !== 0 ? 'has-difference' : ''}`}>{difference > 0 ? `+${difference}` : difference}</span></td><td>{check.ly_do || '—'}</td></tr></tbody>
        </table></div>
        <div className="stock-form-summary"><div><span>SỐ LƯỢNG SAU ĐIỀU CHỈNH</span><strong>{check.ton_thuc_te}</strong></div><div><span>CHÊNH LỆCH TỒN KHO</span><strong className={difference !== 0 ? 'is-red' : ''}>{difference > 0 ? `+${difference}` : difference}</strong></div></div>
      </section>

      <aside className="stock-detail-side"><section className="stock-flow-card stock-info-card"><h2>THÔNG TIN PHIẾU</h2><dl><dt>MÃ PHIẾU</dt><dd>{check.ma_phieu}</dd><dt>TRẠNG THÁI</dt><dd><span className={`stock-check-status stock-check-status--${statusClass(check.trang_thai)}`}>{STOCK_CHECK_LABELS[check.trang_thai]?.toLocaleUpperCase('vi')}</span></dd><dt>NGÀY TẠO</dt><dd>{formatDate(check.ngay_tao)}</dd><dt>NGÀY KIỂM HÀNG</dt><dd>{formatDate(check.ngay_cap_nhat || check.ngay_tao, true)}</dd><dt>NGƯỜI KIỂM</dt><dd>{check.nguoi_kiem?.ho_ten || `ID: ${check.nguoi_kiem?.id}`}</dd><dt>KHO</dt><dd>KHO CỬA HÀNG</dd></dl></section><p className="stock-lock-note">Sản phẩm và kho không thể thay đổi sau khi tạo phiếu.</p></aside>
    </div>

    {balanceModal && <div className="stock-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && setBalanceModal(false)}><section className="stock-modal" role="dialog" aria-modal="true"><h2>XÁC NHẬN CÂN BẰNG KHO {!isSubmitting && <button type="button" onClick={() => setBalanceModal(false)}>×</button>}</h2><div className="stock-modal-body"><dl><dt>PHIẾU KIỂM</dt><dd>{check.ma_phieu}</dd><dt>KHO KIỂM HÀNG</dt><dd>KHO CỬA HÀNG</dd><dt>SẢN PHẨM / PHIÊN BẢN</dt><dd>{check.phien_ban?.ten_san_pham}</dd><dt>TỒN HỆ THỐNG GHI NHẬN</dt><dd>{check.ton_he_thong}</dd><dt>SỐ LƯỢNG THỰC TẾ ĐÃ KIỂM</dt><dd>{check.ton_thuc_te}</dd><dt>CHÊNH LỆCH</dt><dd>{difference > 0 ? `+${difference}` : difference}</dd><dt>LÝ DO</dt><dd>{check.ly_do || '—'}</dd></dl><p className="stock-modal-note">Cân bằng kho sẽ cập nhật tồn thực tế theo số lượng đã kiểm. Sau khi chốt, phiếu không thể sửa hoặc hủy.</p><footer><button type="button" className="stock-action outline" disabled={isSubmitting} onClick={() => setBalanceModal(false)}>QUAY LẠI</button><button type="button" className="stock-action black" disabled={isSubmitting} onClick={confirmBalance}>{isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN CÂN BẰNG'}</button></footer></div></section></div>}

    {cancelModal && <div className="stock-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && setCancelModal(false)}><section className="stock-modal" role="dialog" aria-modal="true"><h2>XÁC NHẬN HỦY PHIẾU {!isSubmitting && <button type="button" onClick={() => setCancelModal(false)}>×</button>}</h2><div className="stock-modal-body"><span className="stock-modal-label">PHIẾU KIỂM</span><strong>{check.ma_phieu}</strong><span className="stock-modal-label">KHO - SẢN PHẨM</span><p>KHO CỬA HÀNG — {check.phien_ban?.ten_san_pham}</p><label className="stock-cancel-field"><span>LÝ DO HỦY *</span><textarea value={cancelReason} disabled={isSubmitting} onChange={(event) => { setCancelReason(event.target.value); setCancelError(false); }} placeholder="Nhập lý do hủy phiếu kiểm..." />{cancelError && <small style={{color:'red'}}>Vui lòng nhập lý do hủy phiếu.</small>}</label><p className="stock-modal-note">Hủy phiếu không điều chỉnh tồn kho. Thao tác này không thể hoàn tác.</p><footer><button type="button" className="stock-action outline" disabled={isSubmitting} onClick={() => setCancelModal(false)}>ĐÓNG</button><button type="button" className="stock-action red" disabled={isSubmitting} onClick={confirmCancel}>{isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN HỦY'}</button></footer></div></section></div>}
  </main>;
}
