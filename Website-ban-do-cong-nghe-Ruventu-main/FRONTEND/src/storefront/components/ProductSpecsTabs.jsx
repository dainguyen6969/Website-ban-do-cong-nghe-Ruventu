import React, { useState } from 'react';
import './ProductSpecsTabs.css';

const ProductSpecsTabs = ({ product }) => {
  const [activeTab, setActiveTab] = useState('specs');

  return (
    <div className="product-specs-tabs-container">
      <div className="tabs-header">
        <button 
          className={`tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          THÔNG SỐ KỸ THUẬT
        </button>
        <button 
          className={`tab-btn ${activeTab === 'desc' ? 'active' : ''}`}
          onClick={() => setActiveTab('desc')}
        >
          MÔ TẢ SẢN PHẨM
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'specs' && (
          <div className="specs-content">
            <div className="specs-section-title">THÔNG SỐ — {product ? product.category.toUpperCase() : "PC BUILD SẴN"}</div>
            <table className="full-specs-table">
              <tbody>
                {product && product.fullSpecs ? (
                  product.fullSpecs.map((spec, index) => (
                    <tr key={index}>
                      <td>{spec.label}</td>
                      <td>{spec.value}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td>Thương hiệu</td>
                      <td>Reventu</td>
                    </tr>
                    <tr>
                      <td>Mã sản phẩm</td>
                      <td>RVT-BUILD-502</td>
                    </tr>
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
                    <tr>
                      <td>Bảo hành</td>
                      <td>36 tháng chính hãng</td>
                    </tr>
                    <tr>
                      <td>Xuất xứ</td>
                      <td>Chính hãng phân phối</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'desc' && (
          <div className="desc-content">
            <p style={{ color: '#fff' }}>Đang cập nhật mô tả chi tiết cho sản phẩm này...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSpecsTabs;
