import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../../shared/services/cartService';
import { productService } from '../../shared/services/productService';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (product.outOfStock || isAdding || showLimitMessage) return;
    
    setIsAdding(true);
    
    try {
      const detailRes = await productService.getProductDetail(product.id);
      const variants = detailRes?.data?.danhSachPhienBan;
      
      if (variants && variants.length > 0) {
        const phienBan = variants[0];
        const phienBanId = phienBan.id;
        
        // Validate trong FRONTEND
        const cartRes = await cartService.getCurrentCart();
        const cartItems = cartRes?.data?.data?.items || [];
        const existingItem = cartItems.find(i => i.phienBanId === phienBanId);
        const quantityInCart = existingItem ? existingItem.soLuong : 0;
        
        if (quantityInCart >= phienBan.tonCoTheBan) {
          setShowLimitMessage(true);
          setTimeout(() => setShowLimitMessage(false), 2000);
          setIsAdding(false);
          return;
        }

        await cartService.addItem(phienBanId, 1);
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { quantity: 1 } }));
      } else {
        alert('Vui lòng vào trang chi tiết để thêm sản phẩm này.');
        handleViewDetails();
      }
    } catch (err) {
      console.error('Lỗi khi thêm vào giỏ hàng:', err);
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert('Có lỗi xảy ra hoặc vui lòng vào trang chi tiết để thêm sản phẩm.');
        handleViewDetails();
      }
    } finally {
      setIsAdding(false);
    }
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
        <button 
          className="btn-add-cart" 
          disabled={product.outOfStock || isAdding || showLimitMessage} 
          onClick={handleAddToCart}
          style={showLimitMessage ? { backgroundColor: '#555', cursor: 'not-allowed' } : {}}
        >
          {isAdding ? 'ĐANG THÊM...' : (showLimitMessage ? 'ĐÃ ĐẠT GIỚI HẠN' : (product.outOfStock ? 'HẾT HÀNG' : 'THÊM VÀO GIỎ HÀNG'))}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
