import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { productService } from '../../shared/services/productService';
import './SearchPage.css';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Dynamic filter lists derived from API products
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  // Featured products for "no results" section — real from API
  const [featuredProducts, setFeaturedProducts] = useState([]);

  // Load featured products once on mount
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const res = await productService.getProducts({ ton_kho: true, limit: 4, sort: 'moi_nhat' });
        if (res?.data?.danhSachSanPham) {
          setFeaturedProducts(
            res.data.danhSachSanPham.slice(0, 4).map(p => ({
              id: p.id,
              title: p.tenSanPham,
              name: p.tenSanPham,
              image: p.anhChinh || 'https://via.placeholder.com/300',
              price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.giaThapNhat || 0),
              category: p.tenDanhMuc,
              outOfStock: !p.conHang,
            }))
          );
        }
      } catch (e) {
        console.error('Error loading featured products:', e);
      }
    };
    loadFeatured();
  }, []);

  // Always fetch ALL products (no keyword) once on mount to build the complete
  // brand & category filter lists from the full catalog — so filters are always visible
  // regardless of whether the current search query has any results.
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await productService.getProducts({ ton_kho: true, limit: 100 });
        if (response?.data?.danhSachSanPham) {
          const brandMap = {};
          const catMap = {};
          response.data.danhSachSanPham
            .filter(p => p.conHang)
            .forEach(p => {
              const brand = p.tenThuongHieu || '';
              const cat = p.tenDanhMuc || '';
              if (brand) brandMap[brand] = (brandMap[brand] || 0) + 1;
              if (cat) catMap[cat] = (catMap[cat] || 0) + 1;
            });

          setBrands(
            Object.entries(brandMap)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => ({ name, count }))
          );
          setCategories(
            Object.entries(catMap)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => ({ name, count }))
          );
        }
      } catch (error) {
        console.error('Lỗi load filter options:', error);
      }
    };
    loadFilterOptions();
  }, []);

  // Load filtered search results — re-runs whenever any filter or sort changes.
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const params = { keyword: query, limit: 100, ton_kho: true };
        if (minPrice) params.gia_min = Number(minPrice);
        if (maxPrice) params.gia_max = Number(maxPrice);
        if (stockStatus === 'in-stock') params.ton_kho = true;
        if (sortBy === 'price-asc') params.sort = 'gia_thap_nhat';
        else if (sortBy === 'price-desc') params.sort = 'gia_cao_nhat';
        else if (sortBy === 'newest') params.sort = 'moi_nhat';

        const response = await productService.getProducts(params);
        if (response?.data?.danhSachSanPham) {
          const mapped = response.data.danhSachSanPham
            .map(p => ({
              id: p.id,
              title: p.tenSanPham,
              name: p.tenSanPham,
              image: p.anhChinh || 'https://via.placeholder.com/300',
              price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.giaThapNhat || 0),
              category: p.tenDanhMuc || '',
              brand: p.tenThuongHieu || '',
              outOfStock: !p.conHang,
            }))
            .filter(p => !p.outOfStock);

          // Apply client-side brand & category filters
          let results = mapped;
          if (selectedBrands.length > 0) {
            results = results.filter(p => selectedBrands.includes(p.brand));
          }
          if (selectedCategories.length > 0) {
            results = results.filter(p =>
              selectedCategories.some(cat => (p.category || '').toLowerCase().includes(cat.toLowerCase()))
            );
          }

          setFilteredProducts(results);
          setTotalProducts(results.length);
        } else {
          setFilteredProducts([]);
          setTotalProducts(0);
        }
      } catch (error) {
        console.error('Lỗi fetch sản phẩm:', error);
      }
    };
    loadProducts();
  }, [query, sortBy, minPrice, maxPrice, stockStatus, selectedBrands, selectedCategories]);

  const sortOptions = [
    { value: 'relevance', label: 'Liên quan nhất' },
    { value: 'price-asc', label: 'Giá thấp → cao' },
    { value: 'price-desc', label: 'Giá cao → thấp' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'bestseller', label: 'Bán chạy nhất' },
  ];

  const suggestedKeywords = ['RTX 4090', 'Ryzen 9', 'Mainboard Z790', 'Chuột gaming', 'Bàn phím cơ'];

  const handleBrandChange = (brandName) => {
    setSelectedBrands(prev =>
      prev.includes(brandName) ? prev.filter(b => b !== brandName) : [...prev, brandName]
    );
  };

  const handleCategoryChange = (catName) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handlePricePreset = (preset) => {
    if (preset === '<5') { setMinPrice(''); setMaxPrice('5000000'); }
    else if (preset === '5-15') { setMinPrice('5000000'); setMaxPrice('15000000'); }
    else if (preset === '15-25') { setMinPrice('15000000'); setMaxPrice('25000000'); }
    else if (preset === '>25') { setMinPrice('25000000'); setMaxPrice(''); }
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setStockStatus('all');
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    minPrice ||
    maxPrice ||
    stockStatus !== 'all';

  const handleSuggestKeyword = (k) => {
    navigate(`/search?q=${encodeURIComponent(k)}`);
  };

  return (
    <div className="search-page-wrapper">
      <Header />

      {/* Search Header Banner */}
      <div className="search-banner">
        <div className="container">
          <div className="search-query-info">
            Kết quả cho: <strong>"{query}"</strong> - {filteredProducts.length} sản phẩm
          </div>
        </div>
      </div>

      <div className="search-main container">
        {/* Sidebar Filters */}
        <aside className="search-sidebar">
          <div className="filter-header-block">
            <h3 className="filter-title">BỘ LỌC TÌM KIẾM</h3>
            {hasActiveFilters && (
              <button className="clear-all-btn" onClick={clearAllFilters}>XÓA TẤT CẢ</button>
            )}
          </div>

          <div className="filter-block-content">
            {/* Price Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title"><span>|</span> KHOẢNG GIÁ</h4>
              <div className="price-inputs">
                <input type="text" placeholder="Tối thiểu" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <span className="price-separator">-</span>
                <input type="text" placeholder="Tối đa" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
              <div className="price-presets">
                <button onClick={() => handlePricePreset('<5')} className="price-preset-btn">&lt; 5 triệu</button>
                <button onClick={() => handlePricePreset('5-15')} className="price-preset-btn">5-15 triệu</button>
                <button onClick={() => handlePricePreset('15-25')} className="price-preset-btn">15-25 triệu</button>
                <button onClick={() => handlePricePreset('>25')} className="price-preset-btn">&gt; 25 triệu</button>
              </div>
            </div>

            {/* Stock Status Filter */}
            <div className="filter-section">
              <h4 className="filter-section-title"><span>|</span> TÌNH TRẠNG</h4>
              <div className="status-buttons">
                <button
                  className={`status-btn ${stockStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setStockStatus('all')}
                >
                  Tất cả
                </button>
                <button
                  className={`status-btn ${stockStatus === 'in-stock' ? 'active' : ''}`}
                  onClick={() => setStockStatus('in-stock')}
                >
                  Còn hàng
                </button>
              </div>
            </div>

            {/* Brands Filter - DYNAMIC from API */}
            {brands.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-section-title"><span>|</span> THƯƠNG HIỆU</h4>
                <div className="checkbox-list brand-list">
                  {brands.map(brand => (
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
            )}

            {/* Categories Filter - DYNAMIC from API */}
            {categories.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-section-title"><span>|</span> DANH MỤC</h4>
                <div className="checkbox-list category-list">
                  {categories.map(cat => (
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
            )}
          </div>
        </aside>

        {/* Search Results Area */}
        <div className="search-content">
          <div className="search-toolbar">
            <div className="toolbar-left">
              {totalProducts > 0 ? (
                <span><strong>{totalProducts}</strong> sản phẩm tìm thấy</span>
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
                  <span className="sort-current">{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                  {isSortDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isSortDropdownOpen && (
                  <div className="custom-sort-dropdown">
                    {sortOptions.map(option => (
                      <div
                        key={option.value}
                        className={`sort-option ${sortBy === option.value ? 'active' : ''}`}
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

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="active-filters">
              {selectedBrands.map(brand => (
                <div key={brand} className="filter-chip">
                  <span className="chip-text">{brand}</span>
                  <button className="chip-close" onClick={() => handleBrandChange(brand)}><X size={14} /></button>
                </div>
              ))}
              {selectedCategories.map(cat => (
                <div key={cat} className="filter-chip">
                  <span className="chip-text">{cat}</span>
                  <button className="chip-close" onClick={() => handleCategoryChange(cat)}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <div className="search-product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard key={index} product={product} />
              ))}
            </div>
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
                  <h2>KHÔNG TÌM THẤY KẾT QUẢ NÀO PHÙ HỢP VỚI TỪ KHÓA</h2>
                  <div className="keyword-badge">
                    <Search size={16} />
                    <span>"{query}"</span>
                  </div>
                  <p>Hệ thống không tìm thấy sản phẩm nào phù hợp. Thử kiểm tra lại chính tả, dùng từ khóa ngắn hơn, hoặc tìm theo tên thương hiệu / danh mục.</p>

                  <div className="suggested-keywords">
                    {suggestedKeywords.map(k => (
                      <button key={k} className="keyword-btn" onClick={() => handleSuggestKeyword(k)}>{k}</button>
                    ))}
                  </div>

                  {hasActiveFilters && (
                    <button className="clear-filters-large-btn" onClick={clearAllFilters}>
                      <X size={16} /> XÓA BỘ LỌC ĐÃ ÁP DỤNG
                    </button>
                  )}
                </div>
              </div>

              {/* Sản phẩm nổi bật - real products from API */}
              {featuredProducts.length > 0 && (
                <div className="recommended-section">
                  <div className="recommended-header">
                    <h3><span>|</span> SẢN PHẨM NỔI BẬT</h3>
                    <span className="recommended-subtitle">GỢI Ý CHO BẠN</span>
                  </div>
                  <div className="search-product-grid">
                    {featuredProducts.map((product, index) => (
                      <ProductCard key={index} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
