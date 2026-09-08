import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './SuccessPage.css';

const SuccessPage = () => {
  return (
    <div className="success-page-wrapper">
      <Header />
      
      <div className="success-page-content container">
        <div className="success-box">
          <div className="success-header">
            <div className="success-icon">
              <Check size={20} strokeWidth={3} />
            </div>
            <h2>ĐẶT HÀNG THÀNH CÔNG</h2>
          </div>
          
          <div className="success-body">
            <div className="order-code-box">
              <span className="label">Mã đơn hàng</span>
              <span className="code">RV-33203029</span>
            </div>
            
            <p className="success-message">
              Cảm ơn bạn đã đặt hàng tại <strong>Ruventu Tech</strong>. Chúng tôi sẽ liên hệ xác nhận qua số điện thoại trong vòng 30 phút.
            </p>
            
            <div className="divider-line"></div>
            
            <div className="total-payment">
              <span className="label">TỔNG THANH TOÁN</span>
              <span className="amount">47.260.000đ</span>
            </div>
            
            <div className="success-actions">
              <Link to="/" className="btn-home">
                VỀ TRANG CHỦ
              </Link>
              <Link to="/" className="btn-continue">
                Tiếp tục mua
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SuccessPage;
