// Admin inventory screen: KiemHang.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { getStockChecks } from '../../../../data/mockStockChecks';
import { subscribeToAdminSlice } from '../../../../sync/adminSync';
import './KiemHang.css';

const PAGE_SIZE = 10;
const initialFilters = { query: '', warehouse: '', status: '', checker: '', fromDate: '', toDate: '' };

const formatDate = (value, withTime = false) => {
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}${withTime && time ? ` ${time}` : ''}`;
};

export default function KiemHang() {
  const navigate = useNavigate();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [stockChecks, setStockChecks] = useState(() => getStockChecks());
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);

  useEffect(() => subscribeToAdminSlice('stock-checks', () => setStockChecks(getStockChecks())), []);

  const updateDraft = (field) => (event) => setDraftFilters((current) => ({ ...current, [field]: event.target.value }));
  const applyFilters = () => { setAppliedFilters({ ...draftFilters }); setPage(1); };

  const filteredChecks = useMemo(() => {
    const query = appliedFilters.query.trim().toLocaleLowerCase('vi');
    return stockChecks.filter((item) => {
      const searchableFields = [item.id, item.productName, item.variant, item.sku, item.barcode];
      const matchesQuery = !query || searchableFields.some((value) => value.toLocaleLowerCase('vi').includes(query));
      const matchesWarehouse = !appliedFilters.warehouse || item.warehouse === appliedFilters.warehouse;
      const matchesStatus = !appliedFilters.status || item.status === appliedFilters.status;
      const checkDate = item.checkedAt.slice(0, 10);
      const matchesFrom = !appliedFilters.fromDate || checkDate >= appliedFilters.fromDate;
      const matchesTo = !appliedFilters.toDate || checkDate <= appliedFilters.toDate;
      return matchesQuery && matchesWarehouse && matchesStatus && matchesFrom && matchesTo;
    });
  }, [appliedFilters, stockChecks]);

  const totalPages = Math.max(1, Math.ceil(filteredChecks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleChecks = filteredChecks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main className="stock-check-page" role="main">
      <header className="stock-check-heading">
        <div><p>KIỂM HÀNG</p><h1>DANH SÁCH PHIẾU KIỂM HÀNG</h1></div>
        <button type="button" className="stock-check-button stock-check-button--primary" onClick={() => navigate('/kho-hang/kiem-hang/tao-moi')}><HiOutlinePlus aria-hidden="true" /> TẠO PHIẾU KIỂM HÀNG</button>
      </header>

      <section className="stock-check-filters" aria-label="Bộ lọc phiếu kiểm hàng">
        <div className="stock-check-toolbar">
          <label className="stock-check-search"><HiOutlineSearch aria-hidden="true" /><span className="sr-only">Tìm phiếu kiểm hàng</span><input type="search" value={draftFilters.query} onChange={updateDraft('query')} placeholder="Tìm mã phiếu/sản phẩm/phiên bản/mã vạch..." /></label>
          <select aria-label="Kho cửa hàng" value={draftFilters.warehouse} onChange={updateDraft('warehouse')}><option value="">KHO CỬA HÀNG</option><option>Kho Hà Nội</option><option>Kho HCM</option><option>Kho Đà Nẵng</option></select>
          <select aria-label="Trạng thái" value={draftFilters.status} onChange={updateDraft('status')}><option value="">TRẠNG THÁI</option><option>Đang kiểm</option><option>Đã cân bằng</option><option>Đã hủy</option></select>
          <button type="button" className={`stock-check-button stock-check-filter-toggle ${showMoreFilters ? 'is-active' : ''}`} aria-expanded={showMoreFilters} aria-controls="stock-check-extra-filters" onClick={() => setShowMoreFilters((current) => !current)}>{showMoreFilters ? <>ÍT BỘ LỌC <HiOutlineChevronUp /></> : <>BỘ LỌC <HiOutlineChevronDown /></>}</button>
          <button type="button" className="stock-check-button stock-check-button--primary" onClick={applyFilters}>ÁP DỤNG</button>
        </div>

        <div id="stock-check-extra-filters" className={`stock-check-extra-filters ${showMoreFilters ? 'is-open' : ''}`} aria-hidden={!showMoreFilters}>
          <label><span>NGƯỜI KIỂM</span><input type="text" placeholder="Tên người kiểm..." value={draftFilters.checker} onChange={updateDraft('checker')} tabIndex={showMoreFilters ? 0 : -1} /></label>
          <label><span>TỪ NGÀY</span><input type="date" value={draftFilters.fromDate} onChange={updateDraft('fromDate')} tabIndex={showMoreFilters ? 0 : -1} /></label>
          <label><span>ĐẾN NGÀY</span><input type="date" value={draftFilters.toDate} onChange={updateDraft('toDate')} tabIndex={showMoreFilters ? 0 : -1} /></label>
        </div>
      </section>

      <section className="stock-check-table-shell" aria-label="Danh sách phiếu kiểm hàng">
        <div className="stock-check-table-scroll"><table className="stock-check-table">
          <thead><tr><th>MÃ PHIẾU</th><th>SẢN PHẨM / PHIÊN BẢN</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th><th>NGÀY KIỂM HÀNG</th><th>THAO TÁC</th></tr></thead>
          <tbody>
            {visibleChecks.map((item) => {
              const cancelled = item.status === 'Đã hủy';
              const statusClass = item.status === 'Đang kiểm' ? 'checking' : item.status === 'Đã cân bằng' ? 'balanced' : 'cancelled';
              return <tr key={item.id} className={cancelled ? 'is-cancelled' : ''}>
                <td className="stock-check-code">{item.id}</td>
                <td><div className="stock-check-product"><strong>{item.productName}</strong><small>{item.sku}</small></div></td>
                <td><span className={`stock-check-status stock-check-status--${statusClass}`}>{item.status.toLocaleUpperCase('vi')}</span></td>
                <td>{formatDate(item.createdAt)}</td>
                <td><button type="button" className="stock-check-date" onClick={() => navigate(`/kho-hang/kiem-hang/${item.id}`)}>{formatDate(item.checkedAt, true)}</button></td>
                <td><button type="button" className="stock-check-detail" onClick={() => navigate(`/kho-hang/kiem-hang/${item.id}`)}>XEM CHI TIẾT</button></td>
              </tr>;
            })}
            {visibleChecks.length === 0 && <tr><td colSpan="6" className="stock-check-empty">Không tìm thấy phiếu kiểm hàng phù hợp.</td></tr>}
          </tbody>
        </table></div>
        <footer className="stock-check-footer"><span>{filteredChecks.length} phiếu · Trang {safePage}/{totalPages}</span><TablePagination totalItems={filteredChecks.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setPage} idPrefix="stock-check" /></footer>
      </section>
    </main>
  );
}
