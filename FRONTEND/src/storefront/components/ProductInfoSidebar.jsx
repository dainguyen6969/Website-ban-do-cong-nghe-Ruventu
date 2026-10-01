import React from 'react';
import './ProductInfoSidebar.css';

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

const ProductInfoSidebar = ({ product, selectedVariantId, setSelectedVariantId }) => {
  if (!product) return null;

  const hasMultipleVariants = product.variants && product.variants.length > 1;

  if (!hasMultipleVariants) {
    return (
      <div className="product-info-sidebar old-layout">
        <div className="info-sidebar-header old-header">
          THÔNG SỐ SẢN PHẨM
        </div>
        
        <div className="info-sidebar-thumbnail-box">
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.category} className="thumbnail-image" style={{width: '100%', border: '1px solid #ff0000'}} />
          ) : (
            <div className="thumbnail-placeholder"></div>
          )}
          <div className="category-text">{product.category}</div>
        </div>

        <div className="info-sidebar-specs-section old-specs-section">
          <div className="specs-title-bar">THÔNG SỐ KỸ THUẬT</div>
          <table className="info-specs-table old-specs-table">
            <tbody>
              {product.specsSummary && product.specsSummary.map((spec, index) => (
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
  }

  return (
    <div className="product-info-sidebar">
      <div className="info-sidebar-header">
        <span>CẤU HÌNH & PHIÊN BẢN</span>
        <div className="stock-badge">
          {product.stock > 0 ? `${product.stock} còn hàng` : 'Hết hàng'}
        </div>
      </div>
      
      <div className="info-sidebar-content">
        {/* PHIÊN BẢN SECTION */}
        {product.variants && product.variants.length > 0 && (
          <div className="info-section">
            <div className="section-title">
              <span className="red-bar"></span> PHIÊN BẢN
            </div>
            <div className="variant-list">
              {product.variants.map((variant) => (
                <div 
                  key={variant.id} 
                  className={`variant-item ${selectedVariantId === variant.id ? 'selected' : ''} ${variant.tonCoTheBan === 0 ? 'disabled' : ''}`}
                  onClick={() => variant.tonCoTheBan > 0 && setSelectedVariantId(variant.id)}
                >
                  <div className="variant-checkbox">
                    {selectedVariantId === variant.id ? <div className="checked-inner"></div> : null}
                  </div>
                  <div className="variant-details">
                    <div className="variant-name">{variant.tenPhienBan || 'Mặc định'}</div>
                    <div className="variant-sku">SKU: {variant.maVach || 'N/A'}</div>
                  </div>
                  <div className="variant-price-stock">
                    <div className="v-price">{formatPrice(variant.giaBanLe || 0)}</div>
                    <div className="v-stock">{variant.tonCoTheBan > 0 ? `còn ${variant.tonCoTheBan}` : 'Hết hàng'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEMO: BỘ NHỚ VRAM / MÀU SẮC (MOCK FOR UI) */}
        <div className="info-section">
          <div className="section-title">
            <span className="red-bar"></span> MÀU SẮC
          </div>
          <div className="attribute-options">
            <button className="attr-btn selected">Màu Đen</button>
            <button className="attr-btn">Màu Trắng</button>
          </div>
        </div>

        {/* THÔNG SỐ CƠ BẢN */}
        <div className="info-sidebar-specs-section">
          <div className="section-title">
            <span className="red-bar"></span> THÔNG SỐ CƠ BẢN
          </div>
          <table className="info-specs-table">
            <tbody>
              {product.specsSummary && product.specsSummary.map((spec, index) => (
                <tr key={index}>
                  <td>{spec.label}</td>
                  <td>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoSidebar;
