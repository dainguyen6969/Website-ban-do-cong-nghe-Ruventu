// Product list screen: real IntelliJ API data with server-side search, filters, and pagination.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUpload,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlinePencilAlt,
  HiOutlineTrash,
} from 'react-icons/hi';
import FilterDropdown from '../../../../../shared/components/ui/FilterDropdown';
import TablePagination from '../../../../../shared/components/ui/TablePagination';
import { getAllBrands } from '../../brands/api/brandApi';
import { getAllCategories } from '../../categories/api/categoryApi';
import { getProductPage } from '../api/productApi';
import './DanhSachSanPham.css';

// Exact category options in order specified
const categoryOptions = [
  'Danh mục',
  'CPU',
  'VGA',
  'Mainboard',
  'RAM',
  'SSD',
  'PSU',
  'Màn hình',
  'Tản nhiệt',
  'Case',
  'PC Build',
  'Phụ kiện',
];

const brandOptions = [
  'Thương hiệu',
  'Intel',
  'AMD',
  'ASUS',
  'MSI',
  'Gigabyte',
  'Corsair',
  'Kingston',
  'Samsung',
  'WD',
  'EVGA',
  'LG',
  'Lian Li',
];

const productTypeOptions = [
  'Loại sản phẩm',
  'Sản phẩm đơn',
  'Theo bộ (Combo)',
];

const statusOptions = [
  'Trạng thái bán',
  'Đang kinh doanh',
  'Ngừng kinh doanh',
];

const tableColumns = [
  { id: 'checkbox', label: '', isCheckbox: true },
  { id: 'hinh-anh', label: 'HÌNH ẢNH' },
  { id: 'ma-ten-san-pham', label: 'MÃ & TÊN SẢN PHẨM' },
  { id: 'phan-loai', label: 'PHÂN LOẠI' },
  { id: 'thuong-hieu', label: 'THƯƠNG HIỆU' },
  { id: 'ton-kho', label: 'TỒN KHO' },
  { id: 'trang-thai-ban', label: 'TRẠNG THÁI BÁN' },
  { id: 'thao-tac', label: 'THAO TÁC' },
];

const PAGE_SIZE = 10;

export default function DanhSachSanPham() {
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState([]);
  const [categoryLookup, setCategoryLookup] = useState([]);
  const [brandLookup, setBrandLookup] = useState([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Danh mục');
  const [selectedBrand, setSelectedBrand] = useState('Thương hiệu');
  const [selectedProductType, setSelectedProductType] = useState('Loại sản phẩm');
  const [selectedStatus, setSelectedStatus] = useState('Trạng thái bán');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Check active filters against defaults
  const isCategoryActive = selectedCategory !== 'Danh mục';
  const isBrandActive = selectedBrand !== 'Thương hiệu';
  const isProductTypeActive = selectedProductType !== 'Loại sản phẩm';
  const isStatusActive = selectedStatus !== 'Trạng thái bán';

  const activeFilterCount =
    (isCategoryActive ? 1 : 0) +
    (isBrandActive ? 1 : 0) +
    (isProductTypeActive ? 1 : 0) +
    (isStatusActive ? 1 : 0);

  const isFiltered = activeFilterCount > 0;

  const handleClearFilters = () => {
    setSelectedCategory('Danh mục');
    setSelectedBrand('Thương hiệu');
    setSelectedProductType('Loại sản phẩm');
    setSelectedStatus('Trạng thái bán');
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const handleBrandChange = (val) => {
    setSelectedBrand(val);
    setCurrentPage(1);
  };

  const handleProductTypeChange = (val) => {
    setSelectedProductType(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setSelectedStatus(val);
    setCurrentPage(1);
  };

  const categoryId = categoryLookup.find((item) => item.name === selectedCategory)?.id;
  const brandId = brandLookup.find((item) => item.name === selectedBrand)?.id;
  const productType = selectedProductType === 'Sản phẩm đơn'
    ? 'DON'
    : selectedProductType === 'Theo bộ (Combo)' ? 'BO_PC' : '';
  const status = selectedStatus === 'Đang kinh doanh'
    ? 1
    : selectedStatus === 'Ngừng kinh doanh' ? 0 : null;

  // Load lookup IDs without replacing the existing visible dropdown labels or options.
  useEffect(() => {
    let active = true;
    Promise.all([getAllCategories(), getAllBrands()])
      .then(([categories, brands]) => {
        if (active) { setCategoryLookup(categories); setBrandLookup(brands); }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Server-side pagination/search/filtering keeps counts and page boundaries authoritative.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getProductPage({
          keyword: searchTerm,
          categoryId: isCategoryActive ? categoryId : null,
          brandId: isBrandActive ? brandId : null,
          productType,
          status,
          page: currentPage,
          limit: PAGE_SIZE,
        }, controller.signal);
        setProductsList(result.items);
        setTotalFilteredCount(result.totalItems);
        setTotalPages(result.totalPages);
      } catch (requestError) {
        if (requestError?.name !== 'AbortError') {
          setProductsList([]);
          setTotalFilteredCount(0);
          setTotalPages(0);
          setError(requestError?.message || 'Không thể tải danh sách sản phẩm.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchTerm, categoryId, brandId, productType, status, currentPage, reloadKey, isCategoryActive, isBrandActive]);

  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const currentProducts = productsList;

  // Checkbox handling
  const allCurrentPageSelected =
    currentProducts.length > 0 &&
    currentProducts.every((p) => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentProducts.some((p) => p.id === id)));
    } else {
      const currentIds = currentProducts.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <main className="product-page" role="main">
      {/* 2. Action button band */}
      <div className="product-actions-band">
        <div className="product-actions-band__content">
          <button className="btn-product-band btn-product-band--white" id="btn-import-excel">
            <HiOutlineUpload size={16} />
            <span>NHẬP EXCEL</span>
          </button>
          <button 
            className="btn-product-band btn-product-band--red" 
            id="btn-add-product-band"
            onClick={() => navigate('/admin/san-pham/them-san-pham')}
          >
            <HiOutlinePlus size={16} />
            <span>THÊM SẢN PHẨM</span>
          </button>
        </div>
      </div>

      {/* 3. Breadcrumb row (SẢN PHẨM › DANH SÁCH SẢN PHẨM) */}
      <div className="product-breadcrumb-row">
        <nav className="product-breadcrumb" aria-label="Breadcrumb nội dung">
          <span className="product-breadcrumb__item product-breadcrumb__item--muted">
            SẢN PHẨM
          </span>
          <span className="product-breadcrumb__sep" aria-hidden="true">›</span>
          <span className="product-breadcrumb__item product-breadcrumb__item--current">
            DANH SÁCH SẢN PHẨM
          </span>
        </nav>
      </div>

      {/* 5. Full-width thin light-gray divider line between breadcrumb and search/filter row */}
      <div className="product-breadcrumb-divider" aria-hidden="true" />

      {/* 4. Filter row: search input + "Bộ lọc" toggle button */}
      <div className="product-filter-row">
        <div className="product-filter-search-group">
          {/* Search input with thin light-gray border */}
          <div className="product-search">
            <HiOutlineSearch size={16} className="product-search__icon" />
            <input
              type="text"
              className="product-search__input"
              placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
              value={searchTerm}
              onChange={handleSearchChange}
              id="search-products"
            />
          </div>

          {/* "Bộ lọc" toggle button */}
          <button
            type="button"
            className={`btn-product-filter-toggle ${isFilterPanelOpen ? 'btn-product-filter-toggle--open' : ''} ${activeFilterCount > 0 ? 'btn-product-filter-toggle--has-filters' : ''}`}
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            id="btn-filter-utility"
            aria-expanded={isFilterPanelOpen}
          >
            <HiOutlineFilter size={15} />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="product-filter-badge" id="filter-active-count">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible 4-dropdown row with black divider between search and dropdowns */}
      {isFilterPanelOpen && (
        <>
          <div className="product-divider" aria-hidden="true" />
          <div className="product-dropdowns-row">
            <div className="product-dropdowns-group">
              {/* Dropdown 1: Danh mục */}
              <FilterDropdown
                id="filter-danh-muc"
                options={categoryOptions}
                value={selectedCategory}
                onSelect={handleCategoryChange}
                className="product-dropdown"
                selectedDark
              />

              {/* Dropdown 2: Thương hiệu */}
              <FilterDropdown
                id="filter-thuong-hieu"
                options={brandOptions}
                value={selectedBrand}
                onSelect={handleBrandChange}
                className="product-dropdown"
                selectedDark
              />

              {/* Dropdown 3: Loại sản phẩm */}
              <FilterDropdown
                id="filter-loai-san-pham"
                options={productTypeOptions}
                value={selectedProductType}
                onSelect={handleProductTypeChange}
                className="product-dropdown"
                selectedDark
              />

              {/* Dropdown 4: Trạng thái bán */}
              <FilterDropdown
                id="filter-trang-thai-ban"
                options={statusOptions}
                value={selectedStatus}
                onSelect={handleStatusChange}
                className="product-dropdown"
                selectedDark
              />

              {/* Conditional "Xóa lọc" button inline */}
              {isFiltered && (
                <button
                  type="button"
                  className="product-clear-filter-btn"
                  onClick={handleClearFilters}
                  id="btn-clear-product-filters"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Dynamic result count text at far right */}
            <div className="product-dropdowns-count" id="product-filtered-count">
              {totalFilteredCount} kết quả
            </div>
          </div>
        </>
      )}

      {/* Full-width black divider above table */}
      <div className="product-divider" aria-hidden="true" />

      {/* Product table (edge-to-edge) */}
      <div className="product-table-wrapper">
        <table className="product-table" id="products-table">
          <thead className="product-table__head">
            <tr>
              {tableColumns.map((col) => (
                <th
                  key={col.id}
                  className={`product-table__th ${col.isCheckbox ? 'product-table__th--checkbox' : ''}`}
                >
                  {col.isCheckbox ? (
                    <input
                      type="checkbox"
                      className="product-table__checkbox"
                      aria-label="Chọn tất cả sản phẩm trên trang"
                      checked={allCurrentPageSelected}
                      onChange={handleToggleSelectAll}
                      id="select-all-products"
                    />
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="product-table__body">
            {currentProducts.length === 0 ? (
              <tr className="product-table__empty-row">
                <td colSpan={tableColumns.length} className="product-table__empty-cell">
                  <div
                    className="product-table__empty-state"
                    role={error ? 'button' : undefined}
                    tabIndex={error ? 0 : undefined}
                    onClick={error ? () => setReloadKey((value) => value + 1) : undefined}
                    onKeyDown={error ? (event) => event.key === 'Enter' && setReloadKey((value) => value + 1) : undefined}
                  >
                    <div className="product-table__empty-icon" aria-hidden="true">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="6" y="10" width="36" height="30" stroke="#d1d5db" strokeWidth="2" fill="none" />
                        <path d="M6 18h36M24 18v22M18 10l6-6 6 6" stroke="#d1d5db" strokeWidth="2" strokeLinecap="square" />
                      </svg>
                    </div>
                    <span className="product-table__empty-text">
                      {loading
                        ? 'Đang tải dữ liệu sản phẩm...'
                        : error
                          ? `${error} Nhấn để thử lại.`
                          : 'Không tìm thấy sản phẩm phù hợp.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              currentProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr
                    key={product.id}
                    className={`product-table__tr ${isSelected ? 'product-table__tr--selected' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="product-table__td product-table__td--checkbox">
                      <input
                        type="checkbox"
                        className="product-table__checkbox"
                        aria-label={`Chọn sản phẩm ${product.tenSanPham}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(product.id)}
                      />
                    </td>

                    {/* Hình ảnh */}
                    <td className="product-table__td product-table__td--image">
                      <div className="product-thumb">
                        {product.hinhAnh ? (
                          <img
                            src={product.hinhAnh}
                            alt={product.tenSanPham}
                            className="product-thumb__img"
                          />
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="0" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        )}
                      </div>
                    </td>

                    {/* Mã & Tên sản phẩm */}
                    <td className="product-table__td product-table__td--name">
                      <div className="product-name-info">
                        <span className="product-name-text" title={product.tenSanPham}>
                          {product.tenSanPham}
                        </span>
                        <div className="product-name-sub">
                          <span className="product-code-text">{product.maSanPham}</span>
                          {product.isCombo && product.soThanhPhan > 0 ? (
                            <span className="product-version-tag">
                              Có {product.soThanhPhan} thành phần
                            </span>
                          ) : product.soPhienBan ? (
                            <span className="product-version-tag">
                              Có {product.soPhienBan} phiên bản
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Phân loại */}
                    <td className="product-table__td product-table__td--type">
                      <span className="product-type-text">{product.phanLoai}</span>
                    </td>

                    {/* Thương hiệu */}
                    <td className="product-table__td product-table__td--brand">
                      <span className="product-brand-text">{product.thuongHieu}</span>
                    </td>

                    {/* Tồn kho */}
                    <td className="product-table__td product-table__td--stock">
                      <div className="product-stock-container">
                        <span className="product-stock-val">{product.tonKho}</span>
                        {product.canhBao && (
                          <span className="product-stock-warning" title="Sắp hết hàng">
                            {product.canhBao}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Trạng thái bán */}
                    <td className="product-table__td product-table__td--status">
                      <span className="product-status-pill">
                        <span className="product-status-dot" aria-hidden="true" />
                        <span>{product.trangThaiBan}</span>
                      </span>
                    </td>

                    {/* Thao tác (re-styled 3 icon buttons: eye, pencil on paper, trash can) */}
                    <td className="product-table__td product-table__td--actions">
                      <div className="product-action-buttons">
                        <button
                          type="button"
                          className="btn-product-action"
                          onClick={() => navigate(product.isCombo
                            ? `/kho-hang/combo-san-pham/chi-tiet/${encodeURIComponent(product.id)}`
                            : `/admin/san-pham/chi-tiet-san-pham/${encodeURIComponent(product.id)}`)}
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                        >
                          <HiOutlineEye size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-product-action"
                          onClick={() => navigate(product.isCombo
                            ? `/kho-hang/combo-san-pham/them-moi?id=${encodeURIComponent(product.id)}`
                            : `/admin/san-pham/them-san-pham/${encodeURIComponent(product.id)}`)}
                          title="Chỉnh sửa"
                          aria-label="Chỉnh sửa"
                        >
                          <HiOutlinePencilAlt size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-product-action"
                          title="Xóa"
                          aria-label="Xóa"
                        >
                          <HiOutlineTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        totalItems={totalFilteredCount}
        pageSize={PAGE_SIZE}
        currentPage={safeCurrentPage}
        onPageChange={setCurrentPage}
        idPrefix="products"
      />
    </main>
  );
}
