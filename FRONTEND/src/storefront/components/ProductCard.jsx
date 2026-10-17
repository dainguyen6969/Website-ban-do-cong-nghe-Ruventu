import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartService } from "../../shared/services/cartService";
import { productService } from "../../shared/services/productService";
import ComboContents from "../../shared/components/ui/ComboContents";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const addingRef = useRef(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const isCombo = product.loaiSanPham === "BO_PC";
  const outOfStock = product.outOfStock === true;

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
          <h4 className="product-title" onClick={handleViewDetails}>
            {product.title}
          </h4>

          {product.category && (
            <span className="product-category-label">{product.category}</span>
          )}
        </div>

        {isCombo && product.soBoCoTheLap != null && (
          <p className="product-card__capacity">
            Có thể lắp: {product.soBoCoTheLap} bộ
          </p>
        )}

        {isCombo && (
          <details className="product-card__configuration">
            <summary>
              XEM CẤU HÌNH ({product.thanhPhan?.length || 0} linh kiện)
            </summary>

            <ComboContents items={product.thanhPhan || []} compact />
          </details>
        )}

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
