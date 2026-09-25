import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { mockPcBuildProducts, mockLinhKien, mockGamingGear } from '../data/categoryData';
import './SearchPage.css';

const allProducts = [...mockPcBuildProducts, ...mockLinhKien, ...mockGamingGear];

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  
  const sortOptions = [
    { value: 'relevance', label: 'Liên quan nhất' },
    { value: 'price-asc', label: 'Giá thấp → cao' },
    { value: 'price-desc', label: 'Giá cao → thấp' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'bestseller', label: 'Bán chạy nhất' },
  ];
  
  // Filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stockStatus, setStockStatus] = useState('all'); // 'all', 'in-stock'
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Mock data for filters
  const brands = [
    { name: 'AMD', count: 2 },
    { name: 'ASUS ROG', count: 3 },
    { name: 'BE QUIET!', count: 1 },
    { name: 'CORSAIR', count: 2 },
    { name: 'G.SKILL', count: 1 },
    { name: 'GIGABYTE', count: 1 },
    { name: 'INTEL', count: 2 },
    { name: 'KEYCHRON', count: 1 },
    { name: 'LG', count: 1 },
    { name: 'MSI', count: 2 },
    { name: 'RAZER', count: 1 },
    { name: 'SAMSUNG', count: 2 },
    { name: 'WD', count: 1 },
  ];

  const categories = [
    { name: 'Bàn phím', count: 2 },
    { name: 'CPU', count: 4 },
    { name: 'Mainboard', count: 2 },
    { name: 'Màn hình', count: 2 },
    { name: 'PSU', count: 1 },
    { name: 'RAM', count: 2 },
    { name: 'SSD', count: 2 },
    { name: 'Tản nhiệt', count: 1 },
    { name: 'VGA', count: 4 },
  ];

  const suggestedKeywords = ['RTX 4090', 'Ryzen 9', 'Mainboard Z790', 'Chuột gaming', 'Bàn phím cơ'];

  useEffect(() => {
    let results = allProducts.filter(p => 
      (p.title || p.name || '').toLowerCase().includes(query.toLowerCase())
    );
    
    // Apply dummy filters for demonstration
    if (selectedBrands.length > 0) {
      results = results.filter(p => selectedBrands.some(brand => (p.title || p.name || '').toLowerCase().includes(brand.toLowerCase())));
    }

    setFilteredProducts(results);
  }, [query, selectedBrands, selectedCategories, minPrice, maxPrice, stockStatus]);

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
    // Just a UI demonstration
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setStockStatus('all');
  };

  const removeFilter = (filter, type) => {
    if (type === 'brand') {
      setSelectedBrands(prev => prev.filter(b => b !== filter));
    }
  };

  const hasActiveFilters = selectedBrands.length > 0 || selectedCategories.length > 0 || minPrice || maxPrice || stockStatus !== 'all';

  const suggestedProducts = useMemo(() => {
    return allProducts.slice(0, 4); // Take 4 random products for "SẢN PHẨM NỔI BẬT"
  }, []);

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

            {/* Brands Filter */}
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

            {/* Categories Filter */}
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
          </div>
        </aside>

        {/* Search Results Area */}
        <div className="search-content">
          <div className="search-toolbar">
            <div className="toolbar-left">
              {filteredProducts.length > 0 ? (
                <span><strong>{filteredProducts.length}</strong> sản phẩm tìm thấy</span>
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

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="active-filters">
              {selectedBrands.map(brand => (
                <div key={brand} className="filter-chip">
                  <span className="chip-text">{brand}</span>
                  <button className="chip-close" onClick={() => removeFilter(brand, 'brand')}><X size={14}/></button>
                </div>
              ))}
              {/* Other chips can be added similarly */}
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

              {/* Recommended Products when no results */}
              <div className="recommended-section">
                <div className="recommended-header">
                  <h3><span>|</span> SẢN PHẨM NỔI BẬT</h3>
                  <span className="recommended-subtitle">GỢI Ý CHO BẠN</span>
                </div>
                <div className="search-product-grid">
                  {suggestedProducts.map((product, index) => (
                    <ProductCard key={index} product={product} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SearchPage;
