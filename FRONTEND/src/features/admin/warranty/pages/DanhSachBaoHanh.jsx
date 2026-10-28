import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { mockWarrantyData, warrantyStatusLabels } from '../data/mockData';
import { filterWarranties, statusLabels, quoteStatuses, paymentStatuses, refundStatuses, quickFilters } from '../data/warrantyModel';
import { WarrantyBadge } from '../components/WarrantyShell';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import '../styles/warrantyShell.css';

const emptyFilters = { search: '', status: '', quick: 'TẤT CẢ', quoteStatus: '', paymentStatus: '', refundStatus: '', fromDate: '', toDate: '' };

const attention = item => [
  item.quoteStatus === 'Chờ khách phản hồi' && 'Chờ phản hồi báo giá',
  ['Chưa thanh toán', 'Thanh toán một phần'].includes(item.paymentStatus) && 'Cần đối chiếu khoản thu',
  ['Chờ hoàn tiền', 'Hoàn tiền một phần'].includes(item.refundStatus) && 'Chờ hoàn tiền',
  item.pendingSettlement && 'Còn đối soát NCC',
].filter(Boolean).join(' · ');

export default function DanhSachBaoHanh() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, status: warrantyStatusLabels[params.get('trang_thai')] || '' }));
  const [advanced, setAdvanced] = useState(false);
  const [samples, setSamples] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const invalidDates = filters.fromDate && filters.toDate && filters.fromDate > filters.toDate;
  const items = invalidDates ? [] : filterWarranties(mockWarrantyData, filters);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);
  const update = (field, value) => { setFilters(current => ({ ...current, [field]: value, ...(field === 'status' ? { quick: 'TẤT CẢ' } : field === 'quick' ? { status: '' } : {}) })); setPage(1); };
  const date = value => <><span>{value?.split(' ')[0] || 'Chưa xác định'}</span><small>{value?.split(' ')[1] || ''}</small></>;

  return <div className="w-shell admin-list-page">
    <header className="w-shell-hero">
      <div><p className="w-shell-breadcrumb">BẢO HÀNH / DANH SÁCH PHIẾU BẢO HÀNH</p><h1>DANH SÁCH PHIẾU BẢO HÀNH</h1><p>THEO DÕI TIẾP NHẬN, KIỂM TRA, XỬ LÝ VÀ BÀN GIAO THIẾT BỊ.</p></div>
      <button type="button" className="w-shell-button w-shell-button--red" onClick={() => navigate('/admin/bao-hanh/tao-moi')}><Plus size={14} /> LẬP PHIẾU BẢO HÀNH</button>
    </header>
    {location.state?.createdTicketId && <p className="w-intake-message" role="status">Đã tạo phiếu {location.state.createdTicketId} bằng dữ liệu mẫu. Phiếu chỉ được lưu trong phiên này.</p>}
    <section className="w-shell-toolbar" aria-label="Bộ lọc phiếu bảo hành">
      <div className="w-shell-quick" role="group" aria-label="Lọc nhanh phiếu bảo hành">{Object.keys(quickFilters).map(label => <button type="button" className="w-shell-button" key={label} aria-pressed={filters.quick === label} onClick={() => update('quick', label)}>{label}</button>)}<button type="button" className="w-shell-button" aria-expanded={samples} onClick={() => setSamples(value => !value)}>DỮ LIỆU MẪU</button></div>
      {samples && <section className="w-shell-samples" aria-label="Tình huống bảo hành mẫu"><header><div><h2>TÌNH HUỐNG BẢO HÀNH MẪU</h2><p>Mở phiếu hiện có để thử thao tác. Không khởi tạo lại dữ liệu hoặc xóa sự kiện đã ghi. Toàn bộ dữ liệu chỉ tồn tại trong phiên mock.</p></div><button type="button" className="w-shell-button" onClick={() => setSamples(false)}>ĐÓNG</button></header><div>{mockWarrantyData.filter(item => item.id >= 'BH-101' && item.id <= 'BH-114').map(item => <article key={item.id}><strong>{item.id}</strong><WarrantyBadge>{statusLabels[item.status]}</WarrantyBadge><p>{item.productName} · {item.productVariant}</p><p className="w-shell-note">Hiện tại: {statusLabels[item.status]}</p><p>{item.receptionReason}</p><button type="button" className="w-shell-button" aria-label={`Mở phiếu mẫu ${item.id}`} onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>XEM PHIẾU</button></article>)}</div></section>}
      <div className="w-shell-filter-primary">
        <label className="w-shell-search"><Search size={16} /><input aria-label="Tìm phiếu bảo hành" placeholder="Tìm mã phiếu / serial / mã theo dõi / tên / SĐT..." value={filters.search} onChange={event => update('search', event.target.value)} /></label>
        <FilterDropdown aria-label="Trạng thái xử lý" value={filters.status} onChange={event => update('status', event.target.value)} selectedDark><option value="">Trạng thái xử lý — Tất cả</option>{Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</FilterDropdown>
        <label className="w-shell-date">TỪ NGÀY<input aria-label="TỪ NGÀY" type="date" value={filters.fromDate} onChange={event => update('fromDate', event.target.value)} /></label>
        <label className="w-shell-date">ĐẾN NGÀY<input aria-label="ĐẾN NGÀY" type="date" value={filters.toDate} onChange={event => update('toDate', event.target.value)} /></label>
        <button type="button" className="w-shell-button" onClick={() => { setFilters({ ...emptyFilters }); setPage(1); }}>XÓA BỘ LỌC</button>
        <button type="button" className={`w-shell-button ${advanced ? 'w-shell-button--black' : ''}`} aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}><SlidersHorizontal size={14} /> BỘ LỌC KHÁC</button>
      </div>
      {advanced && <div className="w-shell-filter-advanced">
        {[[ 'BÁO GIÁ', 'quoteStatus', quoteStatuses ], [ 'THANH TOÁN', 'paymentStatus', paymentStatuses ], [ 'HOÀN TIỀN', 'refundStatus', refundStatuses ]].map(([label, field, options]) => <label key={field}>{label}<FilterDropdown aria-label={label} value={filters[field]} onChange={event => update(field, event.target.value)} selectedDark><option value="">Tất cả</option>{options.map(value => <option key={value}>{value}</option>)}</FilterDropdown></label>)}
      </div>}
      {invalidDates && <p className="w-shell-error" role="alert">Từ ngày phải nhỏ hơn hoặc bằng đến ngày.</p>}
    </section>
    <div className="w-shell-content admin-list-body"><section className="w-shell-list-frame admin-list-frame">
      <div className="w-shell-table-scroll admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng danh sách"><table className="w-shell-list-table admin-data-table">
        <thead><tr>{['MÃ PHIẾU / ĐƠN HÀNG', 'KHÁCH HÀNG', 'THIẾT BỊ', 'TRẠNG THÁI XỬ LÝ', 'NGÀY TIẾP NHẬN', 'CẬP NHẬT CUỐI', 'THAO TÁC'].map(title => <th key={title}>{title}</th>)}</tr></thead>
        <tbody>{visible.map(item => <tr key={item.id}>
          <td><button type="button" className="w-shell-ticket-link" onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>{item.id}</button><small>{item.orderId || '—'}</small></td>
          <td><strong>{item.customerName || '—'}</strong><small>{item.customerPhone || '—'}</small></td>
          <td><strong>{item.productName}</strong><span>{item.serial || '—'}</span>{item.trackingCode && <small>Mã theo dõi: {item.trackingCode}</small>}</td>
          <td><WarrantyBadge>{statusLabels[item.status] || item.status}</WarrantyBadge>{attention(item) && <small>{attention(item)}</small>}</td>
          <td>{date(item.created)}</td><td>{date(item.updated)}</td>
          <td><button type="button" className="w-shell-button" aria-label={`Xem chi tiết ${item.id}`} onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>XEM CHI TIẾT</button></td>
        </tr>)}{!visible.length && <tr><td colSpan={7} className="w-shell-empty">Không tìm thấy phiếu bảo hành phù hợp.</td></tr>}</tbody>
      </table></div>
      <footer className="w-shell-list-footer admin-table-footer"><div>Hiển thị {items.length ? `${start + 1}–${start + visible.length}` : '0'} / tổng {items.length}<small>—: chưa có thông tin.</small></div><div className="w-shell-pager"><select aria-label="Số phiếu mỗi trang" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} / trang</option>)}</select><TablePagination totalItems={items.length} pageSize={pageSize} currentPage={currentPage} onPageChange={setPage} showSummary={false} idPrefix="warranty" /></div></footer>
    </section></div>
  </div>;
}
