import React from 'react';
import './ProductInfoSidebar.css';

const ProductInfoSidebar = ({ product }) => {
  if (!product) return null;

  return (
    <div className="product-info-sidebar">
      <div className="info-sidebar-header">
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

      <div className="info-sidebar-specs-section">
        <div className="specs-title-bar">THÔNG SỐ KỸ THUẬT</div>
        <table className="info-specs-table">
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

export default ProductInfoSidebar;
