import React, { useState } from 'react';
import { ShoppingCart, ShieldCheck, Truck, Tag, ChevronRight } from 'lucide-react';
import './ProductPurchaseRightSidebar.css';

const ProductPurchaseRightSidebar = ({ product }) => {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    
    // Save to localStorage
    const existingCart = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    const existingItemIndex = existingCart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push({ 
        id: product.id, 
        title: product.name,
        image: product.images?.[0] || '', // Fallback for image
        price: product.currentPrice.toLocaleString('vi-VN') + 'đ',
        originalPrice: product.originalPrice.toLocaleString('vi-VN') + 'đ',
        quantity: quantity, 
        variant: 'Mặc định' 
      });
    }
    
    localStorage.setItem('ruventu_cart', JSON.stringify(existingCart));

    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { quantity } }));
  };

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

      <div className="stock-status-box">
        {product.stock > 0 ? (
          <>
            <div className="stock-dot"></div>
            CÒN HÀNG — {product.stock} SẢN PHẨM
          </>
        ) : (
          <>
            <div className="stock-dot" style={{ backgroundColor: '#666' }}></div>
            HẾT HÀNG
          </>
        )}
      </div>

      <div className="quantity-section">
        <div className="qty-label">SỐ LƯỢNG</div>
        <div className="qty-controls">
          <button className="qty-btn" onClick={decreaseQuantity} disabled={product.stock <= 0}>-</button>
          <input type="text" className="qty-input" value={product.stock > 0 ? quantity : 0} readOnly disabled={product.stock <= 0} />
          <button className="qty-btn" onClick={increaseQuantity} disabled={product.stock <= 0}>+</button>
        </div>
        <div className="total-calc">
          <span className="total-label">TỔNG CỘNG</span>
          <span className="total-price">{(product.currentPrice * quantity).toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div className="action-buttons">
        <button className="sidebar-btn-buy-now" disabled={product.stock <= 0}>
          <ChevronRight size={20} className="btn-icon" />
          {product.stock > 0 ? 'MUA NGAY' : 'HẾT HÀNG'}
        </button>
        <button 
          className="sidebar-btn-add-cart" 
          disabled={product.stock <= 0}
          onClick={handleAddToCart}
        >
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
