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
            {product?.fullSpecs && product.fullSpecs.length > 0 ? (
              <div className="custom-specs-card">
                <div className="spec-card-header">
                  THÔNG SỐ KỸ THUẬT — {product.name?.toUpperCase() || 'SẢN PHẨM'}
                </div>
                <div className="spec-card-body custom-specs-grid">
                  {product.fullSpecs.map((spec, index) => (
                    <div key={index} className="spec-row custom-spec-row">
                      <span className="spec-name">{spec.label || spec.name}</span>
                      <span className="spec-val">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="specs-grid-container">
                {/* Box 1: KIẾN TRÚC */}
                <div className="spec-card">
                  <div className="spec-card-header">KIẾN TRÚC</div>
                  <div className="spec-card-body">
                    <div className="spec-row">
                      <span className="spec-name">Kiến trúc GPU</span>
                      <span className="spec-val">NVIDIA Ada Lovelace</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Tiến trình sản xuất</span>
                      <span className="spec-val">TSMC 4N</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">CUDA Cores</span>
                      <span className="spec-val">16.384 nhân</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Tensor Cores</span>
                      <span className="spec-val">512 (4th Gen)</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">RT Cores</span>
                      <span className="spec-val">128 (3rd Gen)</span>
                    </div>
                  </div>
                </div>

                {/* Box 2: BỘ NHỚ */}
                <div className="spec-card">
                  <div className="spec-card-header">BỘ NHỚ</div>
                  <div className="spec-card-body">
                    <div className="spec-row">
                      <span className="spec-name">Dung lượng VRAM</span>
                      <span className="spec-val">24 GB GDDR6X</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Băng thông bộ nhớ</span>
                      <span className="spec-val">1.008 GB/s</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Bus bộ nhớ</span>
                      <span className="spec-val">384-bit</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Tốc độ bộ nhớ</span>
                      <span className="spec-val">21 Gbps</span>
                    </div>
                  </div>
                </div>

                {/* Box 3: HIỆU NĂNG */}
                <div className="spec-card">
                  <div className="spec-card-header">HIỆU NĂNG</div>
                  <div className="spec-card-body">
                    <div className="spec-row">
                      <span className="spec-name">Xung nhịp Base</span>
                      <span className="spec-val">2.235 MHz</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Xung nhịp Boost (OC)</span>
                      <span className="spec-val">2.610 MHz</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">TDP (TGP)</span>
                      <span className="spec-val">450 W</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">DirectX</span>
                      <span className="spec-val">DirectX 12 Ultimate</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">OpenGL</span>
                      <span className="spec-val">OpenGL 4.6</span>
                    </div>
                  </div>
                </div>

                {/* Box 4: KẾT NỐI */}
                <div className="spec-card">
                  <div className="spec-card-header">KẾT NỐI</div>
                  <div className="spec-card-body">
                    <div className="spec-row">
                      <span className="spec-name">Giao tiếp</span>
                      <span className="spec-val">PCIe 4.0 x16</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Đầu ra màn hình</span>
                      <span className="spec-val">3x DisplayPort 1.4a, 1x HDMI 2.1</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Hỗ trợ màn hình</span>
                      <span className="spec-val">Tối đa 4 màn hình đồng thời</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Độ phân giải tối đa</span>
                      <span className="spec-val">7680 x 4320 (8K)</span>
                    </div>
                  </div>
                </div>

                {/* Box 5: VẬT LÝ */}
                <div className="spec-card">
                  <div className="spec-card-header">VẬT LÝ</div>
                  <div className="spec-card-body">
                    <div className="spec-row">
                      <span className="spec-name">Kích thước</span>
                      <span className="spec-val">357 x 149 x 70 mm (3.5 slot)</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Khối lượng</span>
                      <span className="spec-val">~ 1.78 kg</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Nguồn điện yêu cầu</span>
                      <span className="spec-val">3x 8-pin PCIe (adapter 16-pin kèm hộp)</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">PSU khuyến nghị</span>
                      <span className="spec-val">≥ 850 W</span>
                    </div>
                  </div>
                </div>

                {/* Box 6: BẢO HÀNH */}
                <div className="spec-card">
                  <div className="spec-card-header">BẢO HÀNH</div>
                  <div className="spec-card-body">
                    <div className="spec-row">
                      <span className="spec-name">Bảo hành chính hãng</span>
                      <span className="spec-val">36 tháng tại Reventu</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Đổi trả</span>
                      <span className="spec-val">7 ngày nếu lỗi kỹ thuật</span>
                    </div>
                    <div className="spec-row">
                      <span className="spec-name">Hỗ trợ kỹ thuật</span>
                      <span className="spec-val">24/7 qua hotline 1800 9999</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'desc' && (
          <div className="desc-content">
            {product?.description ? (
              <div className="desc-section">
                <div 
                  className="desc-section-text" 
                  style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSpecsTabs;
