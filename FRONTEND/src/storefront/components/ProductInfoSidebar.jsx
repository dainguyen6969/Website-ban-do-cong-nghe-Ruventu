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
        <div className="info-sidebar-header old-header">THÔNG SỐ SẢN PHẨM</div>

        <div className="info-sidebar-thumbnail-box">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.category}
              className="thumbnail-image"
              style={{ width: '100%', border: '1px solid #ff0000' }}
            />
          ) : (
            <div className="thumbnail-placeholder"></div>
          )}
          <div className="category-text">{product.category}</div>
        </div>

        <div className="info-sidebar-specs-section old-specs-section">
          <div className="specs-title-bar">THÔNG SỐ KỸ THUẬT</div>
          <table className="info-specs-table old-specs-table">
            <tbody>
              {product.specsSummary &&
                product.specsSummary.map((spec, index) => (
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

  const inStockVariantsCount = product.variants
    ? product.variants.filter((v) => (v.tonCoTheBan || v.stock || 0) > 0).length
    : 0;
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
                const stockQty =
                  variant.tonCoTheBan !== undefined ? variant.tonCoTheBan : variant.stock || 0;
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
                      <div className="variant-name">
                        {variant.tenPhienBan || variant.name || 'Mặc định'}
                      </div>
                      <div className="variant-sku">
                        SKU: {variant.sku || variant.maVach || 'N/A'}
                      </div>
                    </div>
                    <div className="variant-price-stock">
                      <div className="v-price">
                        {formatPrice(variant.giaBanLe || variant.currentPrice || 0)}
                      </div>
                      <div className="v-stock">{stockQty > 0 ? `còn ${stockQty}` : 'Hết hàng'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BỘ NHỚ VRAM & MÀU SẮC (Hiển thị phù hợp theo nhóm sản phẩm hoặc thuộc tính) */}
        {product.category?.toLowerCase().includes('vga') && (
          <>
            <div className="info-section">
              <div className="section-title">
                <span className="red-bar"></span> BỘ NHỚ VRAM
              </div>
              <div className="attribute-options">
                <button className="attr-btn selected">
                  {product.specsSummary?.find((s) => s.label?.toLowerCase().includes('vram'))
                    ?.value || '24 GB GDDR6X'}
                </button>
              </div>
            </div>

            <div className="info-section">
              <div className="section-title">
                <span className="red-bar"></span> MÀU SẮC
              </div>
              <div className="attribute-options">
                <button className="attr-btn selected">Màu Đen</button>
                <button className="attr-btn disabled-attr">Màu Trắng</button>
              </div>
            </div>
          </>
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
                <>
                  <tr>
                    <td>Kiến trúc</td>
                    <td>Ada Lovelace</td>
                  </tr>
                  <tr>
                    <td>VRAM</td>
                    <td>24 GB GDDR6X</td>
                  </tr>
                  <tr>
                    <td>CUDA Cores</td>
                    <td>16.384 nhân</td>
                  </tr>
                  <tr>
                    <td>Base / Boost</td>
                    <td>2.235 / 2.520 MHz</td>
                  </tr>
                  <tr>
                    <td>TGP</td>
                    <td>450 W</td>
                  </tr>
                  <tr>
                    <td>Interface</td>
                    <td>PCIe 4.0 x16</td>
                  </tr>
                  <tr>
                    <td>Output</td>
                    <td>3x DP 1.4a + HDMI 2.1</td>
                  </tr>
                  <tr>
                    <td>PSU yêu cầu</td>
                    <td>≥ 850 W</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoSidebar;
