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
            <div className="desc-header">
              <h2 className="desc-title">{product?.name?.toUpperCase() || 'SẢN PHẨM'}</h2>
              <p className="desc-subtitle">{product?.brand || 'Reventu'} {product?.category || 'Sản phẩm'} chính hãng – phân phối và bảo hành bởi Reventu Tech.</p>
            </div>

            <div className="desc-section">
              <h3 className="desc-section-title">CHẤT LƯỢNG CHÍNH HÃNG</h3>
              <p className="desc-section-text">
                Sản phẩm {product?.name || 'này'} được Reventu nhập khẩu trực tiếp từ nhà sản xuất {product?.brand || 'chính hãng'}. Toàn bộ hàng hóa đều qua kiểm tra chất lượng nghiêm ngặt trước khi đến tay khách hàng – đảm bảo nguyên seal, đầy đủ phụ kiện theo hộp.
              </p>
            </div>

            <div className="desc-section">
              <h3 className="desc-section-title">HIỆU NĂNG VƯỢT TRỘI</h3>
              <p className="desc-section-text">
                {product?.category || 'Sản phẩm'} {product?.brand || ''} được thiết kế để đáp ứng nhu cầu khắt khe nhất của người dùng chuyên nghiệp và game thủ. Từng chi tiết đều được tối ưu để mang lại trải nghiệm sử dụng tốt nhất trong phân khúc giá.
              </p>
            </div>

            <div className="desc-section">
              <h3 className="desc-section-title">BẢO HÀNH & CHÍNH SÁCH HẬU MÃI REVENTU</h3>
              <p className="desc-section-text">
                Sản phẩm được bảo hành {product?.fullSpecs?.find(s => s.label === 'Bảo hành' || s.label === 'Bảo Hành')?.value || '36 tháng chính hãng'} tại cửa hàng Reventu. Đổi trả trong 7 ngày nếu phát sinh lỗi kỹ thuật từ nhà sản xuất. Đội kỹ thuật Reventu hỗ trợ tư vấn cài đặt, tối ưu hệ thống và kiểm tra hiệu năng miễn phí.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSpecsTabs;
