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
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Giới thiệu</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Tuyển dụng</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Tin tức</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Chính sách bảo hành</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Điều khoản dịch vụ</span></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>HỖ TRỢ</h4>
            <ul>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Hướng dẫn mua hàng</span></li>
              <li><Link to="/order-lookup">Kiểm tra đơn hàng</Link></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Đổi trả & hoàn tiền</span></li>
              <li><Link to="/warranty-lookup">Tra cứu bảo hành</Link></li>
              <li><a href="tel:19009999">Liên hệ CSKH</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>DANH MỤC</h4>
            <ul>
              <li><Link to="/category/vga">Card đồ họa (VGA)</Link></li>
              <li><Link to="/category/cpu">Vi xử lý (CPU)</Link></li>
              <li><Link to="/search?q=RAM%20DDR5">RAM DDR5</Link></li>
              <li><Link to="/category/ssd">Ổ cứng SSD</Link></li>
              <li><Link to="/category/psu">Nguồn máy tính</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>KẾT NỐI</h4>
            <ul>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Facebook</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">YouTube</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Discord</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Zalo OA</span></li>
              <li><span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">TikTok</span></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="container bottom-container">
          <div className="copyright">
            <div className="footer-brand" role="img" aria-label="Ruventu">
              <svg className="footer-logo-image" viewBox="150 125 190 190" aria-hidden="true" focusable="false">
                <image href={logoTransparent} width="500" height="500" />
              </svg>
              <span aria-hidden="true">RUVENTU</span>
            </div>
            <p>&copy; 2024 Ruventu Technology. Tất cả quyền được bảo lưu.</p>
          </div>
          <div className="bottom-links">
            <Link to="/404" className="quick-test-btn" style={{color: '#ff0000', fontWeight: 'bold', border: '1px solid #ff0000', padding: '2px 8px', borderRadius: '4px'}}>Test Trang 404</Link>
            <span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Chính sách bảo mật</span>
            <span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Điều khoản</span>
            <span className="footer-unavailable" aria-disabled="true" title="Chưa có trang hoặc đường dẫn chính thức">Sitemap</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
