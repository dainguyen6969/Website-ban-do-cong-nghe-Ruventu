import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Truck, Tag, ChevronRight, ArrowLeft } from 'lucide-react';
import './ProductPurchaseSidebar.css';

const ProductPurchaseSidebar = ({ selectedComponent, onClearSelection }) => {
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    
    if (selectedComponent) {
      const existingItemIndex = existingCart.findIndex(item => item.id === selectedComponent.code);
      if (existingItemIndex >= 0) {
        existingCart[existingItemIndex].quantity += quantity;
      } else {
        existingCart.push({ 
          id: selectedComponent.code, 
          title: selectedComponent.name,
          image: selectedComponent.img,
          price: selectedComponent.price,
          originalPrice: selectedComponent.originalPrice,
          quantity: quantity, 
          variant: 'Mặc định' 
        });
      }
    } else {
      const existingItemIndex = existingCart.findIndex(item => item.id === 'RVT-BUILD-502');
      if (existingItemIndex >= 0) {
        existingCart[existingItemIndex].quantity += quantity;
      } else {
        existingCart.push({ 
          id: 'RVT-BUILD-502', 
          title: 'REVENTU WARLORD PRO — HIGH-END GAMING',
          image: '', 
          price: '54.900.000đ',
          originalPrice: '62.000.000đ',
          quantity: quantity, 
          variant: 'Mặc định' 
        });
      }
    }
    
    localStorage.setItem('ruventu_cart', JSON.stringify(existingCart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { quantity } }));
  };

  const handleBuyNow = () => {
    let item;
    if (selectedComponent) {
      item = { 
        id: selectedComponent.code, 
        title: selectedComponent.name,
        image: selectedComponent.img,
        price: selectedComponent.price,
        originalPrice: selectedComponent.originalPrice,
        quantity: quantity, 
        variant: 'Mặc định' 
      };
    } else {
      item = { 
        id: 'RVT-BUILD-502', 
        title: 'REVENTU WARLORD PRO — HIGH-END GAMING',
        image: '', 
        price: '54.900.000đ',
        originalPrice: '62.000.000đ',
        quantity: quantity, 
        variant: 'Mặc định' 
      };
    }
    
    navigate('/checkout', { state: { buyNowItem: item } });
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    return parseInt(priceStr.toString().replace(/\D/g, ''), 10) || 0;
  };

  const currentPrice = selectedComponent ? selectedComponent.price : '54.900.000đ';
  const originalPrice = selectedComponent ? selectedComponent.originalPrice : '62.000.000đ';
  const numCurrentPrice = parsePrice(currentPrice);
  const numOriginalPrice = parsePrice(originalPrice);
  const saveAmount = numOriginalPrice - numCurrentPrice;

  return (
    <div className="purchase-sidebar-container">
      {selectedComponent && (
        <button className="btn-back-to-build" onClick={onClearSelection}>
          <ArrowLeft size={16} /> QUAY LẠI CẤU HÌNH PC
        </button>
      )}

      <div className="tags-wrapper">
        <span className="tag-red">{selectedComponent ? 'LINH KIỆN' : 'PC BUILD SẴN'}</span>
        <span className="tag-outline">{selectedComponent ? selectedComponent.type : 'REVENTU'}</span>
      </div>

      <h1 className="product-title">{selectedComponent ? selectedComponent.name : 'REVENTU WARLORD PRO — HIGH-END GAMING'}</h1>
      
      <div className="sku-container">
        <span className="sku-label">MÃ SẢN PHẨM:</span>
        <span className="sku-value">{selectedComponent ? selectedComponent.code : 'RVT-BUILD-502'}</span>
      </div>

      <div className="price-container">
        <div className="price-top-row">
          <span className="original-price">{originalPrice}</span>
          {saveAmount > 0 && <div className="save-badge">TIẾT KIỆM {saveAmount.toLocaleString('vi-VN')}đ</div>}
        </div>
        <div className="price-bottom-row">
          <span className="current-price">{currentPrice}</span>
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
          <span className="total-price">{(numCurrentPrice * quantity).toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div className="action-buttons">
        <button className="sidebar-btn-buy-now" onClick={handleBuyNow}>
          <ChevronRight size={20} className="btn-icon" />
          MUA NGAY
        </button>
        <button 
          className="sidebar-btn-add-cart"
          onClick={handleAddToCart}
        >
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

      {!selectedComponent && (
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
      )}
    </div>
  );
};

export default ProductPurchaseSidebar;
