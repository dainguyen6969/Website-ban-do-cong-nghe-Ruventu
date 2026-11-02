import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus, ArrowRight, RefreshCw } from 'lucide-react';
import { statusLabels, quoteLabels, paymentLabels, refundLabels, quickFilters, displayDate } from '../data/warrantyContract';
import { getWarrantyList, warrantyError } from '../api/warrantyApi';
import { WarrantyBadge } from '../components/WarrantyShell';
import FilterDropdown from '../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import '../styles/warrantyShell.css';

const emptyFilters = { search: '', status: '', quick: 'TẤT CẢ', quoteStatus: '', paymentStatus: '', refundStatus: '', fromDate: '', toDate: '' };

const attention = item => [
  item.trang_thai_bao_gia === 'CHO_PHAN_HOI' && 'Chờ phản hồi báo giá',
  ['CHUA_THANH_TOAN', 'THANH_TOAN_MOT_PHAN'].includes(item.trang_thai_thanh_toan) && 'Cần đối chiếu khoản thu',
  Number(item.con_phai_hoan) > 0 && 'Chờ hoàn tiền',
  item.doi_soat_ncc_con_mo && 'Còn đối soát NCC',
].filter(Boolean).join(' · ');

export default function DanhSachBaoHanh() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, status: statusLabels[params.get('trang_thai')] ? params.get('trang_thai') : '' }));
  const [advanced, setAdvanced] = useState(false);
  const [result, setResult] = useState({ items: [], pagination: { total_elements: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const invalidDates = filters.fromDate && filters.toDate && filters.fromDate > filters.toDate;
  const items = result.items;
  const total = result.pagination.total_elements;
  const currentPage = page;
  const start = (currentPage - 1) * pageSize;
  const visible = items;
  useEffect(() => {
    const controller = new AbortController();
    if (invalidDates) { setResult({ items: [], pagination: { total_elements: 0 } }); setLoading(false); return () => controller.abort(); }
    setLoading(true); setError(''); setResult({ items: [], pagination: { total_elements: 0 } });
    const timer = setTimeout(() => getWarrantyList(filters, page, pageSize, controller.signal).then(data => {
      if (!controller.signal.aborted) { setResult(data); if (page > 1 && !data.items.length) setPage(1); }
    }).catch(cause => { if (!controller.signal.aborted) setError(warrantyError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, page, pageSize, invalidDates, reload]);
  const update = (field, value) => { setFilters(current => ({ ...current, [field]: value, ...(field === 'status' ? { quick: 'TẤT CẢ' } : field === 'quick' ? { status: '' } : {}) })); setPage(1); };
  const date = displayDate;

  return <div className="w-shell warranty-list">
    <header className="w-shell-hero">
      <div><div className="w-shell-title-row"><h1>DANH SÁCH PHIẾU BẢO HÀNH</h1></div><p>Tiếp nhận → Kiểm tra → Xử lý → Trả khách</p></div>
      <button type="button" className="w-shell-button w-shell-button--red" onClick={() => navigate('/admin/bao-hanh/tao-moi')}><Plus size={18} /> Tiếp nhận bảo hành mới</button>
    </header>
    {location.state?.createdTicketId && <p className="w-intake-message" role="status">Đã tạo phiếu {location.state.createdTicketId} thành công.</p>}
    <section className="w-shell-toolbar" aria-label="Bộ lọc phiếu bảo hành">
      <div className="w-shell-quick" role="group" aria-label="Lọc nhanh phiếu bảo hành">{Object.keys(quickFilters).map(label => <button type="button" className="w-shell-button" key={label} aria-pressed={filters.quick === label} onClick={() => update('quick', label)}>{label.charAt(0) + label.slice(1).toLocaleLowerCase('vi')}</button>)}<button type="button" className="w-shell-button" onClick={() => setReload(value => value + 1)}><RefreshCw size={14} /> Tải lại</button></div>

      <div className="w-shell-filter-primary">
        <label className="w-shell-search"><Search size={16} /><input aria-label="Tìm phiếu bảo hành" placeholder="Tìm mã phiếu / serial / mã theo dõi / tên / SĐT..." value={filters.search} onChange={event => update('search', event.target.value)} /></label>
        <FilterDropdown aria-label="Trạng thái xử lý" value={filters.status} onChange={event => update('status', event.target.value)}><option value="">Trạng thái — Tất cả</option>{Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</FilterDropdown>
        <button type="button" className={`w-shell-button ${advanced ? 'w-shell-button--black' : ''}`} aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}><SlidersHorizontal size={14} /> Bộ lọc{[filters.fromDate, filters.toDate, filters.quoteStatus, filters.paymentStatus, filters.refundStatus].filter(Boolean).length > 0 && ' · Đang áp dụng'}</button>
        <button type="button" className="w-shell-button" onClick={() => { setFilters({ ...emptyFilters }); setPage(1); }}>Xóa lọc</button>
      </div>
      {advanced && <div className="w-shell-filter-advanced">
        <label className="w-shell-date">Từ ngày<input aria-label="TỪ NGÀY" type="date" value={filters.fromDate} onChange={event => update('fromDate', event.target.value)} /></label>
        <label className="w-shell-date">Đến ngày<input aria-label="ĐẾN NGÀY" type="date" value={filters.toDate} onChange={event => update('toDate', event.target.value)} /></label>
        {[[ 'BÁO GIÁ', 'quoteStatus', quoteLabels ], [ 'THANH TOÁN', 'paymentStatus', paymentLabels ], [ 'HOÀN TIỀN', 'refundStatus', refundLabels ]].map(([label, field, options]) => <label key={field}>{label}<FilterDropdown aria-label={label} value={filters[field]} onChange={event => update(field, event.target.value)} selectedDark><option value="">Tất cả</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</FilterDropdown></label>)}
      </div>}
      {invalidDates && <p className="w-shell-error" role="alert">Từ ngày phải nhỏ hơn hoặc bằng đến ngày.</p>}
    </section>
    {error && <p className="w-shell-error" role="alert">{error}</p>}<div className="w-shell-content"><section className="w-shell-list-frame">
      <div className="w-list-count">{loading ? 'Đang tải…' : <><strong>{total}</strong> phiếu bảo hành</>}</div>
      <div className="w-shell-table-scroll admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng danh sách"><table className="w-shell-list-table admin-data-table">
        <colgroup><col style={{ width: '12%' }} /><col style={{ width: '17%' }} /><col style={{ width: '28%' }} /><col style={{ width: '16%' }} /><col style={{ width: '17%' }} /><col style={{ width: '10%' }} /></colgroup>
        <thead><tr>{['PHIẾU / ĐƠN HÀNG', 'KHÁCH HÀNG', 'THIẾT BỊ', 'TRẠNG THÁI', 'THỜI GIAN', 'THAO TÁC'].map(title => <th key={title}>{title}</th>)}</tr></thead>
        <tbody>{loading && <tr><td colSpan={6} role="status">Đang tải phiếu bảo hành...</td></tr>}{!loading && visible.map(item => <tr key={item.id}>
          <td><button type="button" className="w-shell-ticket-link" onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>{item.ma_phieu}</button><small>{item.ma_don_hang || '—'}</small></td>
          <td><strong>{item.ten_nguoi_lien_he || '—'}</strong><small>{item.sdt_nguoi_lien_he || '—'}</small></td>
          <td><strong className="w-product-name" title={item.ten_san_pham}>{item.ten_san_pham}</strong><span className="w-list-serial">{item.so_serial || item.ma_theo_doi || '—'}</span></td>
          <td><WarrantyBadge>{statusLabels[item.trang_thai_xu_ly] || item.trang_thai_xu_ly}</WarrantyBadge>{attention(item) && <small className="w-ticket-attention">{attention(item)}</small>}</td>
          <td><span>{date(item.ngay_tiep_nhan)}</span><small>Cập nhật: {date(item.ngay_cap_nhat)}</small></td>
          <td><button type="button" className="w-shell-button" aria-label={`Xem chi tiết ${item.id}`} onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>Mở phiếu<ArrowRight size={15} /></button></td>
        </tr>)}{!loading && !error && !visible.length && <tr><td colSpan={6} className="w-shell-empty">Không tìm thấy phiếu bảo hành phù hợp.</td></tr>}</tbody>
      </table></div>
      <footer className="w-shell-list-footer admin-table-footer"><div>Hiển thị {items.length ? `${start + 1}–${start + visible.length}` : '0'} / tổng {total}</div><div className="w-shell-pager"><select aria-label="Số phiếu mỗi trang" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} / trang</option>)}</select><TablePagination totalItems={total} pageSize={pageSize} currentPage={currentPage} onPageChange={setPage} showSummary={false} idPrefix="warranty" /></div></footer>
    </section></div>
  </div>;
}
