import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Truck, Tag, ChevronRight } from 'lucide-react';
import { cartService } from '../../shared/services/cartService';
import './ProductPurchaseRightSidebar.css';

const ProductPurchaseRightSidebar = ({ product, selectedVariantId }) => {
  const [quantity, setQuantity] = useState(1);
  const [quantityInCart, setQuantityInCart] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedVariantId) {
      setQuantityInCart(0);
      return;
    }
    const fetchCart = async () => {
      try {
        const res = await cartService.getCurrentCart();
        const items = res?.data?.data?.items || [];
        const item = items.find(i => i.phienBanId === selectedVariantId);
        if (item) {
          setQuantityInCart(item.soLuong);
        } else {
          setQuantityInCart(0);
        }
      } catch (e) {
        console.error("Lỗi fetch giỏ hàng trong sidebar", e);
      }
    };
    fetchCart();
    window.addEventListener('cartUpdated', fetchCart);
    return () => window.removeEventListener('cartUpdated', fetchCart);
  }, [selectedVariantId]);

  if (!product) return null;

  const availableStock = Math.max(0, product.stock - quantityInCart);

  const increaseQuantity = () => setQuantity(prev => (prev < availableStock ? prev + 1 : prev));
  const decreaseQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = async () => {
    if (product.stock <= 0) return;
    if (!selectedVariantId) {
      alert('Vui lòng chọn một phiên bản sản phẩm!');
      return;
    }
    
    try {
      await cartService.addItem(selectedVariantId, quantity);
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { quantity } }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại.');
    }
  };

  const handleBuyNow = async () => {
    if (product.stock <= 0) return;
    if (!selectedVariantId) {
      alert('Vui lòng chọn một phiên bản sản phẩm!');
      return;
    }
    
    try {
      const res = await cartService.addItem(selectedVariantId, quantity);
      const cartItemId = res.data?.data?.id; // backend returns the mutated cart item
      if (cartItemId) {
        navigate('/checkout', { state: { cartItemIds: [cartItemId] } });
      } else {
        // Fallback if API doesn't return the exact item ID, might need to fetch cart
        navigate('/cart');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý mua ngay.');
    }
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
            {quantityInCart > 0 && <span style={{fontSize: '11px', color: '#ffb3b3', marginLeft: '8px'}}>(Trong giỏ: {quantityInCart})</span>}
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
          <button className="qty-btn" onClick={decreaseQuantity} disabled={availableStock <= 0 || quantity <= 1}>-</button>
          <input type="text" className="qty-input" value={availableStock > 0 ? quantity : 0} readOnly disabled={availableStock <= 0} />
          <button className="qty-btn" onClick={increaseQuantity} disabled={availableStock <= 0 || quantity >= availableStock}>+</button>
        </div>
        <div className="total-calc">
          <span className="total-label">TỔNG CỘNG</span>
          <span className="total-price">{(product.currentPrice * (availableStock > 0 ? quantity : 0)).toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          className="sidebar-btn-buy-now" 
          disabled={availableStock <= 0}
          onClick={handleBuyNow}
        >
          <ChevronRight size={20} className="btn-icon" />
          {product.stock <= 0 ? 'HẾT HÀNG' : (availableStock <= 0 ? 'ĐÃ ĐẠT GIỚI HẠN' : 'MUA NGAY')}
        </button>
        <button 
          className="sidebar-btn-add-cart" 
          disabled={availableStock <= 0}
          onClick={handleAddToCart}
        >
          <ShoppingCart size={20} className="btn-icon" />
          {product.stock <= 0 ? 'HẾT HÀNG' : (availableStock <= 0 ? 'ĐÃ ĐẠT GIỚI HẠN' : 'THÊM VÀO GIỎ HÀNG')}
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
