import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    if (product.category === 'PC Build Sẵn') {
      navigate(`/build-pc/${product.id || 'rvt-build-502'}`);
    } else {
      navigate(`/product/${product.id || 'RVT-MB-X670E-MSI-TOM'}`);
    }
  };

  return (
    <div className="product-card">
      <div className="product-image-container" onClick={handleViewDetails} style={{ cursor: 'pointer' }}>
        {product.discount && <span className="product-badge badge-discount">{product.discount}</span>}
        {product.isHot && <span className="product-badge badge-hot">HOT</span>}
        {product.isBestSeller && <span className="product-badge badge-bestseller">BÁN CHẠY</span>}
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
          {product.originalPrice && <p className="original-price">{product.originalPrice}</p>}
          <p className="sale-price">{product.price}</p>
        </div>
      </div>

      <div className="product-actions">
        <button className="btn-details" onClick={handleViewDetails}>XEM CHI TIẾT</button>
        <button className="btn-add-cart">THÊM VÀO GIỎ HÀNG</button>
      </div>
    </div>
  );
};

export default ProductCard;
