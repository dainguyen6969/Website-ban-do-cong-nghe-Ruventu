// Admin inventory screen: DanhSachSerial.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineUpload } from 'react-icons/hi';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import { mockSerials, SERIAL_STATUS_META } from '../../../../data/mockSerials';
import './SerialPages.css';

const PAGE_SIZE = 10;
const statusOptions = ['Tất cả trạng thái', 'Đã bán', 'Trong kho', 'Đang bảo hành', 'Lỗi'];

function escapeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function StatusBadge({ status }) {
  const meta = SERIAL_STATUS_META[status];
  return <span className={`serial-status serial-status--${meta.key}`}><span aria-hidden="true" />{status}</span>;
}

export default function DanhSachSerial() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(statusOptions[0]);
  const [version, setVersion] = useState('Tất cả phiên bản');
  const [currentPage, setCurrentPage] = useState(1);

  const versions = useMemo(() => ['Tất cả phiên bản', ...new Set(mockSerials.map((item) => item.version))], []);
  const counts = useMemo(() => Object.fromEntries(['Trong kho', 'Đã bán', 'Đang bảo hành', 'Lỗi'].map((name) => [name, mockSerials.filter((item) => item.status === name).length])), []);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return mockSerials.filter((item) => {
      const matchesSearch = !query || [item.serial, item.barcode, item.sku, item.version].some((value) => value.toLocaleLowerCase('vi').includes(query));
      return matchesSearch && (status === statusOptions[0] || item.status === status) && (version === 'Tất cả phiên bản' || item.version === version);
    });
  }, [search, status, version]);
  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setFilter = (setter) => (event) => { setter(event.target.value); setCurrentPage(1); };
  const openDetail = (id) => navigate(`/kho-hang/danh-sach-serial/${encodeURIComponent(id)}`);
  const exportExcel = () => {
    const headers = ['Phiên bản sản phẩm', 'Mã vạch/SKU', 'Số Serial', 'Trạng thái', 'Ngày kích hoạt', 'Hạn bảo hành'];
    const data = filtered.map((item) => [item.version, `${item.barcode} / ${item.sku}`, item.serial, item.status, item.activatedAt, item.warrantyUntil]);
    const csv = `\uFEFF${[headers, ...data].map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'danh-sach-serial.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="serial-page" role="main">
      <div className="serial-page__inner">
        <nav className="serial-secondary-breadcrumb" aria-label="Breadcrumb nội dung">
          <span>Sản phẩm</span><span>›</span><span>Quản lý kho</span><span>›</span><strong>Danh sách Serial</strong>
        </nav>

        <div className="serial-heading-row">
          <h1>DANH SÁCH SERIAL</h1>
          <div className="serial-stats" aria-label="Thống kê serial">
            {['Trong kho', 'Đã bán', 'Đang bảo hành', 'Lỗi'].map((name) => (
              <div className={`serial-stat serial-stat--${SERIAL_STATUS_META[name].key}`} key={name}>
                <span className="serial-stat__square" aria-hidden="true" />
                <strong>{counts[name]}</strong><span>{name.toLocaleUpperCase('vi')}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="serial-toolbar" aria-label="Tìm kiếm và lọc serial">
          <label className="serial-search">
            <HiOutlineSearch size={18} aria-hidden="true" />
            <span className="sr-only">Tìm serial</span>
            <input type="search" value={search} onChange={setFilter(setSearch)} placeholder="Tìm serial / mã vạch / phiên bản..." />
          </label>
          <select aria-label="Lọc trạng thái" value={status} onChange={setFilter(setStatus)}>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select className="serial-version-select" aria-label="Lọc phiên bản" value={version} onChange={setFilter(setVersion)}>
            {versions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button type="button" className="serial-export" onClick={exportExcel}><HiOutlineUpload size={17} /> XUẤT EXCEL</button>
        </section>

        <div className="serial-table-shell">
          <table className="serial-table">
            <thead><tr><th>PHIÊN BẢN SẢN PHẨM</th><th>MÃ VẠCH/SKU</th><th>SỐ SERIAL</th><th>TRẠNG THÁI</th><th>NGÀY KÍCH HOẠT</th><th>HẠN BẢO HÀNH</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td className="serial-empty" colSpan="6">Không tìm thấy Serial phù hợp.</td></tr> : rows.map((item) => (
                <tr key={item.id} className={item.status === 'Lỗi' ? 'serial-table__row--error' : ''} onClick={() => openDetail(item.id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter') openDetail(item.id); }}>
                  <td><strong className="serial-product-name">{item.version}</strong><small>{item.sku}</small><button type="button" className="serial-view" onClick={(event) => { event.stopPropagation(); openDetail(item.id); }}>XEM CHI TIẾT</button></td>
                  <td><span className="serial-barcode">{item.barcode}</span><small>{item.sku}</small></td>
                  <td><strong className="serial-code">{item.serial}</strong></td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.activatedAt}</td><td>{item.warrantyUntil}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination totalItems={filtered.length} pageSize={PAGE_SIZE} currentPage={safePage} onPageChange={setCurrentPage} idPrefix="serials" />
        </div>
      </div>
    </main>
  );
}

