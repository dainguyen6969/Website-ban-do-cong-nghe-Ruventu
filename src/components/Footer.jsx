import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logoTransparent from '../assets/reventu_transparent.png';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-links-section">
        <div className="container footer-links-container">
          <div className="footer-col">
            <h4>VỀ RUVENTU</h4>
            <ul>
              <li><a href="#">Giới thiệu</a></li>
              <li><a href="#">Tuyển dụng</a></li>
              <li><a href="#">Tin tức</a></li>
              <li><a href="#">Chính sách bảo hành</a></li>
              <li><a href="#">Điều khoản dịch vụ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>HỖ TRỢ</h4>
            <ul>
              <li><a href="#">Hướng dẫn mua hàng</a></li>
              <li><a href="#">Kiểm tra đơn hàng</a></li>
              <li><a href="#">Đổi trả & hoàn tiền</a></li>
              <li><a href="#">Bảo hành sản phẩm</a></li>
              <li><a href="#">Liên hệ CSKH</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>DANH MỤC</h4>
            <ul>
              <li><a href="#">Card đồ họa (VGA)</a></li>
              <li><a href="#">Vi xử lý (CPU)</a></li>
              <li><a href="#">RAM DDR5</a></li>
              <li><a href="#">Ổ cứng SSD</a></li>
              <li><a href="#">Nguồn máy tính</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>KẾT NỐI</h4>
            <ul>
              <li><a href="#">Facebook</a></li>
              <li><a href="#">YouTube</a></li>
              <li><a href="#">Discord</a></li>
              <li><a href="#">Zalo OA</a></li>
              <li><a href="#">TikTok</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="container bottom-container">
          <div className="copyright">
            <img src={logoTransparent} alt="Ruventu Logo" className="footer-logo-image" />
            <p>&copy; 2024 Ruventu Technology. Tất cả quyền được bảo lưu.</p>
          </div>
          <div className="bottom-links">
            <Link to="/404" className="quick-test-btn" style={{color: '#ff0000', fontWeight: 'bold', border: '1px solid #ff0000', padding: '2px 8px', borderRadius: '4px'}}>Test Trang 404</Link>
            <a href="#">Chính sách bảo mật</a>
            <a href="#">Điều khoản</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
