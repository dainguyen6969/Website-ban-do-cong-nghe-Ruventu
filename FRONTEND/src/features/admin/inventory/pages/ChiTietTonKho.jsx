// Admin inventory screen: ChiTietTonKho.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineHome } from 'react-icons/hi';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import useDetailTablePagination from '../../../../hooks/useDetailTablePagination';
import { getInventoryDetail } from '../../../../data/mockInventoryDetails';
import './ChiTietTonKho.css';

const transactionOptions = ['Tất cả', 'Nhập hàng', 'Xuất bán', 'Khách trả', 'Trả NCC', 'Kiểm kho'];
const warehouseOptions = ['Tất cả kho', 'Kho Hà Nội', 'Kho HCM', 'Kho Đà Nẵng'];

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function transactionClass(type) {
  if (type === 'Nhập hàng' || type === 'Khách trả') return 'is-green';
  if (type === 'Xuất bán') return 'is-blue';
  if (type === 'Trả NCC') return 'is-red';
  return 'is-neutral';
}

export default function ChiTietTonKho() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = getInventoryDetail(id);
  const [selectedVersionId, setSelectedVersionId] = useState(detail.versions[0].id);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactionType, setTransactionType] = useState('Tất cả');
  const [warehouse, setWarehouse] = useState('Tất cả kho');

  const selectedVersion = detail.versions.find((version) => version.id === selectedVersionId) || detail.versions[0];
  const filtersChanged = Boolean(fromDate || toDate || transactionType !== 'Tất cả' || warehouse !== 'Tất cả kho');

  const filteredHistory = selectedVersion.history.filter((entry) => {
    const entryDate = entry.date.slice(0, 10);
    if (fromDate && entryDate < fromDate) return false;
    if (toDate && entryDate > toDate) return false;
    if (transactionType !== 'Tất cả' && entry.transactionType !== transactionType) return false;
    if (warehouse !== 'Tất cả kho' && entry.warehouse !== warehouse) return false;
    return true;
  });
  const versionPagination = useDetailTablePagination(detail.versions);
  const allocationPagination = useDetailTablePagination(selectedVersion.allocations);
  const historyPagination = useDetailTablePagination(filteredHistory);

  const allocationTotals = selectedVersion.allocations.reduce((totals, row) => ({
    actual: totals.actual + row.actual,
    available: totals.available + row.available,
  }), { actual: 0, available: 0 });

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setTransactionType('Tất cả');
    setWarehouse('Tất cả kho');
  };

  return (
    <main className="inventory-detail-page" role="main">
      <div className="inventory-detail__inner">
        <nav className="inventory-detail__breadcrumb" aria-label="Breadcrumb nội dung">
          <span>Sản phẩm</span><span aria-hidden="true">›</span>
          <span>Quản lý kho</span><span aria-hidden="true">›</span>
          <strong>Chi tiết tồn kho</strong>
        </nav>

        <div className="inventory-detail__title-row">
          <h1>CHI TIẾT TỒN KHO &amp; THẺ KHO</h1>
          <button type="button" onClick={() => navigate('/kho-hang/quan-ly-phien-ban')}>
            <HiOutlineArrowLeft size={16} aria-hidden="true" /> QUAY LẠI
          </button>
        </div>

        <section className="inventory-card inventory-product-card">
          <header className="inventory-section-heading"><span>THÔNG TIN SẢN PHẨM</span></header>
          <div className="inventory-product-card__body">
            <div className="inventory-product-card__main">
              <div className="inventory-product-identity">
                <div className="inventory-product-image">
                  {detail.image ? <img src={detail.image} alt={detail.name} /> : <span>RU</span>}
                </div>
                <div><small>TÊN SẢN PHẨM</small><strong>{detail.name}</strong></div>
              </div>

              <dl className="inventory-product-grid">
                <div><dt>MÃ SẢN PHẨM</dt><dd>{detail.productCode}</dd></div>
                <div><dt>THƯƠNG HIỆU</dt><dd>{detail.brand}</dd></div>
                <div><dt>DANH MỤC</dt><dd>{detail.category}</dd></div>
                <div><dt>ĐƠN VỊ TÍNH</dt><dd>{detail.unit}</dd></div>
                <div><dt>LOẠI SẢN PHẨM</dt><dd>{detail.productType}</dd></div>
                <div><dt>TRẠNG THÁI</dt><dd className="is-status">{detail.status}</dd></div>
              </dl>
            </div>

            <dl className="inventory-stat-stack">
              <div><dd>{detail.stats.actual}</dd><dt>TỒN THỰC TẾ</dt></div>
              <div className={detail.stats.available < 0 ? 'is-negative' : 'is-available'}><dd>{detail.stats.available}</dd><dt>KHẢ DỤNG</dt></div>
              <div><dd>{detail.stats.versionCount}</dd><dt>SỐ PHIÊN BẢN</dt></div>
            </dl>
          </div>
        </section>

        <section className="inventory-card">
          <header className="inventory-section-heading">
            <span>PHIÊN BẢN &amp; TỒN KHO</span><small>— chọn phiên bản để lọc thẻ kho</small>
          </header>
          <div className="inventory-table-wrap">
            <table className="inventory-table inventory-version-table">
              <thead><tr><th>TÊN PHIÊN BẢN</th><th>SKU</th><th>TỒN THỰC TẾ</th><th>TỒN KHẢ DỤNG</th><th>TRẠNG THÁI</th></tr></thead>
              <tbody>
                {versionPagination.visibleItems.map((version) => {
                  const active = version.id === selectedVersion.id;
                  const inStock = version.available > 0;
                  return (
                    <tr key={version.id} className={active ? 'is-active' : ''} onClick={() => setSelectedVersionId(version.id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedVersionId(version.id); }}>
                      <td><strong>{version.name}</strong>{active && <span className="inventory-viewing-badge">ĐANG XEM</span>}</td>
                      <td><span className="inventory-code-badge">{version.sku}</span></td>
                      <td><strong>{version.actual}</strong></td>
                      <td><strong className={inStock ? 'inventory-number--green' : 'inventory-number--red'}>{version.available}</strong></td>
                      <td><span className={`inventory-status-badge ${inStock ? 'is-green' : 'is-red'}`}>{inStock ? 'Còn hàng' : 'Hết hàng'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DetailTablePagination totalItems={detail.versions.length} currentPage={versionPagination.currentPage} onPageChange={versionPagination.onPageChange} idPrefix="inventory-versions" />
        </section>

        <section className="inventory-card">
          <header className="inventory-section-heading"><span>PHÂN BỔ TỒN KHO</span><small>— {selectedVersion.name}</small></header>
          <div className="inventory-table-wrap">
            <table className="inventory-table inventory-allocation-table">
              <thead><tr><th>KHO HÀNG</th><th>VỊ TRÍ LƯU KHO</th><th>TỒN THỰC TẾ</th><th>TỒN KHẢ DỤNG</th><th>TRẠNG THÁI</th></tr></thead>
              <tbody>
                {selectedVersion.allocations.length > 0 ? allocationPagination.visibleItems.map((row) => (
                  <tr key={row.code}>
                    <td><span className="inventory-warehouse"><HiOutlineHome size={15} aria-hidden="true" /><strong>{row.name} ({row.code})</strong></span></td>
                    <td><span className="inventory-location-badge">{row.location}</span></td>
                    <td><strong>{row.actual}</strong></td>
                    <td><strong className="inventory-number--green">{row.available}</strong></td>
                    <td><span className={`inventory-status-badge ${row.available > 0 ? 'is-green' : 'is-red'}`}>{row.available > 0 ? 'CÒN HÀNG' : 'HẾT HÀNG'}</span></td>
                  </tr>
                )) : <tr><td colSpan="5" className="inventory-empty">Chưa có tồn kho tại kho hàng nào.</td></tr>}
              </tbody>
              <tfoot><tr><td colSpan="2">TỔNG CỘNG</td><td>{allocationTotals.actual}</td><td className="inventory-number--green">{allocationTotals.available}</td><td /></tr></tfoot>
            </table>
          </div>
          <DetailTablePagination totalItems={selectedVersion.allocations.length} currentPage={allocationPagination.currentPage} onPageChange={allocationPagination.onPageChange} idPrefix="inventory-allocations" />
        </section>

        <section className="inventory-card">
          <header className="inventory-section-heading">
            <span>THẺ KHO - LỊCH SỬ BIẾN ĐỘNG</span><small>— {selectedVersion.name} · {filteredHistory.length} bản ghi</small>
          </header>
          <div className="inventory-history-filters">
            <label><span className="sr-only">Từ ngày</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
            <span className="inventory-date-separator" aria-hidden="true">—</span>
            <label><span className="sr-only">Đến ngày</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
            <label><span className="sr-only">Loại giao dịch</span><select value={transactionType} onChange={(event) => setTransactionType(event.target.value)}>{transactionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span className="sr-only">Kho hàng</span><select value={warehouse} onChange={(event) => setWarehouse(event.target.value)}>{warehouseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            {filtersChanged && <button type="button" className="inventory-reset" onClick={resetFilters}>ĐẶT LẠI</button>}
            <strong className="inventory-history-count">{filteredHistory.length} bản ghi</strong>
          </div>
          <div className="inventory-table-wrap">
            <table className="inventory-table inventory-history-table">
              <thead><tr><th>THỜI GIAN</th><th>LOẠI GIAO DỊCH</th><th>MÃ CHỨNG TỪ</th><th>NGƯỜI THỰC HIỆN</th><th>SỐ LƯỢNG THAY ĐỔI</th><th>TỒN CUỐI</th><th>GHI CHÚ</th></tr></thead>
              <tbody>
                {filteredHistory.length > 0 ? historyPagination.visibleItems.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.date)}</td>
                    <td><span className={`inventory-transaction-badge ${transactionClass(entry.transactionType)}`}>{entry.transactionType.toLocaleUpperCase('vi')}</span></td>
                    <td><button type="button" className="inventory-link">{entry.documentCode}</button></td>
                    <td>{entry.user}</td>
                    <td><strong className={entry.change > 0 ? 'inventory-number--green' : entry.change < 0 ? 'inventory-number--red' : 'inventory-number--gray'}>{entry.change > 0 ? `+${entry.change}` : entry.change < 0 ? entry.change : '±0'}</strong></td>
                    <td><strong>{entry.closing}</strong></td>
                    <td className={entry.note.startsWith('Trả ') || entry.note.startsWith('Đối chiếu') ? 'inventory-note--link' : ''}>{entry.note}</td>
                  </tr>
                )) : <tr><td colSpan="7" className="inventory-empty">Không có bản ghi phù hợp với bộ lọc.</td></tr>}
              </tbody>
            </table>
          </div>
          <DetailTablePagination totalItems={filteredHistory.length} currentPage={historyPagination.currentPage} onPageChange={historyPagination.onPageChange} idPrefix="inventory-history" />
        </section>
      </div>
    </main>
  );
}
