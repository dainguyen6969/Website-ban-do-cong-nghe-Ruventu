import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { mockPcBuildProducts, mockLinhKien, mockGamingGear } from '../data/categoryData';
import './CategoryPage.css';

const categoryMap = {
  'pc-build': {
    title: 'PC BUILD SẴN',
    data: mockPcBuildProducts,
    filters: [
      { name: 'Thương hiệu', options: ['Ruventu', 'Asus', 'Gigabyte', 'MSI'] },
      { name: 'Mức giá', options: ['Dưới 15 triệu', '15 - 25 triệu', '25 - 50 triệu', 'Trên 50 triệu'] }
    ]
  },
  'linh-kien': {
    title: 'LINH KIỆN KHỦNG',
    data: mockLinhKien,
    filters: [
      { name: 'Thương hiệu', options: ['ASUS', 'MSI', 'Gigabyte', 'Corsair', 'Intel', 'AMD'] },
      { name: 'Loại linh kiện', options: ['VGA', 'Mainboard', 'CPU', 'RAM', 'SSD', 'Nguồn (PSU)'] },
      { name: 'Mức giá', options: ['Dưới 5 triệu', '5 - 10 triệu', '10 - 20 triệu', 'Trên 20 triệu'] }
    ]
  },
  'gaming-gear': {
    title: 'GAMING GEAR',
    data: mockGamingGear,
    filters: [
      { name: 'Thương hiệu', options: ['Razer', 'Logitech', 'Corsair', 'SteelSeries', 'Keychron'] },
      { name: 'Loại sản phẩm', options: ['Bàn phím', 'Chuột', 'Tai nghe', 'Lót chuột', 'Ghế gaming'] },
      { name: 'Mức giá', options: ['Dưới 1 triệu', '1 - 2 triệu', '2 - 5 triệu', 'Trên 5 triệu'] }
    ]
  }
};

const CategoryPage = () => {
  const { slug } = useParams();
  const categoryInfo = categoryMap[slug] || categoryMap['linh-kien']; // Fallback
  
  const [products, setProducts] = useState(categoryInfo.data);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    setProducts(categoryInfo.data);
  }, [slug, categoryInfo.data]);

  return (
    <div className="storefront-category-page">
      <Header />
      
      {/* Breadcrumb */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="separator">/</span>
            <span className="current">{categoryInfo.title}</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="category-banner">
        <div className="container">
          <h1 className="category-title">{categoryInfo.title}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="category-main container">
        
        {/* Sidebar Filters */}
        <aside className="category-sidebar">
          <div className="filter-block">
            <h3 className="filter-title">LỌC SẢN PHẨM</h3>
            
            {categoryInfo.filters.map((filterGroup, idx) => (
              <div key={idx} className="filter-group">
                <h4 className="filter-group-title">{filterGroup.name}</h4>
                <div className="filter-options">
                  {filterGroup.options.map((opt, oIdx) => (
                    <label key={oIdx} className="filter-label">
                      <input type="checkbox" className="filter-checkbox" />
                      <span className="filter-text">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="category-content">
          <div className="category-toolbar">
            <div className="toolbar-left">
              <span>Hiển thị <strong>{products.length}</strong> sản phẩm</span>
            </div>
            <div className="toolbar-right">
              <label>Sắp xếp theo:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="name-asc">Tên A-Z</option>
              </select>
            </div>
          </div>

          <div className="category-product-grid">
            {products.map((product, index) => (
              <ProductCard key={index} product={product} />
            ))}
          </div>
          
          {/* Pagination UI */}
          <div className="category-pagination">
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <button className="page-btn">3</button>
            <span className="page-dots">...</span>
            <button className="page-btn">&gt;</button>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default CategoryPage;
