import React, { useState } from 'react';
import { ShoppingCart, ShieldCheck, Truck, Tag, ChevronRight } from 'lucide-react';
import './ProductPurchaseRightSidebar.css';

const ProductPurchaseRightSidebar = ({ product }) => {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  // Map icons from strings
  const renderIcon = (iconName) => {
    switch(iconName) {
      case 'shield': return <ShieldCheck size={24} className="policy-icon" />;
      case 'truck': return <Truck size={24} className="policy-icon" />;
      case 'tag': return <Tag size={24} className="policy-icon" />;
      default: return <ShieldCheck size={24} className="policy-icon" />;
    }
  };

  return (
    <div className="purchase-right-sidebar-container">
      <div className="tags-wrapper">
        {product.tags.map((tag, index) => (
          <span key={index} className={index === 0 ? "tag-red" : "tag-outline"}>{tag}</span>
        ))}
      </div>

      <h1 className="product-title">{product.name}</h1>
      
      <div className="sku-container">
        <span className="sku-label">MÃ SẢN PHẨM:</span>
        <span className="sku-value">{product.id}</span>
      </div>

      {product.discountAmount > 0 && (
        <div className="price-container">
          <div className="price-top-row">
            <span className="original-price">{product.originalPrice.toLocaleString('vi-VN')}đ</span>
            <div className="save-badge">TIẾT KIỆM {product.discountAmount.toLocaleString('vi-VN')}đ</div>
          </div>
          <div className="price-bottom-row">
            <span className="current-price">{product.currentPrice.toLocaleString('vi-VN')}đ</span>
            <span className="vat-note">Đã bao gồm VAT</span>
          </div>
        </div>
      )}

      {/* Stock status - matching Image 3 style which is black box with red dot */}
      <div className="stock-status-box">
        <div className="stock-dot"></div>
        CÒN HÀNG — {product.stock} SẢN PHẨM
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
          <span className="total-price">{(product.currentPrice * quantity).toLocaleString('vi-VN')}đ</span>
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
        {product.policies.map((policy, index) => (
          <div key={index} className="policy-item">
            {renderIcon(policy.icon)}
            <div className="policy-text">
              <strong>{policy.title}</strong>
              <span>{policy.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mini-specs">
        <div className="mini-specs-header">THÔNG SỐ CHÍNH</div>
        <table className="mini-specs-table">
          <tbody>
            {product.specsSummary.map((spec, index) => (
              <tr key={index}>
                <td>{spec.label}</td>
                <td>{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductPurchaseRightSidebar;
