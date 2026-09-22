import React, { useState } from 'react';
import { ShoppingCart, ShieldCheck, Truck, Tag, ChevronRight } from 'lucide-react';
import './ProductPurchaseSidebar.css';

const ProductPurchaseSidebar = () => {
  const [quantity, setQuantity] = useState(1);

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="purchase-sidebar-container">
      <div className="tags-wrapper">
        <span className="tag-red">PC BUILD SẴN</span>
        <span className="tag-outline">REVENTU</span>
      </div>

      <h1 className="product-title">REVENTU WARLORD PRO — HIGH-END GAMING</h1>
      
      <div className="sku-container">
        <span className="sku-label">MÃ SẢN PHẨM:</span>
        <span className="sku-value">RVT-BUILD-502</span>
      </div>

      <div className="price-container">
        <div className="price-top-row">
          <span className="original-price">62.000.000đ</span>
          <div className="save-badge">TIẾT KIỆM 7.100.000đ</div>
        </div>
        <div className="price-bottom-row">
          <span className="current-price">54.900.000đ</span>
          <span className="vat-note">Đã bao gồm VAT</span>
        </div>
      </div>

      <div className="stock-status">
        <div className="stock-dot"></div>
        CÒN HÀNG — 5 SẢN PHẨM
      </div>

      <div className="quantity-section">
        <div className="qty-label">SỐ LƯỢNG</div>
        <div className="qty-controls">
          <button className="qty-btn" onClick={decreaseQuantity}>-</button>
          <input type="text" className="qty-input" value={quantity} readOnly />
          <button className="qty-btn" onClick={increaseQuantity}>+</button>
        </div>
        <div className="total-calc">
          <span className="total-label">TỔNG CỘNG</span>
          <span className="total-price">{(54900000 * quantity).toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div className="action-buttons">
        <button className="sidebar-btn-buy-now">
          <ChevronRight size={20} className="btn-icon" />
          MUA NGAY
        </button>
        <button className="sidebar-btn-add-cart">
          <ShoppingCart size={20} className="btn-icon" />
          THÊM VÀO GIỎ HÀNG
        </button>
      </div>

      <div className="policy-grid">
        <div className="policy-item">
          <ShieldCheck size={24} className="policy-icon" />
          <div className="policy-text">
            <strong>BH 36 THÁNG</strong>
            <span>Chính hãng</span>
          </div>
        </div>
        <div className="policy-item">
          <Truck size={24} className="policy-icon" />
          <div className="policy-text">
            <strong>MIỄN PHÍ VC</strong>
            <span>Đơn từ 5tr</span>
          </div>
        </div>
        <div className="policy-item">
          <Tag size={24} className="policy-icon" />
          <div className="policy-text">
            <strong>CAM KẾT GIÁ</strong>
            <span>Tốt nhất</span>
          </div>
        </div>
      </div>

      <div className="mini-specs">
        <div className="mini-specs-header">THÔNG SỐ CHÍNH</div>
        <table className="mini-specs-table">
          <tbody>
            <tr>
              <td>VGA</td>
              <td>RTX 4080 Super 16GB</td>
            </tr>
            <tr>
              <td>CPU</td>
              <td>Ryzen 9 7950X</td>
            </tr>
            <tr>
              <td>RAM</td>
              <td>32GB DDR5-6200</td>
            </tr>
            <tr>
              <td>SSD</td>
              <td>WD Black SN850X 1TB</td>
            </tr>
            <tr>
              <td>PSU</td>
              <td>Corsair RM850x Gold</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductPurchaseSidebar;
