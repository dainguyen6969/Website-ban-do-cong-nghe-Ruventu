import React from 'react';
import './ProductInfoSidebar.css';
import { formatProductPrice } from '../../shared/services/productService';

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
          <div className="specs-title-bar">THÔNG SỐ CƠ BẢN</div>
          <table className="info-specs-table old-specs-table">
            <tbody>
              {!product.specsSummary?.length && (
                <tr><td colSpan={2}>Chưa có thông số kỹ thuật.</td></tr>
              )}
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

  const inStockVariantsCount = product.variants ? product.variants.filter(v => (v.tonCoTheBan || v.stock || 0) > 0).length : 0;
  const totalVariantsCount = product.variants ? product.variants.length : 0;

  return (
    <div className="product-info-sidebar">
      <div className="info-sidebar-header">
        <span>CẤU HÌNH & PHIÊN BẢN</span>
        <div className="stock-badge">
          {inStockVariantsCount}/{totalVariantsCount} còn hàng
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
              {product.variants.map((variant) => {
                const isSelected = selectedVariantId === variant.id;
                const stockQty = variant.tonCoTheBan !== undefined ? variant.tonCoTheBan : (variant.stock || 0);
                const isOutOfStock = stockQty === 0;

                return (
                  <div 
                    key={variant.id} 
                    className={`variant-item ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'disabled' : ''}`}
                    onClick={() => !isOutOfStock && setSelectedVariantId(variant.id)}
                  >
                    <div className="variant-checkbox">
                      {isSelected && <div className="checked-inner"></div>}
                    </div>
                    <div className="variant-details">
                      <div className="variant-name">{variant.tenPhienBan || variant.name || 'Mặc định'}</div>
                      <div className="variant-sku">SKU: {variant.sku || variant.maVach || 'N/A'}</div>
                    </div>
                    <div className="variant-price-stock">
                      <div className="v-price">{formatProductPrice(variant.giaBanLe ?? variant.currentPrice ?? 0)}</div>
                      <div className="v-stock">{stockQty > 0 ? `còn ${stockQty}` : 'Hết hàng'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* THÔNG SỐ CƠ BẢN */}
        <div className="info-sidebar-specs-section">
          <div className="section-title">
            <span className="red-bar"></span> THÔNG SỐ CƠ BẢN
          </div>
          <table className="info-specs-table">
            <tbody>
              {product.specsSummary && product.specsSummary.length > 0 ? (
                product.specsSummary.map((spec, index) => (
                  <tr key={index}>
                    <td>{spec.label}</td>
                    <td>{spec.value}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>Chưa có thông số kỹ thuật.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoSidebar;
