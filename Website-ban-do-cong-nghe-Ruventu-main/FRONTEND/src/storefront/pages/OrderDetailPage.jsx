import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowLeft, Check, HelpCircle } from 'lucide-react';
import './OrderDetailPage.css';

import productImg1 from '../assets/hero.png';

const OrderDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const orderId = id || 'RUV-98237';

  // Mock data for orders
  const ordersData = {
    'RUV-98237': {
      statusText: 'ĐANG GIAO HÀNG',
      isDelivered: false,
      date: '28/08/2026',
      total: '38,460,000đ'
    },
    'RV-20240801-001': {
      statusText: 'ĐÃ GIAO',
      isDelivered: true,
      date: '01/08/2024',
      total: '34,990,000đ'
    },
    'RV-20240715-002': {
      statusText: 'ĐÃ GIAO',
      isDelivered: true,
      date: '15/07/2024',
      total: '18,450,000đ'
    }
  };

  const currentOrder = ordersData[orderId] || ordersData['RUV-98237'];

  return (
    <div className="order-detail-page">
      <Header />
      
      <main className="order-main-content">
        <div className="container">
          
          {/* Top Card: Title and Timeline */}
          <div className="order-card top-card">
            
            <div className="order-header-row">
              <button className="back-btn-outline" onClick={() => navigate(-1)}>
                <ArrowLeft size={14} /> QUAY LẠI
              </button>
              
              <div className="order-title-wrapper">
                <div className="red-vertical-line"></div>
                <h1 className="order-title">CHI TIẾT ĐƠN HÀNG <span className="highlight">#{orderId}</span></h1>
                <span className={`order-status-tag ${currentOrder.isDelivered ? 'success' : ''}`}>
                  {currentOrder.statusText}
                </span>
              </div>
              
              <div className="order-date">
                Ngày đặt: {currentOrder.date}
              </div>
            </div>

            <div className="order-timeline-container">
              <div className="horizontal-timeline">
                
                {/* Connecting Line Background */}
                <div className="timeline-line"></div>

                <div className="timeline-node done">
                  <div className="node-icon"><Check size={14} color="#fff" /></div>
                  <span className="node-text">ĐẶT HÀNG</span>
                </div>

                <div className="timeline-node done">
                  <div className="node-icon"><Check size={14} color="#fff" /></div>
                  <span className="node-text">CHỜ XÁC NHẬN</span>
                </div>

                <div className="timeline-node done">
                  <div className="node-icon"><Check size={14} color="#fff" /></div>
                  <span className="node-text">ĐÓNG GÓI</span>
                </div>

                <div className={`timeline-node ${currentOrder.isDelivered ? 'done' : 'active'}`}>
                  <div className="node-icon">{currentOrder.isDelivered && <Check size={14} color="#fff" />}</div>
                  <span className={`node-text ${!currentOrder.isDelivered ? 'highlight' : ''}`}>ĐANG GIAO</span>
                </div>

                <div className={`timeline-node ${currentOrder.isDelivered ? 'done' : 'pending'}`}>
                  <div className="node-icon">{currentOrder.isDelivered && <Check size={14} color="#fff" />}</div>
                  <span className="node-text">HOÀN THÀNH</span>
                </div>

              </div>
            </div>

          </div>

          {/* Bottom Grid: Products and Summaries */}
          <div className="order-grid">
            
            {/* Left Column: Products */}
            <div className="order-products-col">
              <div className="order-card">
                
                <div className="card-header">
                  <div className="red-vertical-line small"></div>
                  <h2>SẢN PHẨM ĐẶT MUA</h2>
                </div>

                <table className="order-products-table">
                  <thead>
                    <tr>
                      <th className="col-product">SẢN PHẨM</th>
                      <th className="col-price">ĐƠN GIÁ</th>
                      <th className="col-qty">SỐ LƯỢNG</th>
                      <th className="col-total">THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="col-product">
                        <div className="product-info-cell">
                          <img src={productImg1} alt="ASUS ROG STRIX RTX 4090" className="product-img" />
                          <div className="product-details">
                            <h4 className="product-name">ASUS ROG STRIX RTX 4090 OC 24GB</h4>
                            <p className="product-variant">Phiên bản: Overclock Edition</p>
                          </div>
                        </div>
                      </td>
                      <td className="col-price">24,990,000đ</td>
                      <td className="col-qty">1</td>
                      <td className="col-total highlight">24,990,000đ</td>
                    </tr>
                    <tr>
                      <td className="col-product">
                        <div className="product-info-cell">
                          <img src={productImg1} alt="Corsair Dominator" className="product-img" />
                          <div className="product-details">
                            <h4 className="product-name">Corsair Dominator Platinum DDR5 64GB 6400MHz</h4>
                            <p className="product-variant">Màu sắc: Trắng / Kit: 2x32GB</p>
                          </div>
                        </div>
                      </td>
                      <td className="col-price">6,490,000đ</td>
                      <td className="col-qty">1</td>
                      <td className="col-total highlight">6,490,000đ</td>
                    </tr>
                    <tr>
                      <td className="col-product">
                        <div className="product-info-cell">
                          <img src={productImg1} alt="Samsung 990 Pro" className="product-img" />
                          <div className="product-details">
                            <h4 className="product-name">Samsung 990 Pro NVMe SSD PCIe 5.0</h4>
                            <p className="product-variant">Dung lượng: 2TB</p>
                          </div>
                        </div>
                      </td>
                      <td className="col-price">3,990,000đ</td>
                      <td className="col-qty">2</td>
                      <td className="col-total highlight">7,980,000đ</td>
                    </tr>
                  </tbody>
                </table>

                <div className="order-cancel-section">
                  <p className="cancel-hint">Đơn hàng đang được vận chuyển — không thể hủy ở giai đoạn này.</p>
                  <button className="btn-cancel disabled" disabled>HỦY ĐƠN HÀNG</button>
                </div>

              </div>
            </div>

            {/* Right Column: Summaries */}
            <div className="order-summary-col">
              
              <div className="order-card summary-card">
                <div className="card-header border-bottom">
                  <h3>THÔNG TIN NGƯỜI NHẬN</h3>
                </div>
                <div className="summary-content">
                  <div className="summary-row">
                    <span className="summary-label">Họ tên</span>
                    <span className="summary-value">Nguyễn Văn An</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Điện thoại</span>
                    <span className="summary-value">0912 345 678</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Tỉnh/Thành phố</span>
                    <span className="summary-value">Hà Nội</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Phường/Xã</span>
                    <span className="summary-value">Cầu Giấy</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Địa chỉ</span>
                    <span className="summary-value">12 Đường Xuân Thủy, KĐT Dịch Vọng</span>
                  </div>
                </div>
              </div>

              <div className="order-card summary-card">
                <div className="card-header border-bottom">
                  <h3>THANH TOÁN</h3>
                </div>
                <div className="summary-content">
                  <div className="summary-row">
                    <span className="summary-label">Phương thức</span>
                    <span className="summary-value">Chuyển khoản QR</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Trạng thái</span>
                    <span className="summary-value"><span className="status-tag-green">ĐÃ THANH TOÁN</span></span>
                  </div>
                </div>
              </div>

              <div className="order-card summary-card">
                <div className="card-header border-bottom">
                  <h3>CHI PHÍ ĐƠN HÀNG</h3>
                </div>
                <div className="summary-content">
                  <div className="summary-row">
                    <span className="summary-label">Tạm tính</span>
                    <span className="summary-value">39,460,000đ</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Phí vận chuyển</span>
                    <span className="summary-value">Miễn phí</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Giảm giá</span>
                    <span className="summary-value highlight">-1,000,000đ</span>
                  </div>
                </div>
                <div className="summary-footer">
                  <span className="total-label">TỔNG TIỀN</span>
                  <span className="total-value">{currentOrder.total}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <Footer />
      
      <div className="floating-help">
        <HelpCircle size={24} color="#fff" />
      </div>
    </div>
  );
};

export default OrderDetailPage;
