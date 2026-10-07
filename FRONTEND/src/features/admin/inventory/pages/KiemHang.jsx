// Admin inventory screen: KiemHang.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { getInventoryCheckPage } from '../api/inventoryCheckApi';
import './KiemHang.css';

const PAGE_SIZE = 10;
const initialFilters = { keyword: '', status: '', checkerId: '', fromDate: '', toDate: '' };

const STOCK_CHECK_LABELS = {
  DANG_KIEM: 'Đang kiểm',
  DA_CAN_BANG: 'Đã cân bằng',
  DA_HUY: 'Đã hủy',
};

const formatDate = (value, withTime = false) => {
  if (!value) return '';
  const dateObj = new Date(value);
  const dateStr = dateObj.toLocaleDateString('vi-VN');
  const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return withTime ? `${dateStr} ${timeStr}` : dateStr;
};

export default function KiemHang() {
  const navigate = useNavigate();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  const [stockChecks, setStockChecks] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const abortController = new AbortController();
    const fetchChecks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getInventoryCheckPage(
          { ...appliedFilters, page, limit: PAGE_SIZE },
          abortController.signal
        );
        setStockChecks(data.items || []);
        setTotalItems(data.totalItems || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Lỗi tải danh sách phiếu kiểm hàng');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchChecks();
    return () => abortController.abort();
  }, [appliedFilters, page]);

  const updateDraft = (field) => (event) => setDraftFilters((current) => ({ ...current, [field]: event.target.value }));
  const applyFilters = () => { setAppliedFilters({ ...draftFilters }); setPage(1); };

  return (
    <main className="stock-check-page" role="main">
      <header className="stock-check-heading">
        <div><p>KIỂM HÀNG</p><h1>DANH SÁCH PHIẾU KIỂM HÀNG</h1></div>
        <button type="button" className="stock-check-button stock-check-button--primary" onClick={() => navigate('/kho-hang/kiem-hang/tao-moi')}><HiOutlinePlus aria-hidden="true" /> TẠO PHIẾU KIỂM HÀNG</button>
      </header>

      <section className="stock-check-filters" aria-label="Bộ lọc phiếu kiểm hàng">
        <div className="stock-check-toolbar">
          <label className="stock-check-search"><HiOutlineSearch aria-hidden="true" /><span className="sr-only">Tìm phiếu kiểm hàng</span><input type="search" value={draftFilters.keyword} onChange={updateDraft('keyword')} placeholder="Tìm mã phiếu..." /></label>
          <select aria-label="Trạng thái" value={draftFilters.status} onChange={updateDraft('status')}><option value="">TRẠNG THÁI</option><option value="DANG_KIEM">Đang kiểm</option><option value="DA_CAN_BANG">Đã cân bằng</option><option value="DA_HUY">Đã hủy</option></select>
          <button type="button" className={`stock-check-button stock-check-filter-toggle ${showMoreFilters ? 'is-active' : ''}`} aria-expanded={showMoreFilters} aria-controls="stock-check-extra-filters" onClick={() => setShowMoreFilters((current) => !current)}>{showMoreFilters ? <>ÍT BỘ LỌC <HiOutlineChevronUp /></> : <>BỘ LỌC <HiOutlineChevronDown /></>}</button>
          <button type="button" className="stock-check-button stock-check-button--primary" onClick={applyFilters}>ÁP DỤNG</button>
        </div>

        <div id="stock-check-extra-filters" className={`stock-check-extra-filters ${showMoreFilters ? 'is-open' : ''}`} aria-hidden={!showMoreFilters}>
          <label><span>ID NGƯỜI KIỂM</span><input type="text" placeholder="ID người kiểm..." value={draftFilters.checkerId} onChange={updateDraft('checkerId')} tabIndex={showMoreFilters ? 0 : -1} /></label>
          <label><span>TỪ NGÀY</span><input type="date" value={draftFilters.fromDate} onChange={updateDraft('fromDate')} tabIndex={showMoreFilters ? 0 : -1} /></label>
          <label><span>ĐẾN NGÀY</span><input type="date" value={draftFilters.toDate} onChange={updateDraft('toDate')} tabIndex={showMoreFilters ? 0 : -1} /></label>
        </div>
      </section>

      <section className="stock-check-table-shell" aria-label="Danh sách phiếu kiểm hàng">
        {error && <div className="stock-check-error" style={{padding: 20, color: 'red'}}>{error}</div>}
        <div className="stock-check-table-scroll"><table className="stock-check-table">
          <thead><tr><th>MÃ PHIẾU</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th><th>NGÀY CẬP NHẬT</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan="6" style={{textAlign: 'center', padding: 20}}>Đang tải...</td></tr> : stockChecks.map((item) => {
              const cancelled = item.trang_thai === 'DA_HUY';
              const statusClass = item.trang_thai === 'DANG_KIEM' ? 'checking' : item.trang_thai === 'DA_CAN_BANG' ? 'balanced' : 'cancelled';
              return <tr key={item.id} className={cancelled ? 'is-cancelled' : ''}>
                <td className="stock-check-code">{item.ma_phieu}</td>
                <td><div className="stock-check-product"><strong>{item.phien_ban?.ten_san_pham}</strong><small>{item.phien_ban?.ten_phien_ban}</small></div></td>
                <td><span className={`stock-check-status stock-check-status--${statusClass}`}>{STOCK_CHECK_LABELS[item.trang_thai]?.toLocaleUpperCase('vi')}</span></td>
                <td>{formatDate(item.ngay_tao)}</td>
                <td>{formatDate(item.ngay_cap_nhat || item.ngay_tao, true)}</td>
                <td><button type="button" className="stock-check-detail" onClick={() => navigate(`/kho-hang/kiem-hang/${item.id}`)}>XEM CHI TIẾT</button></td>
              </tr>;
            })}
            {!isLoading && stockChecks.length === 0 && <tr><td colSpan="6" className="stock-check-empty">Không tìm thấy phiếu kiểm hàng phù hợp.</td></tr>}
          </tbody>
        </table></div>
        <footer className="stock-check-footer"><span>{totalItems} phiếu · Trang {page}/{totalPages}</span><TablePagination totalItems={totalItems} pageSize={PAGE_SIZE} currentPage={page} onPageChange={setPage} idPrefix="stock-check" /></footer>
      </section>
    </main>
  );
}
