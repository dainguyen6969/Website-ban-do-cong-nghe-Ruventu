import React, { useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { mockPcBuildProducts } from '../data/categoryData';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAccountNotFound = location.state?.type === 'account';
  
  // Use a subset of products for "SẢN PHẨM NỔI BẬT" section
  const suggestedProducts = useMemo(() => {
    return mockPcBuildProducts.slice(0, 4);
  }, []);

  const searchKeywords = [
    'RTX 4090', 'Ryzen 9 7950X', 'DDR5 RAM', 'SSD PCIe 5.0', 
    'Bàn phím cơ', 'Chuột gaming', 'Mainboard Z790', 'PC Build Sẵn'
  ];

  return (
    <div className="not-found-page">
      <Header />
      
      <div className="not-found-banner">
        <div className="container nf-banner-content">
          <div className="error-left">
            <div className="error-code-outline">404</div>
          </div>
          
          <div className="error-right">
            <div className="error-badge">
              <div className="white-square"></div>
              <span>TRANG KHÔNG TỒN TẠI</span>
            </div>
            
            <h1 className="error-title">
              {isAccountNotFound ? 'TÀI KHOẢN KHÔNG TỒN TẠI' : 'SẢN PHẨM KHÔNG TỒN TẠI'}<br />
              {!isAccountNotFound && <span className="text-red">HOẶC ĐÃ NGỪNG KINH DOANH</span>}
            </h1>
            
            <p className="error-description">
              {isAccountNotFound
                ? 'Tài khoản của bạn đã bị khóa hoặc không còn tồn tại trên hệ thống. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.'
                : 'Sản phẩm bạn đang tìm kiếm có thể đã bị xóa, ẩn khỏi danh mục, hoặc liên kết không còn hợp lệ. Vui lòng kiểm tra lại hoặc tìm sản phẩm thay thế bên dưới.'
              }
            </p>
            
            <div className="error-actions">
              <Link to="/" className="btn-back-home">
                <ArrowLeft size={16} />
                <span>QUAY VỀ TRANG CHỦ</span>
              </Link>
              <button 
                className="btn-search-trigger"
                onClick={() => {
                  const searchInput = document.querySelector('.search-bar input');
                  if (searchInput) {
                    searchInput.focus();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <Search size={16} />
                <span>TÌM KIẾM SẢN PHẨM</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="error-details-wrapper">
        <div className="container details-grid">
          <div className="detail-item">
            <span className="detail-label">MÃ LỖI</span>
            <span className="detail-value">{isAccountNotFound ? 'HTTP 403' : 'HTTP 404'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">NGUYÊN NHÂN</span>
            <span className="detail-value">{isAccountNotFound ? 'Tài khoản không hoạt động' : 'Sản phẩm không tồn tại'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">TRẠNG THÁI</span>
            <span className="detail-value">Đã ngừng kinh doanh</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">GỢI Ý</span>
            <span className="detail-value">Xem sản phẩm tương tự bên dưới</span>
          </div>
        </div>
      </div>

      <div className="container suggested-section">
        <div className="section-header">
          <h2 className="section-title"><span>|</span> SẢN PHẨM NỔI BẬT</h2>
          <Link to="/category/linh-kien" className="view-all-link">XEM TẤT CẢ &rarr;</Link>
        </div>
        
        <div className="products-grid">
          {suggestedProducts.map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
        
        <div className="quick-search-box">
          <h3 className="quick-search-title">TÌM KIẾM NHANH</h3>
          <div className="keyword-tags">
            {searchKeywords.map((keyword, index) => (
              <button 
                key={index} 
                className="keyword-tag"
                onClick={() => navigate(`/search?q=${encodeURIComponent(keyword)}`)}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
