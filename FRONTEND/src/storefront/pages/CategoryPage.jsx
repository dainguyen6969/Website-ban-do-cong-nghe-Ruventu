import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { productService } from '../../shared/services/productService';
import './CategoryPage.css';

const CATEGORY_MAP = {
  'pc-build': {
    title: 'PC BUILD SẴN',
    keywords: ['pc build', 'pc', 'bộ máy tính', 'combo'],
  },
  'linh-kien': {
    title: 'LINH KIỆN KHỦNG',
    keywords: ['linh kiện', 'cpu', 'mainboard', 'bo mạch', 'ram', 'vga', 'card màn hình', 'gpu', 'ssd', 'hdd', 'ổ cứng', 'nguồn', 'psu', 'case', 'vỏ máy tính', 'tản nhiệt'],
  },
  'gaming-gear': {
    title: 'GAMING GEAR',
    keywords: ['gaming gear', 'gamming gear', 'bàn phím', 'chuột', 'tai nghe', 'lót chuột', 'pad', 'headset', 'keyboard', 'mouse', 'ghế', 'bàn gaming'],
  },
  'gamming-gear': {
    title: 'GAMING GEAR',
    keywords: ['gaming gear', 'gamming gear', 'bàn phím', 'chuột', 'tai nghe', 'lót chuột', 'pad', 'headset', 'keyboard', 'mouse', 'ghế', 'bàn gaming'],
  },
  'man-hinh': {
    title: 'MÀN HÌNH',
    keywords: ['màn hình', 'monitor', 'display'],
  },
  'laptop': {
    title: 'LAPTOP',
    keywords: ['laptop', 'máy tính xách tay', 'notebook'],
  },
};

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function matchesCategory(product, slug) {
  if (!slug || slug === 'all' || slug === 'tat-ca') return true;

  const targetSlug = slug.toLowerCase().trim();
  const catName = (product.category || '').toLowerCase().trim();
  const parentName = (product.parentCategory || '').toLowerCase().trim();
  const catSlug = (product.categorySlug || slugify(product.category)).toLowerCase().trim().replace(/^\//, '');
  const parentSlug = slugify(parentName);

  // 1. Khớp chính xác slug hoặc tên danh mục
  if (catSlug === targetSlug || parentSlug === targetSlug) return true;
  if (slugify(catName) === targetSlug || parentSlug === targetSlug) return true;

  // 2. Khớp theo từ khóa nhóm danh mục chính
  const def = CATEGORY_MAP[targetSlug];
  if (def) {
    return def.keywords.some(
      kw => catName.includes(kw) || parentName.includes(kw) || catSlug.includes(slugify(kw)) || parentSlug.includes(slugify(kw))
    );
  }

  // 3. Khớp một phần slug với tên danh mục
  return catSlug.includes(targetSlug) || parentSlug.includes(targetSlug) || catName.includes(targetSlug);
}

// Dải giá preset
const PRICE_PRESETS = [
  { label: 'Dưới 5 triệu',   min: 0,          max: 5_000_000 },
  { label: '5 - 10 triệu',   min: 5_000_000,  max: 10_000_000 },
  { label: '10 - 20 triệu',  min: 10_000_000, max: 20_000_000 },
  { label: 'Trên 20 triệu',  min: 20_000_000, max: Infinity },
];

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const CategoryPage = () => {
  const { slug } = useParams();

  // ── Raw data from API ──────────────────────────────────────────────────────
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPrices, setSelectedPrices] = useState([]);   // array of preset indices
  const [stockOnly, setStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // ── Fetch all real products once ───────────────────────────────────────────
  useEffect(() => {
    setAllProducts([]);
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedPrices([]);
    setStockOnly(false);
    setSortBy('newest');

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await productService.getProducts({ ton_kho: true, limit: 100 });
        if (response?.data?.danhSachSanPham) {
          const mapped = response.data.danhSachSanPham
            .map(p => ({
              id: p.id,
              title: p.tenSanPham,
              name: p.tenSanPham,
              image: p.anhChinh || 'https://via.placeholder.com/300',
              priceRaw: Number(p.giaThapNhat ?? 0),
              price: formatVND(p.giaThapNhat),
              brand: p.tenThuongHieu || '',
              category: p.tenDanhMuc || '',
              categorySlug: p.duongDanUrl || '',
              parentCategory: p.tenDanhMucCha || '',
              parentCategoryId: p.danhMucChaId || null,
              outOfStock: !p.conHang,
            }))
            .filter(p => !p.outOfStock);
          setAllProducts(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [slug]);

  // ── Lọc sản phẩm thuộc danh mục của trang hiện tại ─────────────────────────
  const categoryProducts = useMemo(() => {
    return allProducts.filter(p => matchesCategory(p, slug));
  }, [allProducts, slug]);

  // ── Tiêu đề trang tương ứng với slug ───────────────────────────────────────
  const pageTitle = useMemo(() => {
    if (!slug || slug === 'all' || slug === 'tat-ca') return 'TẤT CẢ SẢN PHẨM';
    if (CATEGORY_MAP[slug]?.title) return CATEGORY_MAP[slug].title;

    const matched = allProducts.find(
      p => slugify(p.category) === slugify(slug) || slugify(p.parentCategory) === slugify(slug) ||
           slugify(p.categorySlug || '') === slugify(slug)
    );
    if (matched) {
      if (slugify(matched.parentCategory) === slugify(slug)) {
        return matched.parentCategory.toUpperCase();
      }
      return matched.category.toUpperCase();
    }

    return slug.replace(/-/g, ' ').toUpperCase();
  }, [slug, allProducts]);

  // ── Danh sách thương hiệu và danh mục con nằm trong danh mục hiện tại ──────
  const brandList = useMemo(() => {
    const map = {};
    categoryProducts.forEach(p => {
      if (p.brand) map[p.brand] = (map[p.brand] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [categoryProducts]);

  const categoryList = useMemo(() => {
    const map = {};
    categoryProducts.forEach(p => {
      if (p.category) map[p.category] = (map[p.category] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [categoryProducts]);

  // ── Áp dụng bộ lọc sidebar + sắp xếp ──────────────────────────────────────
  const displayedProducts = useMemo(() => {
    let result = [...categoryProducts];

    // Brand filter
    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    // Subcategory filter
    if (selectedCategories.length > 0) {
      result = result.filter(p =>
        selectedCategories.some(cat =>
          (p.category || '').toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // Price filter (union of selected presets)
    if (selectedPrices.length > 0) {
      result = result.filter(p =>
        selectedPrices.some(idx => {
          const { min, max } = PRICE_PRESETS[idx];
          return p.priceRaw >= min && p.priceRaw < max;
        })
      );
    }

    // Stock filter
    if (stockOnly) {
      result = result.filter(p => !p.outOfStock);
    }

    // Sort
    if (sortBy === 'price-asc') result.sort((a, b) => a.priceRaw - b.priceRaw);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.priceRaw - a.priceRaw);
    else if (sortBy === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    // 'newest' → keep original API order

    return result;
  }, [categoryProducts, selectedBrands, selectedCategories, selectedPrices, stockOnly, sortBy]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const toggleBrand = (name) =>
    setSelectedBrands(prev =>
      prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]
    );

  const toggleCategory = (name) =>
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );

  const togglePrice = (idx) =>
    setSelectedPrices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );

  const clearAll = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedPrices([]);
    setStockOnly(false);
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    selectedPrices.length > 0 ||
    stockOnly;

  return (
    <div className="storefront-category-page">
      <Header />

      {/* Breadcrumb */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="separator">/</span>
            <span className="current">{pageTitle}</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="category-banner">
        <div className="container">
          <h1 className="category-title">{pageTitle}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="category-main container">

        {/* Sidebar Filters */}
        <aside className="category-sidebar">
          <div className="filter-block">
            <div className="filter-title-row">
              <h3 className="filter-title">LỌC SẢN PHẨM</h3>
              {hasActiveFilters && (
                <button className="filter-clear-btn" onClick={clearAll}>Xóa tất cả</button>
              )}
            </div>

            {/* Thương hiệu */}
            {brandList.length > 0 && (
              <div className="filter-group">
                <h4 className="filter-group-title">THƯƠNG HIỆU</h4>
                <div className="filter-options">
                  {brandList.map(({ name, count }) => (
                    <label key={name} className="filter-label">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={selectedBrands.includes(name)}
                        onChange={() => toggleBrand(name)}
                      />
                      <span className="filter-text">{name}</span>
                      <span className="filter-count">({count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Danh mục */}
            {categoryList.length > 0 && (
              <div className="filter-group">
                <h4 className="filter-group-title">DANH MỤC</h4>
                <div className="filter-options">
                  {categoryList.map(({ name, count }) => (
                    <label key={name} className="filter-label">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={selectedCategories.includes(name)}
                        onChange={() => toggleCategory(name)}
                      />
                      <span className="filter-text">{name}</span>
                      <span className="filter-count">({count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Mức giá */}
            <div className="filter-group">
              <h4 className="filter-group-title">MỨC GIÁ</h4>
              <div className="filter-options">
                {PRICE_PRESETS.map((preset, idx) => (
                  <label key={idx} className="filter-label">
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={selectedPrices.includes(idx)}
                      onChange={() => togglePrice(idx)}
                    />
                    <span className="filter-text">{preset.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tình trạng */}
            <div className="filter-group" style={{ marginBottom: 0 }}>
              <h4 className="filter-group-title">TÌNH TRẠNG</h4>
              <div className="filter-options">
                <label className="filter-label">
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={stockOnly}
                    onChange={() => setStockOnly(prev => !prev)}
                  />
                  <span className="filter-text">Chỉ còn hàng</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="category-content">
          <div className="category-toolbar">
            <div className="toolbar-left">
              {isLoading ? (
                <span>Đang tải...</span>
              ) : (
                <span>
                  Hiển thị <strong>{displayedProducts.length}</strong>
                  {hasActiveFilters && allProducts.length !== displayedProducts.length
                    ? ` / ${allProducts.length}`
                    : ''
                  } sản phẩm
                </span>
              )}
            </div>
            <div className="toolbar-right">
              <label>Sắp xếp theo:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="name-asc">Tên A-Z</option>
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="cat-active-filters">
              {selectedBrands.map(b => (
                <span key={b} className="cat-chip">
                  {b} <button onClick={() => toggleBrand(b)}>×</button>
                </span>
              ))}
              {selectedCategories.map(c => (
                <span key={c} className="cat-chip">
                  {c} <button onClick={() => toggleCategory(c)}>×</button>
                </span>
              ))}
              {selectedPrices.map(idx => (
                <span key={idx} className="cat-chip">
                  {PRICE_PRESETS[idx].label} <button onClick={() => togglePrice(idx)}>×</button>
                </span>
              ))}
              {stockOnly && (
                <span className="cat-chip">
                  Còn hàng <button onClick={() => setStockOnly(false)}>×</button>
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="cat-loading">
              <div className="cat-spinner" />
              <span>Đang tải sản phẩm...</span>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="cat-empty">
              <p>Không có sản phẩm phù hợp với bộ lọc đã chọn.</p>
              {hasActiveFilters && (
                <button className="cat-reset-btn" onClick={clearAll}>Xóa bộ lọc</button>
              )}
            </div>
          ) : (
            <div className="category-product-grid">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CategoryPage;
