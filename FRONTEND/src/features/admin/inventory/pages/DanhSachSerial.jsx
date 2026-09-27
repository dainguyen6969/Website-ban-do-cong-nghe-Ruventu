// Admin inventory screen: DanhSachSerial.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineUpload } from 'react-icons/hi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { getAllVersions } from '../../catalog/products/api/versionApi';
import { getSerialCounts, getSerialPage, SERIAL_STATUS_META } from '../api/serialApi';
import './SerialPages.css';

const PAGE_SIZE = 10;
const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(SERIAL_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
];

function escapeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function StatusBadge({ status }) {
  const meta = SERIAL_STATUS_META[status];
  return <span className={`serial-status serial-status--${meta.key}`}><span aria-hidden="true" />{meta.label}</span>;
}

export default function DanhSachSerial() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [serial, setSerial] = useState('');
  const [status, setStatus] = useState('');
  const [versionId, setVersionId] = useState(searchParams.get('phien_ban_id') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [versions, setVersions] = useState([]);
  const [counts, setCounts] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const comboName = searchParams.get('combo');

  useEffect(() => {
    const controller = new AbortController();
    getAllVersions('', controller.signal, false)
      .then(({ versions: items }) => setVersions(items.filter((item) => item.type === 'Phiên bản')))
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message || 'Không thể tải bộ lọc phiên bản.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getSerialCounts(controller.signal).then(setCounts)
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message || 'Không thể tải thống kê serial.'); });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getSerialPage({ keyword: search, serial, status, versionId, page: currentPage, limit: PAGE_SIZE }, controller.signal)
      .then((data) => { setRows(data.items); setTotalItems(data.totalItems); })
      .catch((cause) => { if (cause.name !== 'AbortError') setError(cause.message || 'Không thể tải danh sách serial.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, serial, status, versionId, currentPage, reloadKey]);

  const setFilter = (setter) => (event) => { setter(event.target.value); setCurrentPage(1); };
  const openDetail = (id) => navigate(`/kho-hang/danh-sach-serial/${encodeURIComponent(id)}`);
  const exportExcel = () => {
    const headers = ['Sản phẩm', 'Phiên bản', 'Mã vạch', 'Số Serial', 'Trạng thái', 'Ngày kích hoạt', 'Hạn bảo hành'];
    const data = rows.map((item) => [item.productName, item.version, item.barcode, item.serial, SERIAL_STATUS_META[item.status].label, item.activatedAt, item.warrantyUntil]);
    const csv = `\uFEFF${[headers, ...data].map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'danh-sach-serial.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="serial-page" role="main">
      <div className="serial-page__inner">
        <nav className="serial-secondary-breadcrumb" aria-label="Breadcrumb nội dung">
          <span>Sản phẩm</span><span>›</span><span>Quản lý kho</span><span>›</span><strong>Danh sách Serial</strong>
        </nav>
        <div className="serial-heading-row">
          <h1>DANH SÁCH SERIAL{comboName ? ` · ${comboName}` : ''}</h1>
          <div className="serial-stats" aria-label="Thống kê serial">
            {Object.entries(SERIAL_STATUS_META).map(([code, meta]) => (
              <div className={`serial-stat serial-stat--${meta.key}`} key={code}>
                <span className="serial-stat__square" aria-hidden="true" />
                <strong>{counts[code] || 0}</strong><span>{meta.label.toLocaleUpperCase('vi')}</span>
              </div>
            ))}
          </div>
        </div>
        <section className="serial-toolbar" aria-label="Tìm kiếm và lọc serial">
          <label className="serial-search">
            <HiOutlineSearch size={18} aria-hidden="true" />
            <span className="sr-only">Tìm sản phẩm hoặc phiên bản</span>
            <input type="search" value={search} onChange={setFilter(setSearch)} placeholder="Tìm sản phẩm / mã vạch / phiên bản..." />
          </label>
          <label className="serial-search serial-search--code">
            <span className="sr-only">Lọc theo số serial</span>
            <input type="search" value={serial} onChange={setFilter(setSerial)} placeholder="Nhập chính xác số serial..." />
          </label>
          <select aria-label="Lọc trạng thái" value={status} onChange={setFilter(setStatus)}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="serial-version-select" aria-label="Lọc phiên bản" value={versionId} onChange={setFilter(setVersionId)}>
            <option value="">Tất cả phiên bản</option>
            {versions.map((option) => <option key={option.id} value={option.id}>{option.displayName} · {option.displayCode}</option>)}
          </select>
          <button type="button" className="serial-export" onClick={exportExcel}><HiOutlineUpload size={17} /> XUẤT EXCEL</button>
        </section>
        <div className="serial-table-shell">
          <table className="serial-table">
            <thead><tr><th>PHIÊN BẢN SẢN PHẨM</th><th>MÃ VẠCH/SKU</th><th>SỐ SERIAL</th><th>TRẠNG THÁI</th><th>NGÀY KÍCH HOẠT</th><th>HẠN BẢO HÀNH</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="serial-empty" colSpan="6">Đang tải dữ liệu...</td></tr>
                : error ? <tr><td className="serial-empty" colSpan="6">{error} <button type="button" className="serial-view" onClick={() => setReloadKey((value) => value + 1)}>THỬ LẠI</button></td></tr>
                  : rows.length === 0 ? <tr><td className="serial-empty" colSpan="6">Không tìm thấy Serial phù hợp.</td></tr> : rows.map((item) => (
                    <tr key={item.id} className={item.status === 'LOI' ? 'serial-table__row--error' : ''} onClick={() => openDetail(item.id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter') openDetail(item.id); }}>
                      <td><strong className="serial-product-name">{item.productName} · {item.version}</strong><small>{item.productCode}</small><button type="button" className="serial-view" onClick={(event) => { event.stopPropagation(); openDetail(item.id); }}>XEM CHI TIẾT</button></td>
                      <td><span className="serial-barcode">{item.barcode}</span></td>
                      <td><strong className="serial-code">{item.serial}</strong></td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>{item.activatedAt}</td><td>{item.warrantyUntil}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <TablePagination totalItems={totalItems} pageSize={PAGE_SIZE} currentPage={currentPage} onPageChange={setCurrentPage} idPrefix="serials" />
        </div>
      </div>
    </main>
  );
}
