// Product list screen: real IntelliJ API data with server-side search, filters, and pagination.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineUpload,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import FilterDropdown from "../../../../../shared/components/ui/FilterDropdown";
import TablePagination from "../../../../../shared/components/ui/TablePagination";
import { getAllBrands } from "../../brands/api/brandApi";
import { getAllCategories } from "../../categories/api/categoryApi";
import { getProductPage } from "../api/productApi";
import "./DanhSachSanPham.css";

const productTypeOptions = ["Tất cả loại sản phẩm", "Sản phẩm đơn", "Theo bộ (Combo)"];

const statusOptions = ["Tất cả trạng thái", "Đang kinh doanh", "Ngừng kinh doanh"];

const tableColumns = [
  { id: "checkbox", label: "", isCheckbox: true },
  { id: "hinh-anh", label: "HÌNH ẢNH" },
  { id: "ma-ten-san-pham", label: "MÃ & TÊN SẢN PHẨM" },
  { id: "phan-loai", label: "PHÂN LOẠI" },
  { id: "thuong-hieu", label: "THƯƠNG HIỆU" },
  { id: "ton-kho", label: "TỒN KHO" },
  { id: "trang-thai-ban", label: "TRẠNG THÁI BÁN" },
  { id: "thao-tac", label: "THAO TÁC" },
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
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const previousSearch = useRef(searchTerm);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả danh mục");
  const [selectedBrand, setSelectedBrand] = useState("Tất cả thương hiệu");
  const [selectedProductType, setSelectedProductType] =
    useState("Tất cả loại sản phẩm");
  const [selectedStatus, setSelectedStatus] = useState("Tất cả trạng thái");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Check active filters against defaults
  const isCategoryActive = selectedCategory !== "Tất cả danh mục";
  const isBrandActive = selectedBrand !== "Tất cả thương hiệu";
  const isProductTypeActive = selectedProductType !== "Tất cả loại sản phẩm";
  const isStatusActive = selectedStatus !== "Tất cả trạng thái";

  const activeFilterCount =
    (isCategoryActive ? 1 : 0) +
    (isBrandActive ? 1 : 0) +
    (isProductTypeActive ? 1 : 0) +
    (isStatusActive ? 1 : 0);

  const isFiltered = activeFilterCount > 0;

  const handleClearFilters = () => {
    setSelectedCategory("Tất cả danh mục");
    setSelectedBrand("Tất cả thương hiệu");
    setSelectedProductType("Tất cả loại sản phẩm");
    setSelectedStatus("Tất cả trạng thái");
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

  const filterFields = [
    { id: 'filter-danh-muc', label: 'Danh mục', value: selectedCategory, onSelect: handleCategoryChange,
      options: ['Tất cả danh mục', ...categoryLookup.map(item => item.name).sort((a, b) => a.localeCompare(b, 'vi'))] },
    { id: 'filter-thuong-hieu', label: 'Thương hiệu', value: selectedBrand, onSelect: handleBrandChange,
      options: ['Tất cả thương hiệu', ...brandLookup.map(item => item.name).sort((a, b) => a.localeCompare(b, 'vi'))] },
    { id: 'filter-loai-san-pham', label: 'Loại sản phẩm', value: selectedProductType, onSelect: handleProductTypeChange, options: productTypeOptions },
    { id: 'filter-trang-thai-ban', label: 'Trạng thái bán', value: selectedStatus, onSelect: handleStatusChange, options: statusOptions },
  ];
  const activeFilters = filterFields.filter(field => field.value !== field.options[0]);

  const categoryId = categoryLookup.find(
    (item) => item.name === selectedCategory,
  )?.id;
  const brandId = brandLookup.find((item) => item.name === selectedBrand)?.id;
  const productType =
    selectedProductType === "Sản phẩm đơn"
      ? "DON"
      : selectedProductType === "Theo bộ (Combo)"
        ? "BO_PC"
        : "";
  const status =
    selectedStatus === "Đang kinh doanh"
      ? 1
      : selectedStatus === "Ngừng kinh doanh"
        ? 0
        : null;

  // Use the same lookup records for dropdown choices and API IDs.
  useEffect(() => {
    let active = true;
    Promise.all([getAllCategories(), getAllBrands()])
      .then(([categories, brands]) => {
        if (active) {
          setCategoryLookup(categories);
          setBrandLookup(brands);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Server-side pagination/search/filtering keeps counts and page boundaries authoritative.
  useEffect(() => {
    const controller = new AbortController();
    const delay = previousSearch.current === searchTerm ? 0 : 250;
    previousSearch.current = searchTerm;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getProductPage(
          {
            keyword: searchTerm,
            categoryId: isCategoryActive ? categoryId : null,
            brandId: isBrandActive ? brandId : null,
            productType,
            status,
            page: currentPage,
            limit: PAGE_SIZE,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setProductsList(result.items);
        setTotalFilteredCount(result.totalItems);
        setTotalPages(result.totalPages);
      } catch (requestError) {
        if (!controller.signal.aborted && requestError?.name !== "AbortError") {
          setProductsList([]);
          setTotalFilteredCount(0);
          setTotalPages(0);
          setError(
            requestError?.message || "Không thể tải danh sách sản phẩm.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    searchTerm,
    categoryId,
    brandId,
    productType,
    status,
    currentPage,
    reloadKey,
    isCategoryActive,
    isBrandActive,
  ]);

  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const currentProducts = productsList;

  // Checkbox handling
  const allCurrentPageSelected =
    currentProducts.length > 0 &&
    currentProducts.every((p) => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentProducts.some((p) => p.id === id)),
      );
    } else {
      const currentIds = currentProducts.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <main className="product-page admin-list-page" role="main">
      {/* 2. Action button band */}
      <div className="product-actions-band">
        <div className="product-actions-band__content">
          <button
            className="btn-product-band btn-product-band--white"
            id="btn-import-excel"
          >
            <HiOutlineUpload size={16} />
            <span>NHẬP EXCEL</span>
          </button>
          <button
            className="btn-product-band btn-product-band--red"
            id="btn-add-product-band"
            onClick={() => navigate("/admin/san-pham/them-san-pham")}
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
          <span className="product-breadcrumb__sep" aria-hidden="true">
            ›
          </span>
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
              aria-label="Tìm kiếm theo tên hoặc mã sản phẩm"
            />
          </div>

          {/* "Bộ lọc" toggle button */}
          <button
            type="button"
            className={`btn-product-filter-toggle ${isFilterPanelOpen ? "btn-product-filter-toggle--open" : ""} ${activeFilterCount > 0 ? "btn-product-filter-toggle--has-filters" : ""}`}
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            id="btn-filter-utility"
            aria-expanded={isFilterPanelOpen}
            aria-controls="product-filter-panel"
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

      {isFilterPanelOpen && (
        <section className="product-filter-panel" id="product-filter-panel" aria-label="Bộ lọc sản phẩm">
          <div className="product-dropdowns-group">
            {filterFields.map(field => (
              <div className="product-filter-field" key={field.id}>
                <span className="product-filter-field__label">{field.label}</span>
                <FilterDropdown
                  id={field.id}
                  options={field.options}
                  value={field.value}
                  onSelect={field.onSelect}
                  className="product-dropdown"
                  selectedDark
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {isFiltered && (
        <div className="product-active-filters" aria-label="Điều kiện đang lọc">
          <span className="product-active-filters__label">ĐANG LỌC</span>
          {activeFilters.map(field => (
            <button
              type="button"
              className="product-filter-chip"
              key={field.id}
              onClick={() => field.onSelect(field.options[0])}
              aria-label={'Bỏ lọc ' + field.label + ': ' + field.value}
            >
              <span>{field.label}: <strong>{field.value}</strong></span>
              <HiOutlineX size={14} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="product-clear-filter-btn" onClick={handleClearFilters} id="btn-clear-product-filters">
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}

      {/* Full-width black divider above table */}
      <div className="product-divider" aria-hidden="true" />

      {/* Product table (edge-to-edge) */}
      <div className="admin-list-body admin-list-body--inset">
<div className="product-table-wrapper admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng danh sách">
        <table className="product-table admin-data-table" id="products-table" aria-busy={loading}>
          <thead className="product-table__head">
            <tr>
              {tableColumns.map((col) => (
                <th
                  key={col.id}
                  className={`product-table__th ${col.isCheckbox ? "product-table__th--checkbox" : ""}`}
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
                <td
                  colSpan={tableColumns.length}
                  className="product-table__empty-cell"
                >
                  <div
                    className="product-table__empty-state"
                    role={error ? "button" : undefined}
                    tabIndex={error ? 0 : undefined}
                    onClick={
                      error
                        ? () => setReloadKey((value) => value + 1)
                        : undefined
                    }
                    onKeyDown={
                      error
                        ? (event) =>
                            event.key === "Enter" &&
                            setReloadKey((value) => value + 1)
                        : undefined
                    }
                  >
                    <div
                      className="product-table__empty-icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        fill="none"
                      >
                        <rect
                          x="6"
                          y="10"
                          width="36"
                          height="30"
                          stroke="#d1d5db"
                          strokeWidth="2"
                          fill="none"
                        />
                        <path
                          d="M6 18h36M24 18v22M18 10l6-6 6 6"
                          stroke="#d1d5db"
                          strokeWidth="2"
                          strokeLinecap="square"
                        />
                      </svg>
                    </div>
                    <span className="product-table__empty-text">
                      {loading
                        ? "Đang tải dữ liệu sản phẩm..."
                        : error
                          ? `${error} Nhấn để thử lại.`
                          : "Không tìm thấy sản phẩm phù hợp."}
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
                    className={`product-table__tr ${isSelected ? "product-table__tr--selected" : ""}`}
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
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth="1.5"
                          >
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
                        <span
                          className="product-name-text"
                          title={product.tenSanPham}
                        >
                          {product.tenSanPham}
                        </span>
                        <div className="product-name-sub">
                          <span className="product-code-text">
                            {product.maSanPham}
                          </span>
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
                      <span className="product-type-text">
                        {product.phanLoai}
                      </span>
                    </td>

                    {/* Thương hiệu */}
                    <td className="product-table__td product-table__td--brand">
                      <span className="product-brand-text">
                        {product.thuongHieu}
                      </span>
                    </td>

                    {/* Tồn kho */}
                    <td className="product-table__td product-table__td--stock">
                      <div className="product-stock-container">
                        <span
                          className="product-stock-val"
                          title={
                            product.isCombo
                              ? "Số bộ có thể lắp từ linh kiện"
                              : "Tồn thực tế tại kho mặc định"
                          }
                        >
                          {product.isCombo
                            ? (product.assemblyCapacity ?? "—")
                            : (product.tonKho ?? "—")}
                        </span>
                        {product.canhBao && (
                          <span
                            className="product-stock-warning"
                            title="Sắp hết hàng"
                          >
                            {product.canhBao}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Trạng thái bán */}
                    <td className="product-table__td product-table__td--status">
                      <span
                        className={`product-status-badge product-status-badge--${product.trangThaiBan === "Đang kinh doanh" ? "active" : "inactive"}`}
                      >
                        <span
                          className="product-status-square"
                          aria-hidden="true"
                        />
                        <span>{product.trangThaiBan}</span>
                      </span>
                    </td>

                    {/* Thao tác (re-styled 3 icon buttons: eye, pencil on paper, trash can) */}
                    <td className="product-table__td product-table__td--actions">
                      <div className="product-action-buttons">
                        <button
                          type="button"
                          className="btn-product-action"
                          onClick={() =>
                            navigate(
                              product.isCombo
                                ? `/kho-hang/combo-san-pham/chi-tiet/${encodeURIComponent(product.id)}`
                                : `/admin/san-pham/chi-tiet-san-pham/${encodeURIComponent(product.id)}`,
                            )
                          }
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                        >
                          <HiOutlineEye size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-product-action"
                          onClick={() =>
                            navigate(
                              product.isCombo
                                ? `/kho-hang/combo-san-pham/them-moi?id=${encodeURIComponent(product.id)}`
                                : `/admin/san-pham/them-san-pham/${encodeURIComponent(product.id)}`,
                            )
                          }
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

      <TablePagination className="admin-table-footer"
        totalItems={totalFilteredCount}
        pageSize={PAGE_SIZE}
        currentPage={safeCurrentPage}
        onPageChange={setCurrentPage}
        idPrefix="products"
      />
</div>
    </main>
  );
}
