import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import {
  productService,
  toProductCard,
} from "../../shared/services/productService";
import TablePagination from "../../shared/components/ui/TablePagination";
import { catalogScopes, inCatalogScope } from './catalogModel';
import "./SearchPage.css";

const SearchPage = ({ categorySlug } = {}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const isCategory = categorySlug != null;
  const categoryTitle = catalogScopes[categorySlug]?.title || 'Không tìm thấy danh mục';

  const [searchProducts, setSearchProducts] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(isCategory ? "newest" : "relevance");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Filter states
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stockStatus, setStockStatus] = useState("all"); // 'all', 'in-stock'
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setLoading(true); setError('');
      try {
        const params = { keyword: query };

        if (minPrice) params.gia_min = Number(minPrice);
        if (maxPrice) params.gia_max = Number(maxPrice);
        if (stockStatus === "in-stock") params.ton_kho = true;

        if (sortBy === "price-asc") {
          params.sort = "gia_tang_dan";
        } else if (sortBy === "price-desc") {
          params.sort = "gia_giam_dan";
        } else if (sortBy === "newest") {
          params.sort = "moi_nhat";
        } else if (sortBy === "bestseller") {
          params.sort = "ban_chay";
        }

        const catalog = await productService.getAllProducts(params);
        const products = isCategory ? catalog.filter(product => inCatalogScope(product, categorySlug)) : catalog;
        const recommended = products.length || isCategory ? [] : (await productService.getProducts({ limit: 4, sort: 'moi_nhat' })).data.danhSachSanPham.map(toProductCard);
        if (active) { setSearchProducts(products); setSuggestedProducts(recommended); setPage(1); }
      } catch (reason) {
        if (active) { setSearchProducts([]); setSuggestedProducts([]); setError(reason.response?.data?.message || reason.message || 'Không tải được sản phẩm.'); }
      } finally { if (active) setLoading(false); }
    };
    loadProducts();
    return () => { active = false; };
  }, [query, sortBy, minPrice, maxPrice, stockStatus, categorySlug, isCategory]);

  const filteredProducts = useMemo(() => {
    const products = searchProducts.filter(product =>
      (!selectedBrands.length || selectedBrands.includes(product.brand)) &&
      (!selectedCategories.length || selectedCategories.includes(product.category)));
    if (sortBy === 'name-asc') products.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    return products;
  }, [searchProducts, selectedBrands, selectedCategories, sortBy]);
  const totalProducts = filteredProducts.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(totalProducts / 20)));
  const facets = field => [...new Set(searchProducts.map(product => product[field]).filter(Boolean))].sort((a,b) => a.localeCompare(b,'vi')).map(name => ({ name, count: searchProducts.filter(product => product[field] === name).length }));

  const sortOptions = [
    { value: "relevance", label: "Liên quan nhất" },
    { value: "price-asc", label: "Giá thấp → cao" },
    { value: "price-desc", label: "Giá cao → thấp" },
    { value: "newest", label: "Mới nhất" },
    { value: "name-asc", label: "Tên A–Z" },
    { value: "bestseller", label: "Bán chạy nhất" },
  ];

  const brands = facets('brand');
  const categories = facets('category');

  const suggestedKeywords = [
    "RTX 4090",
    "Ryzen 9",
    "Mainboard Z790",
    "Chuột gaming",
    "Bàn phím cơ",
  ];

  const handleBrandChange = (brandName) => {
    setPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((b) => b !== brandName)
        : [...prev, brandName],
    );
  };

  const handleCategoryChange = (catName) => {
    setPage(1);
    setSelectedCategories((prev) =>
      prev.includes(catName)
        ? prev.filter((c) => c !== catName)
        : [...prev, catName],
    );
  };

  const handlePricePreset = (preset) => {
    if (preset === "<5") {
      setMinPrice("");
      setMaxPrice("5000000");
    } else if (preset === "5-15") {
      setMinPrice("5000000");
      setMaxPrice("15000000");
    } else if (preset === "15-25") {
      setMinPrice("15000000");
      setMaxPrice("25000000");
    } else if (preset === ">25") {
      setMinPrice("25000000");
      setMaxPrice("");
    }
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setMinPrice("");
    setMaxPrice("");
    setStockStatus("all");
  };

  const removeFilter = (filter, type) => {
    if (type === "brand") {
      setSelectedBrands((prev) => prev.filter((b) => b !== filter));
    }
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    minPrice ||
    maxPrice ||
    stockStatus !== "all";

const handleSuggestKeyword = (k) => {
    clearAllFilters();
    navigate(`/search?q=${encodeURIComponent(k)}`);
  };

  return (
    <div className="search-page-wrapper">
      <Header />

      {/* Search Header Banner */}
      <div className="search-banner">
        <div className="container">
          {isCategory ? <h1 className="catalog-listing-title">{categoryTitle}</h1> : <div className="search-query-info">
            Kết quả cho: <strong>"{query}"</strong> - {filteredProducts.length}{" "}
            sản phẩm
          </div>}
        </div>
      </div>

      <div className="search-main container">
        {/* Sidebar Filters */}
        <aside className="search-sidebar">
          <div className="filter-header-block">
            <h3 className="filter-title">{isCategory ? 'BỘ LỌC SẢN PHẨM' : 'BỘ LỌC TÌM KIẾM'}</h3>
            {hasActiveFilters && (
              <button className="clear-all-btn" onClick={clearAllFilters}>
                XÓA TẤT CẢ
              </button>
            )}
          </div>

          <div className="filter-block-content">
            {/* Price Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title">
                <span>|</span> KHOẢNG GIÁ
              </h4>
              <div className="price-inputs">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Giá tối thiểu"
                  placeholder="Tối thiểu"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="price-separator">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Giá tối đa"
                  placeholder="Tối đa"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <div className="price-presets">
                <button
                  onClick={() => handlePricePreset("<5")}
                  className="price-preset-btn"
                >
                  &lt; 5 triệu
                </button>
                <button
                  onClick={() => handlePricePreset("5-15")}
                  className="price-preset-btn"
                >
                  5-15 triệu
                </button>
                <button
                  onClick={() => handlePricePreset("15-25")}
                  className="price-preset-btn"
                >
                  15-25 triệu
                </button>
                <button
                  onClick={() => handlePricePreset(">25")}
                  className="price-preset-btn"
                >
                  &gt; 25 triệu
                </button>
              </div>
            </div>

            {/* Stock Status Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title">
                <span>|</span> TÌNH TRẠNG
              </h4>
              <div className="status-buttons">
                <button
                  className={`status-btn ${stockStatus === "all" ? "active" : ""}`}
                  onClick={() => setStockStatus("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`status-btn ${stockStatus === "in-stock" ? "active" : ""}`}
                  onClick={() => setStockStatus("in-stock")}
                >
                  Còn hàng
                </button>
              </div>
            </div>

            {/* Brands Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title">
                <span>|</span> THƯƠNG HIỆU
              </h4>
              <div className="checkbox-list brand-list">
                {brands.map((brand) => (
                  <label key={brand.name} className="checkbox-item">
                    <div className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.name)}
                        onChange={() => handleBrandChange(brand.name)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-label">{brand.name}</span>
                    </div>
                    <span className="item-count">{brand.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categories Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title">
                <span>|</span> DANH MỤC
              </h4>
              <div className="checkbox-list category-list">
                {categories.map((cat) => (
                  <label key={cat.name} className="checkbox-item">
                    <div className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.name)}
                        onChange={() => handleCategoryChange(cat.name)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-label">{cat.name}</span>
                    </div>
                    <span className="item-count">{cat.count}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Search Results Area */}
        <div className="search-content">
          <div className="search-toolbar">
            <div className="toolbar-left">
              {totalProducts > 0 ? (
                <span>
                  <strong>{totalProducts}</strong> {isCategory ? 'sản phẩm' : 'sản phẩm tìm thấy'}
                </span>
              ) : (
                <span>Không có kết quả</span>
              )}
            </div>
            <div className="toolbar-right">
              <div className="custom-sort-wrapper">
                <button
                  className="custom-sort-btn"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                >
                  <span className="sort-label">SẮP XẾP: </span>
                  <span className="sort-current">
                    {sortOptions.find((opt) => opt.value === sortBy)?.label}
                  </span>
                  {isSortDropdownOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {isSortDropdownOpen && (
                  <div className="custom-sort-dropdown">
                    {sortOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`sort-option ${sortBy === option.value ? "active" : ""}`}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortDropdownOpen(false);
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="active-filters">
              {selectedBrands.map((brand) => (
                <div key={brand} className="filter-chip">
                  <span className="chip-text">{brand}</span>
                  <button
                    className="chip-close"
                    onClick={() => removeFilter(brand, "brand")}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {/* Other chips can be added similarly */}
            </div>
          )}

          {loading ? <p role="status">Đang tải sản phẩm...</p> : error ? <p role="alert">{error}</p> : filteredProducts.length > 0 ? (
            <><div className="search-product-grid">
              {filteredProducts.slice((currentPage - 1) * 20, currentPage * 20).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div><TablePagination totalItems={totalProducts} pageSize={20} currentPage={currentPage} onPageChange={setPage} idPrefix="store-search" /></>
          ) : (
            <div className="no-results-area">
              <div className="no-results-header">
                <div className="red-square"></div>
                <span>KHÔNG TÌM THẤY KẾT QUẢ</span>
              </div>
              <div className="no-results-body">
                <div className="no-results-icon">
                  <Search size={40} />
                </div>
                <div className="no-results-content">
                  <h2>{isCategory ? 'KHÔNG CÓ SẢN PHẨM PHÙ HỢP VỚI BỘ LỌC' : 'KHÔNG TÌM THẤY KẾT QUẢ NÀO PHÙ HỢP VỚI TỪ KHÓA'}</h2>
                  {!isCategory && <div className="keyword-badge">
                    <Search size={16} />
                    <span>"{query}"</span>
                  </div>}
                  <p>
                    {isCategory ? 'Thử thay đổi khoảng giá, thương hiệu hoặc xóa bộ lọc để xem thêm sản phẩm trong danh mục.' : 'Hệ thống không tìm thấy sản phẩm nào phù hợp. Thử kiểm tra lại chính tả, dùng từ khóa ngắn hơn, hoặc tìm theo tên thương hiệu / danh mục.'}
                  </p>

                  {!isCategory && <div className="suggested-keywords">
                    {suggestedKeywords.map((k) => (
                      <button
                        key={k}
                        className="keyword-btn"
                        onClick={() => handleSuggestKeyword(k)}
                      >
                        {k}
                      </button>
                    ))}
                  </div>}

                  {hasActiveFilters && (
                    <button
                      className="clear-filters-large-btn"
                      onClick={clearAllFilters}
                    >
                      <X size={16} /> XÓA BỘ LỌC ĐÃ ÁP DỤNG
                    </button>
                  )}
                </div>
              </div>

              {/* Recommended Products when no results */}
              {suggestedProducts.length > 0 && <div className="recommended-section">
                <div className="recommended-header">
                  <h3>
                    <span>|</span> SẢN PHẨM NỔI BẬT
                  </h3>
                  <span className="recommended-subtitle">GỢI Ý CHO BẠN</span>
                </div>
                <div className="search-product-grid">
                  {suggestedProducts.map((product, index) => (
                    <ProductCard key={index} product={product} />
                  ))}
                </div>
              </div>}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
