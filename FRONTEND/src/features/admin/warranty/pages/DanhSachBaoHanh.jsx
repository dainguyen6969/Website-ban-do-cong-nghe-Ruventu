import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { mockWarrantyData, warrantyStatusLabels } from '../data/mockData';
import { filterWarranties, statusLabels, quoteStatuses, paymentStatuses, refundStatuses } from '../data/warrantyModel';
import { WarrantyBadge } from '../components/WarrantyShell';
import '../styles/warrantyShell.css';

const emptyFilters = { search: '', status: '', quoteStatus: '', paymentStatus: '', refundStatus: '', fromDate: '', toDate: '' };

export default function DanhSachBaoHanh() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, status: warrantyStatusLabels[params.get('trang_thai')] || '' }));
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const invalidDates = filters.fromDate && filters.toDate && filters.fromDate > filters.toDate;
  const items = invalidDates ? [] : filterWarranties(mockWarrantyData, filters);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);
  const update = (field, value) => { setFilters(current => ({ ...current, [field]: value })); setPage(1); };
  const date = value => <><span>{value?.split(' ')[0] || 'Chưa xác định'}</span><small>{value?.split(' ')[1] || ''}</small></>;

  return <div className="w-shell">
    <header className="w-shell-hero">
      <div><h1>DANH SÁCH PHIẾU BẢO HÀNH</h1><p>Theo dõi tiếp nhận, xử lý và bàn giao thiết bị.</p><p className="w-shell-note">Dữ liệu mẫu</p></div>
      <button type="button" className="w-shell-button w-shell-button--red" onClick={() => navigate('/admin/bao-hanh/tao-moi')}><Plus size={14} /> LẬP PHIẾU BẢO HÀNH</button>
    </header>
    <section className="w-shell-toolbar" aria-label="Bộ lọc phiếu bảo hành">
      <div className="w-shell-filter-primary">
        <label className="w-shell-search"><Search size={16} /><input aria-label="Tìm phiếu bảo hành" placeholder="Tìm mã phiếu / serial / mã theo dõi / tên / SĐT..." value={filters.search} onChange={event => update('search', event.target.value)} /></label>
        <select aria-label="Trạng thái xử lý" value={filters.status} onChange={event => update('status', event.target.value)}><option value="">Trạng thái xử lý — Tất cả</option>{Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
        <button type="button" className={`w-shell-button ${advanced ? 'w-shell-button--black' : ''}`} aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}><SlidersHorizontal size={14} /> BỘ LỌC</button>
      </div>
      {advanced && <div className="w-shell-filter-advanced">
        {[[ 'BÁO GIÁ', 'quoteStatus', quoteStatuses ], [ 'THANH TOÁN', 'paymentStatus', paymentStatuses ], [ 'HOÀN TIỀN', 'refundStatus', refundStatuses ]].map(([label, field, options]) => <label key={field}>{label}<select aria-label={label} value={filters[field]} onChange={event => update(field, event.target.value)}><option value="">Tất cả</option>{options.map(value => <option key={value}>{value}</option>)}</select></label>)}
        <label>TỪ NGÀY<input type="date" value={filters.fromDate} onChange={event => update('fromDate', event.target.value)} /></label>
        <label>ĐẾN NGÀY<input type="date" value={filters.toDate} onChange={event => update('toDate', event.target.value)} /></label>
        <button type="button" className="w-shell-button" onClick={() => { setFilters(emptyFilters); setPage(1); }}>XÓA BỘ LỌC</button>
      </div>}
      {invalidDates && <p className="w-shell-error" role="alert">Từ ngày phải nhỏ hơn hoặc bằng đến ngày.</p>}
    </section>
    <div className="w-shell-content"><section className="w-shell-list-frame">
      <div className="w-shell-table-scroll"><table className="w-shell-list-table">
        <thead><tr>{['PHIẾU / ĐƠN HÀNG', 'NGƯỜI LIÊN HỆ', 'THIẾT BỊ', 'XỬ LÝ / BÁO GIÁ', 'THANH TOÁN / HOÀN TIỀN', 'TIẾP NHẬN', 'CẬP NHẬT', 'THAO TÁC'].map(title => <th key={title}>{title}</th>)}</tr></thead>
        <tbody>{visible.map(item => <tr key={item.id}>
          <td><strong>{item.id}</strong><small>{item.orderId || '—'}</small></td>
          <td><strong>{item.customerName || '—'}</strong><small>{item.customerPhone || '—'}</small></td>
          <td><strong>{item.productName}</strong><span>{item.serial || '—'}</span>{item.trackingCode && <small>Mã theo dõi: {item.trackingCode}</small>}</td>
          <td><WarrantyBadge>{statusLabels[item.status] || item.status}</WarrantyBadge><div className="w-shell-state-line">Báo giá: <WarrantyBadge>{item.quoteStatus}</WarrantyBadge></div></td>
          <td><div className="w-shell-state-line">Thanh toán: <WarrantyBadge>{item.paymentStatus}</WarrantyBadge></div><div className="w-shell-state-line">Hoàn tiền: <WarrantyBadge>{item.refundStatus}</WarrantyBadge></div>{item.remainingRefund != null && <small className="w-shell-error">Còn hoàn: {item.remainingRefund.toLocaleString('vi-VN')}đ</small>}{item.pendingSettlement && <small>Còn đối soát NCC</small>}</td>
          <td>{date(item.created)}</td><td>{date(item.updated)}</td>
          <td><button type="button" className="w-shell-button" aria-label={`Xem chi tiết ${item.id}`} onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>XEM CHI TIẾT</button></td>
        </tr>)}{!visible.length && <tr><td colSpan={8} className="w-shell-empty">Không tìm thấy phiếu bảo hành phù hợp.</td></tr>}</tbody>
      </table></div>
      <footer className="w-shell-list-footer"><div>Hiển thị {items.length ? `${start + 1}–${start + visible.length}` : '0'} / tổng {items.length}<small>—: chưa có thông tin.</small></div><div className="w-shell-pager"><strong>TRANG {currentPage} / {pages}</strong><select aria-label="Số phiếu mỗi trang" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} / trang</option>)}</select><button type="button" className="w-shell-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>TRƯỚC</button><button type="button" className="w-shell-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>SAU</button></div></footer>
    </section></div>
  </div>;
}
