import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (product.outOfStock) return;
    
    // Save to localStorage
    const existingCart = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    const existingItemIndex = existingCart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push({ ...product, quantity: 1, variant: 'Tiêu chuẩn' });
    }
    
    localStorage.setItem('ruventu_cart', JSON.stringify(existingCart));

    // Dispatch global event for Header cart count
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { quantity: 1 } }));
    
  };

  const handleViewDetails = () => {
    if (product.category === 'PC Build Sẵn') {
      navigate(`/build-pc/${product.id || 'rvt-build-502'}`);
    } else {
      navigate(`/product/${product.id || 'RVT-MB-X670E-MSI-TOM'}`);
    }
  };

  return (
    <div className={`product-card ${product.outOfStock ? 'out-of-stock' : ''}`}>
      <div className="product-image-container" onClick={handleViewDetails} style={{ cursor: 'pointer' }}>
        {product.discount && <span className="product-badge badge-discount">{product.discount}</span>}
        {product.isHot && <span className="product-badge badge-hot">HOT</span>}
        {product.isBestSeller && <span className="product-badge badge-bestseller">BÁN CHẠY</span>}
        
        {product.outOfStock && <div className="out-of-stock-overlay">HẾT HÀNG</div>}
        
        <img src={product.image} alt={product.title} className="product-image" />
      </div>
      
      <div className="product-info">
        <div className="product-header">
          <h4 className="product-title" onClick={handleViewDetails} style={{ cursor: 'pointer' }}>{product.title}</h4>
          {product.category && <span className="product-category-label">{product.category}</span>}
        </div>

        {product.specs && (
          <div className="product-specs">
            <table className="specs-table">
              <tbody>
                {product.specs.map((spec, index) => (
                  <tr key={index}>
                    <td className="spec-label">{spec.label}</td>
                    <td className="spec-value">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="product-pricing">
          {(product.originalPrice || product.soldCount) && (
            <div className="price-row">
              {product.originalPrice && <span className="original-price">{product.originalPrice}</span>}
              {product.soldCount && <span className="sold-count">Đã bán {product.soldCount}</span>}
            </div>
          )}
          <p className="sale-price">{product.price}</p>
        </div>
      </div>

      <div className="product-actions">
        <button className="btn-details" onClick={handleViewDetails}>XEM CHI TIẾT</button>
        <button className="btn-add-cart" disabled={product.outOfStock} onClick={handleAddToCart}>
          {product.outOfStock ? 'HẾT HÀNG' : 'THÊM VÀO GIỎ HÀNG'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
