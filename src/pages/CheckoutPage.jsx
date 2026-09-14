import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [deliveryMethod, setDeliveryMethod] = useState('shipping');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [checkoutItems, setCheckoutItems] = useState([]);

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    const selectedItems = items.filter(item => item.selected !== false);
    
    if (selectedItems.length === 0) {
      navigate('/cart');
    } else {
      setCheckoutItems(selectedItems);
    }
  }, [navigate]);

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    return parseInt(priceStr.toString().replace(/\D/g, ''), 10) || 0;
  };

  const totalPrice = checkoutItems.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
  const shippingFee = deliveryMethod === 'shipping' ? (totalPrice > 5000000 ? 0 : 30000) : 0;
  const finalTotal = totalPrice + shippingFee;

  const handlePlaceOrder = () => {
    const items = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    const remainingItems = items.filter(item => item.selected === false);
    localStorage.setItem('ruventu_cart', JSON.stringify(remainingItems));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    navigate('/success');
  };

  return (
    <div className="checkout-page-wrapper">
      <Header />
      
      {/* Red Header Bar */}
      <div className="checkout-page-header">
        <div className="container">
          <div className="checkout-page-title">
            <Link to="/cart" style={{color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center'}}>
              <ArrowLeft size={18} style={{marginRight: '8px'}} /> THÔNG TIN THANH TOÁN
            </Link>
          </div>
          <div className="checkout-breadcrumb">
            <Link to="/cart" style={{color: '#888', textDecoration: 'none'}}>GIỎ HÀNG</Link> 
            <span>&gt;</span> 
            <span className="current">THANH TOÁN</span>
            <span>&gt;</span> 
            <span style={{color: '#888'}}>XÁC NHẬN</span>
          </div>
        </div>
      </div>

      <div className="checkout-page-content container">
        <div className="checkout-main">
          
          {/* Contact Info */}
          <div className="checkout-section">
            <h3 className="section-title">THÔNG TIN LIÊN HỆ</h3>
            <div className="form-group">
              <label className="form-label">HỌ VÀ TÊN</label>
              <input type="text" className="form-input" placeholder="Nhập họ và tên..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SỐ ĐIỆN THOẠI</label>
                <input type="tel" className="form-input" placeholder="09xx xxx xxx" />
              </div>
              <div className="form-group">
                <label className="form-label">EMAIL</label>
                <input type="email" className="form-input" placeholder="ten@email.com" />
              </div>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="checkout-section">
            <h3 className="section-title">PHƯƠNG THỨC NHẬN HÀNG</h3>
            <div className="selection-boxes">
              <div 
                className={`selection-box ${deliveryMethod === 'shipping' ? 'active' : ''}`}
                onClick={() => setDeliveryMethod('shipping')}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Giao hàng tận nơi</h4>
                  <p>Giao trong 1-3 ngày làm việc</p>
                  <span className="badge-free">MIỄN PHÍ TỪ 5TR</span>
                </div>
              </div>
              <div 
                className={`selection-box ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                onClick={() => setDeliveryMethod('pickup')}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Nhận tại cửa hàng</h4>
                  <p>Sẵn sàng sau 2-4 giờ</p>
                  <span className="badge-free badge-green">MIỄN PHÍ VẬN CHUYỂN</span>
                </div>
              </div>
            </div>

            {deliveryMethod === 'shipping' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">TỈNH / THÀNH PHỐ</label>
                    <select className="form-input">
                      <option>Hà Nội</option>
                      <option>TP. Hồ Chí Minh</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">PHƯỜNG / XÃ</label>
                    <select className="form-input">
                      <option>Cầu Giấy</option>
                      <option>Đống Đa</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ĐỊA CHỈ CỤ THỂ</label>
                  <input type="text" className="form-input" placeholder="Số nhà, tên đường, khu dân cư..." />
                </div>
              </>
            )}
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h3 className="section-title">PHƯƠNG THỨC THANH TOÁN</h3>
            <div className="selection-boxes" style={{flexDirection: 'column', gap: '10px'}}>
              <div 
                className={`selection-box ${paymentMethod === 'cod' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cod')}
                style={{padding: '15px 20px'}}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Thanh toán khi nhận hàng (COD)</h4>
                  <p>Kiểm tra hàng trước khi thanh toán</p>
                </div>
              </div>
              <div 
                className={`selection-box ${paymentMethod === 'bank' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('bank')}
                style={{padding: '15px 20px'}}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Chuyển khoản QR</h4>
                  <p>Quét mã VietQR - xác nhận tự động</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Notes */}
          <div className="checkout-section">
            <h3 className="section-title">GHI CHÚ ĐƠN HÀNG</h3>
            <div className="form-group" style={{marginBottom: 0}}>
              <textarea 
                className="form-input" 
                rows="3" 
                placeholder="Ghi chú thêm cho đơn hàng (ví dụ: giao ngoài giờ hành chính, gọi trước khi giao...)"
                style={{resize: 'vertical'}}
              ></textarea>
            </div>
          </div>

        </div>

        {/* Sidebar Order Summary */}
        <div className="checkout-sidebar">
          <div className="sidebar-header">
            ĐƠN HÀNG CỦA BẠN
          </div>
          
          <div className="sidebar-items">
            {checkoutItems.map(item => (
              <div key={item.id} className="sidebar-item">
                <img src={item.image} alt={item.title} />
                <div className="sidebar-item-details">
                  <h4>{item.title}</h4>
                  <p>{item.variant || 'Tiêu chuẩn'}</p>
                  <div className="sidebar-item-price">
                    <span className="qty">x{item.quantity}</span>
                    <span className="price">{item.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sidebar-summary">
            <div className="summary-row">
              <span>Tạm tính</span>
              <span>{totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              {shippingFee === 0 ? (
                <span style={{backgroundColor: '#111', color: 'white', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold'}}>MIỄN PHÍ</span>
              ) : (
                <span>{shippingFee.toLocaleString('vi-VN')}đ</span>
              )}
            </div>
            <div className="summary-row total">
              <span>TỔNG TIỀN</span>
              <span className="price">{finalTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <button className="btn-confirm-order" onClick={handlePlaceOrder}>
              XÁC NHẬN ĐẶT HÀNG &rarr;
            </button>
          </div>
          
          <div className="sidebar-trust">
            <span><ShieldCheck size={14} /> Bảo hành chính hãng</span>
            <span><Truck size={14} /> Giao hàng toàn quốc</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
