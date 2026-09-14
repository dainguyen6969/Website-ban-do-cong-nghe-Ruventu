import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDownload, HiOutlineSearch } from 'react-icons/hi';
import TablePagination from '../components/TablePagination';
import mockVersions from '../data/mockVersions';
import './QuanLyPhienBan.css';

const warehouseOptions = ['Tất cả kho', 'Kho Hà Nội', 'Kho HCM', 'Kho Đà Nẵng'];
const typeOptions = ['Tất cả', 'Phiên bản', 'Combo'];
const PAGE_SIZE = 10;

function escapeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function QuanLyPhienBan() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouse, setWarehouse] = useState('Tất cả kho');
  const [type, setType] = useState('Tất cả');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const selectAllRef = useRef(null);

  const filteredVersions = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('vi');

    return mockVersions.filter((item) => {
      const matchesSearch = !query || [item.barcode, item.sku, item.displayCode, item.displayName]
        .some((value) => value.toLocaleLowerCase('vi').includes(query));
      const matchesWarehouse = warehouse === 'Tất cả kho' || item.warehouse === warehouse;
      const matchesType = type === 'Tất cả' || item.type === type;
      return matchesSearch && matchesWarehouse && matchesType;
    });
  }, [searchTerm, warehouse, type]);

  const totalPages = Math.max(1, Math.ceil(filteredVersions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageVersions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredVersions.slice(start, start + PAGE_SIZE);
  }, [filteredVersions, safePage]);

  const negativeCount = filteredVersions.filter((item) => item.available < 0).length;
  const selectedOnPage = pageVersions.filter((item) => selectedIds.includes(item.id)).length;
  const allVisibleSelected = pageVersions.length > 0 && selectedOnPage === pageVersions.length;
  const someVisibleSelected = selectedOnPage > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !pageVersions.some((item) => item.id === id)));
      return;
    }
    setSelectedIds((current) => [...new Set([...current, ...pageVersions.map((item) => item.id)])]);
  };

  const toggleRow = (id) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((itemId) => itemId !== id)
      : [...current, id]);
  };

  const exportExcel = (selectedOnly = false) => {
    const rows = selectedOnly
      ? mockVersions.filter((item) => selectedIds.includes(item.id))
      : filteredVersions;
    const headers = ['Mã vạch', 'SKU', 'Tên hiển thị', 'Phân loại', 'Có thể bán', 'Tồn thực tế', 'Kho', 'Vị trí lưu kho'];
    const csvRows = rows.map((item) => [
      item.barcode,
      item.sku,
      item.displayName,
      item.type,
      item.available,
      item.actual,
      item.warehouse,
      item.location,
    ]);
    const csv = `\uFEFF${[headers, ...csvRows].map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = selectedOnly ? 'phien-ban-da-chon.csv' : 'toan-bo-phien-ban.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="version-page" role="main">
      <div className="version-page__inner">
        <nav className="version-breadcrumb" aria-label="Breadcrumb nội dung">
          <span>Sản phẩm</span><span aria-hidden="true">›</span>
          <span>Quản lý kho</span><span aria-hidden="true">›</span>
          <strong>Toàn bộ phiên bản</strong>
        </nav>

        <section className="version-toolbar" aria-label="Tìm kiếm và lọc phiên bản">
          <label className="version-search">
            <HiOutlineSearch size={18} aria-hidden="true" />
            <span className="sr-only">Tìm phiên bản</span>
            <input
              id="version-search"
              type="search"
              value={searchTerm}
              onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }}
              placeholder="Tìm mã vạch, SKU, tên sản phẩm..."
            />
          </label>

          <label className="version-select-wrap">
            <span className="sr-only">Lọc theo kho</span>
            <select id="warehouse-filter" value={warehouse} onChange={(event) => { setWarehouse(event.target.value); setCurrentPage(1); }}>
              {warehouseOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <label className="version-select-wrap">
            <span className="sr-only">Lọc theo phân loại</span>
            <select id="type-filter" value={type} onChange={(event) => { setType(event.target.value); setCurrentPage(1); }}>
              {typeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <button type="button" className="version-export" onClick={() => exportExcel(false)}>
            <HiOutlineDownload size={17} aria-hidden="true" />
            <span>XUẤT EXCEL</span>
          </button>
        </section>

        <aside className="version-warning" role="status">
          <span className="version-warning__marker" aria-hidden="true" />
          <strong>CẢNH BÁO ĐỒNG BỘ:</strong>
          <span>{negativeCount} mục có tồn kho &quot;Có thể bán&quot; âm — cần kiểm tra và xử lý ngay.</span>
        </aside>

        {selectedIds.length > 0 && (
          <div className="version-selection-strip">
            <strong>ĐÃ CHỌN {selectedIds.length} MỤC</strong>
            <button type="button" onClick={() => exportExcel(true)}>
              <HiOutlineDownload size={15} aria-hidden="true" />
              XUẤT EXCEL
            </button>
          </div>
        )}

        <div className="version-table-shell">
          <table className="version-table">
            <thead>
              <tr>
                  <th className="version-table__check">
                    <input
                      ref={selectAllRef}
                      id="select-all-versions"
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Chọn tất cả phiên bản trên trang hiện tại"
                    />
                  </th>
                  <th>HÌNH ẢNH</th>
                  <th>MÃ HIỂN THỊ</th>
                  <th>TÊN HIỂN THỊ</th>
                  <th>PHÂN LOẠI</th>
                  <th>CÓ THỂ BÁN</th>
                  <th>TỒN THỰC TẾ</th>
                  <th>VỊ TRÍ LƯU KHO</th>
                  <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {pageVersions.length === 0 ? (
                <tr><td className="version-empty" colSpan="9">Không tìm thấy phiên bản phù hợp.</td></tr>
              ) : pageVersions.map((item) => {
                const selected = selectedIds.includes(item.id);
                const isNegative = item.available < 0;
                const hasNoBuffer = item.available === item.actual;

                return (
                  <tr key={item.id} className={`${isNegative ? 'version-table__row--negative' : ''} ${selected ? 'version-table__row--selected' : ''}`}>
                    <td className="version-table__check">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(item.id)}
                        aria-label={`Chọn ${item.displayName}`}
                      />
                    </td>
                    <td>
                      <div className="version-thumb">
                        {item.image
                          ? <img src={item.image} alt="" />
                          : <span aria-hidden="true">RU</span>}
                      </div>
                    </td>
                    <td><span className="version-code">{item.displayCode}</span></td>
                    <td>
                      <div className="version-name">{item.displayName}</div>
                      <div className="version-meta">{item.sku} · {item.warehouse}</div>
                    </td>
                    <td>
                      <span className={`version-type ${item.type === 'Combo' ? 'version-type--combo' : ''}`}>
                        {item.type.toLocaleUpperCase('vi')}
                      </span>
                    </td>
                    <td>
                      <span className={`version-available ${isNegative ? 'version-available--negative' : ''}`}>
                        {!isNegative && hasNoBuffer && <span className="version-stock-marker" aria-label="Không có tồn kho đệm" />}
                        {item.available}
                      </span>
                    </td>
                    <td><strong className="version-actual">{item.actual}</strong></td>
                    <td><span className="version-location">{item.location}</span></td>
                    <td>
                      <button
                        type="button"
                        className="version-detail"
                        onClick={() => navigate(`/kho-hang/quan-ly-phien-ban/chi-tiet/${encodeURIComponent(item.id)}`)}
                      >
                        CHI TIẾT
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <TablePagination
            totalItems={filteredVersions.length}
            pageSize={PAGE_SIZE}
            currentPage={safePage}
            onPageChange={setCurrentPage}
            idPrefix="versions"
          />
        </div>
      </div>
    </main>
  );
}
