import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './SuccessPage.css';

const SuccessPage = () => {
  const location = useLocation();
  const orderCode = location.state?.orderCode || 'RV-XXXXXX';

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
              <span className="code">{orderCode}</span>
            </div>
            
            <p className="success-message">
              Cảm ơn bạn đã đặt hàng tại <strong>Ruventu Tech</strong>. Chúng tôi sẽ liên hệ xác nhận qua số điện thoại trong vòng 30 phút.
            </p>
            
            <div className="divider-line"></div>
            
            <div className="success-actions" style={{marginTop: '20px'}}>
              <Link to="/" className="btn-home">
                VỀ TRANG CHỦ
              </Link>
              <Link to="/products" className="btn-continue">
                Tiếp tục mua sắm
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
