import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartService } from "../../shared/services/cartService";
import { formatProductPrice, productService } from "../../shared/services/productService";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const addingRef = useRef(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const outOfStock = product.outOfStock === true;
  const specs = (product.specs || []).slice(0, 4);
  const demoReferencePrice = ["DON", "BO_PC"].includes(product.loaiSanPham) && Number.isSafeInteger(product.priceValue) && product.priceValue > 0
    ? Math.ceil(product.priceValue / 0.9 / 1000) * 1000 : 0;
  const demoSavings = Number.isSafeInteger(demoReferencePrice) && demoReferencePrice > 0 && demoReferencePrice > product.priceValue
    ? demoReferencePrice - product.priceValue : 0;

  const handleViewDetails = () => {
    navigate(`/product/${encodeURIComponent(product.id)}`);
  };

  const handleAddToCart = async (event) => {
    event.stopPropagation();

    if (outOfStock || addingRef.current) return;

    addingRef.current = true;
    setIsAdding(true);
    setError("");

    try {
      const response = await productService.getProductDetail(product.id);

      const detail = response?.data;
      const variants = detail?.danhSachPhienBan || [];

      if (variants.length !== 1) {
        handleViewDetails();
        return;
      }

      const variant = variants[0];
      const combo = detail.loaiSanPham === "BO_PC";

      const rawStock = combo ? variant.soBoCoTheLap : variant.tonCoTheBan;

      if (
        rawStock === null ||
        rawStock === undefined ||
        !Number.isFinite(Number(rawStock)) ||
        Number(rawStock) <= 0 ||
        variant.coTheBan === false
      ) {
        throw new Error(
          variant.lyDoChuaTheBan || "Sản phẩm hiện chưa sẵn sàng để bán.",
        );
      }

      await cartService.addItem(variant.id, 1);

      window.dispatchEvent(
        new CustomEvent("cartUpdated", {
          detail: { quantity: 1 },
        }),
      );
    } catch (reason) {
      setError(
        reason.response?.data?.message ||
          reason.message ||
          "Không thể thêm sản phẩm vào giỏ hàng.",
      );
    } finally {
      addingRef.current = false;
      setIsAdding(false);
    }
  };

  return (
    <div className={`product-card ${outOfStock ? "out-of-stock" : ""}`}>
      <div className="product-image-container" onClick={handleViewDetails}>
        {product.discount && (
          <span className="product-badge badge-discount">
            {product.discount}
          </span>
        )}

        {product.isHot && <span className="product-badge badge-hot">HOT</span>}

        {product.isBestSeller && (
          <span className="product-badge badge-bestseller">BÁN CHẠY</span>
        )}

        {outOfStock && <div className="out-of-stock-overlay">HẾT HÀNG</div>}

        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="product-image"
          />
        ) : <span className="product-image-placeholder">Chưa có ảnh sản phẩm</span>}
      </div>

      <div className="product-info">
        <div className="product-header">
          <h4 className="product-title" title={product.title} onClick={handleViewDetails}>
            {product.title}
          </h4>

          {product.category && (
            <span className="product-category-label">{product.category}</span>
          )}
        </div>

        {specs.length > 0 && (
          <div className="product-specs">
            <table className="specs-table" aria-label={`Thông số nổi bật của ${product.title}`}>
              <tbody>
                {specs.map((spec, index) => (
                  <tr key={index}>
                    <th scope="row" className="spec-label" title={spec.label}><span>{spec.label}</span></th>
                    <td className="spec-value" title={spec.value}><span>{spec.value}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="product-pricing">
          {demoSavings > 0 && (
            <div className="product-card__demo-pricing" aria-label="Giá mô phỏng, không áp dụng thanh toán">
              <span className="product-card__demo-label">Dữ liệu demo · không phải ưu đãi thật</span>
              <div className="product-card__demo-offer">
                <s className="product-card__demo-reference">{product.priceFrom && "Từ "}{formatProductPrice(demoReferencePrice)}</s>
                <span className="product-card__demo-saving" title={`Tiết kiệm mô phỏng ${formatProductPrice(demoSavings)}`}>
                  Tiết kiệm {Math.round(demoSavings / demoReferencePrice * 100)}%
                </span>
              </div>
            </div>
          )}
          {(product.originalPrice || product.soldCount) && (
            <div className="price-row">
              {product.originalPrice && (
                <span className="original-price">{product.originalPrice}</span>
              )}

              {product.soldCount && (
                <span className="sold-count">Đã bán {product.soldCount}</span>
              )}
            </div>
          )}

          <p className="sale-price">{product.priceFrom && "Từ "}{product.price}</p>
        </div>

        {error && (
          <p className="product-card__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="product-actions">
        <button
          type="button"
          className="btn-details"
          onClick={handleViewDetails}
        >
          XEM CHI TIẾT
        </button>

        <button
          type="button"
          className="btn-add-cart"
          disabled={outOfStock || isAdding}
          onClick={handleAddToCart}
        >
          {isAdding
            ? "ĐANG THÊM..."
            : outOfStock
              ? "HẾT HÀNG"
              : "THÊM VÀO GIỎ HÀNG"}
        </button>
      </div>
    </div>
  );
}
