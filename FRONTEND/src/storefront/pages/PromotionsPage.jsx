import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { mockPcBuildProducts, mockLinhKien, mockGamingGear } from '../data/categoryData';
import './CategoryPage.css';

const PromotionsPage = () => {
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    // Combine all mock data and filter those with a discount
    const allProducts = [...mockPcBuildProducts, ...mockLinhKien, ...mockGamingGear];
    const discountedProducts = allProducts.filter(p => p.discount);
    setProducts(discountedProducts);
  }, []);

  return (
    <div className="storefront-category-page">
      <Header />
      
      {/* Breadcrumb */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="separator">/</span>
            <span className="current">Khuyến Mãi</span>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="category-banner" style={{ background: 'linear-gradient(90deg, #8b0000, #ff0000)' }}>
        <div className="container">
          <h1 className="category-title" style={{ color: '#fff', textTransform: 'uppercase' }}>CHƯƠNG TRÌNH KHUYẾN MÃI</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="category-main container" style={{ display: 'block' }}>
        {/* Product Grid Area (Full Width since no sidebar) */}
        <div className="category-content">
          <div className="category-toolbar">
            <div className="toolbar-left">
              <span>Hiển thị <strong>{products.length}</strong> sản phẩm khuyến mãi</span>
            </div>
            <div className="toolbar-right">
              <label>Sắp xếp theo:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="discount-desc">Giảm giá nhiều nhất</option>
              </select>
            </div>
          </div>

          <div className="category-product-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {products.map((product, index) => (
              <ProductCard key={index} product={product} />
            ))}
          </div>
          
          {/* Pagination UI */}
          <div className="category-pagination">
            <button className="page-btn active">1</button>
            <button className="page-btn">2</button>
            <span className="page-dots">...</span>
            <button className="page-btn">&gt;</button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PromotionsPage;
