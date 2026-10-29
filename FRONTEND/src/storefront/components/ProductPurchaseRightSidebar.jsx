import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Truck, Tag, ChevronRight } from 'lucide-react';
import { cartService } from '../../shared/services/cartService';
import { formatProductPrice } from '../../shared/services/productService';
import './ProductPurchaseRightSidebar.css';
import ProductHighlights from './ProductHighlights';
import StockInterestActions from './StockInterestActions';

const ProductPurchaseRightSidebar = ({ product, selectedVariantId }) => {
  const [quantity, setQuantity] = useState(1);
  const [quantityInCart, setQuantityInCart] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedVariantId) {
      setQuantityInCart(0);
      return;
    }
    const fetchCart = async () => {
      try {
        const res = await cartService.getCurrentCart();
        const items = res?.data?.data?.items || [];
        const item = items.find((i) => i.phienBanId === selectedVariantId);
        if (item) {
          setQuantityInCart(item.soLuong);
        } else {
          setQuantityInCart(0);
        }
      } catch (e) {
        console.error('Lỗi fetch giỏ hàng trong sidebar', e);
      }
    };
    fetchCart();
    window.addEventListener('cartUpdated', fetchCart);
    return () => window.removeEventListener('cartUpdated', fetchCart);
  }, [selectedVariantId]);

  if (!product) return null;

  const activeVariant = product.variants?.find((v) => v.id === selectedVariantId) || null;
  const currentPrice = activeVariant
    ? (activeVariant.giaBanLe ?? activeVariant.currentPrice ?? 0)
    : product.currentPrice;
  const originalPrice = activeVariant
    ? (activeVariant.originalPrice ?? currentPrice)
    : (product.originalPrice ?? currentPrice);
  const discountAmount = originalPrice > currentPrice ? originalPrice - currentPrice : 0;
  const isCombo = product.loaiSanPham === 'BO_PC';

  const rawStock = isCombo
    ? activeVariant?.soBoCoTheLap
    : (activeVariant?.tonCoTheBan ?? activeVariant?.stock ?? product.stock);

  const stockKnown =
    rawStock !== null && rawStock !== undefined && Number.isFinite(Number(rawStock));

  const stock = stockKnown ? Math.max(0, Math.floor(Number(rawStock))) : 0;

  const canSell =
    stockKnown &&
    stock > 0 &&
    (isCombo ? activeVariant?.coTheBan === true : activeVariant?.coTheBan !== false);

  const stockStatusText = !stockKnown
    ? 'CHƯA SẴN SÀNG'
    : stock <= 0
      ? 'HẾT HÀNG'
      : !canSell
        ? 'TẠM NGỪNG BÁN'
        : `CÒN HÀNG — ${stock} ${isCombo ? 'BỘ' : 'SẢN PHẨM'}`;
  const sku = product.maSanPham || product.id;
  const displayTitle = product.name;

  const availableStock = canSell ? Math.max(0, Math.min(stock, 99) - quantityInCart) : 0;

  const increaseQuantity = () => setQuantity((prev) => (prev < availableStock ? prev + 1 : prev));
  const decreaseQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = async () => {
    if (!canSell || availableStock <= 0) return;
    if (!selectedVariantId) {
      alert('Vui lòng chọn một phiên bản sản phẩm!');
      return;
    }

    try {
      await cartService.addItem(selectedVariantId, quantity);
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { quantity } }));
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại.'
      );
    }
  };

  const handleBuyNow = async () => {
    if (!canSell || availableStock <= 0) return;
    if (!selectedVariantId) {
      alert('Vui lòng chọn một phiên bản sản phẩm!');
      return;
    }

    try {
      const res = await cartService.addItem(selectedVariantId, quantity);
      const cartItemId = res.data?.data?.cartItemId || res.data?.data?.id;
      if (cartItemId) {
        navigate('/checkout', { state: { cartItemIds: [cartItemId] } });
      } else {
        navigate('/cart');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý mua ngay.');
    }
  };

  // Map icons from strings
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'shield':
        return <ShieldCheck size={24} className="policy-icon" />;
      case 'truck':
        return <Truck size={24} className="policy-icon" />;
      case 'tag':
        return <Tag size={24} className="policy-icon" />;
      default:
        return <ShieldCheck size={24} className="policy-icon" />;
    }
  };

  const tags =
    product.tags && product.tags.length > 0
      ? product.tags
      : [product.category?.toUpperCase(), product.brand?.toUpperCase()].filter(Boolean);

  return (
    <div className="purchase-right-sidebar-container">
      <div className="tags-wrapper">
        {tags.map((tag, index) => (
          <span key={index} className={index === 0 ? 'tag-red' : 'tag-outline'}>
            {tag}
          </span>
        ))}
      </div>

      <h1 className="product-title" title={displayTitle}>
        {displayTitle}
      </h1>

      {product.variants?.length > 1 && activeVariant && (
        <p className="selected-variant-name" title={activeVariant.tenPhienBan}>
          Phiên bản: {activeVariant.tenPhienBan}
        </p>
      )}

      <div className="sku-container">
        <span className="sku-label">MÃ SẢN PHẨM:</span>
        <span className="sku-value">{sku}</span>
      </div>

      <div className="price-container">
        {originalPrice > currentPrice && (
          <div className="price-top-row">
            <span className="original-price">{formatProductPrice(originalPrice)}</span>
            <div className="save-badge">TIẾT KIỆM {formatProductPrice(discountAmount)}</div>
          </div>
        )}
        <div className="price-bottom-row">
          <span className="current-price">{formatProductPrice(currentPrice)}</span>
          <span className="vat-note">Đã bao gồm VAT</span>
        </div>
      </div>

      <div className="stock-status-box">
        <div className={`stock-dot${canSell ? '' : ' stock-dot--muted'}`} />

        {stockStatusText}

        {quantityInCart > 0 && <span className="stock-in-cart">(Trong giỏ: {quantityInCart})</span>}
      </div>

      {!canSell && activeVariant?.lyDoChuaTheBan && (
        <p className="purchase-stock-message">{activeVariant.lyDoChuaTheBan}</p>
      )}

      <div className="quantity-section">
        <div className="qty-label">SỐ LƯỢNG</div>
        <div className="qty-controls">
          <button
            className="qty-btn"
            onClick={decreaseQuantity}
            disabled={availableStock <= 0 || quantity <= 1}
          >
            -
          </button>
          <input
            type="text"
            className="qty-input"
            value={availableStock > 0 ? quantity : 0}
            readOnly
            disabled={availableStock <= 0}
          />
          <button
            className="qty-btn"
            onClick={increaseQuantity}
            disabled={availableStock <= 0 || quantity >= availableStock}
          >
            +
          </button>
        </div>
        <div className="total-calc">
          <span className="total-label">TỔNG CỘNG</span>
          <span className="total-price">
            {formatProductPrice(currentPrice * (availableStock > 0 ? quantity : 0))}
          </span>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="sidebar-btn-buy-now"
          disabled={availableStock <= 0}
          onClick={handleBuyNow}
        >
          <ChevronRight size={20} className="btn-icon" />
          {!canSell ? stockStatusText : availableStock <= 0 ? 'ĐÃ ĐẠT GIỚI HẠN' : 'MUA NGAY'}
        </button>
        <button
          className="sidebar-btn-add-cart"
          disabled={availableStock <= 0}
          onClick={handleAddToCart}
        >
          <ShoppingCart size={20} className="btn-icon" />
          {!canSell
            ? stockStatusText
            : availableStock <= 0
              ? 'ĐÃ ĐẠT GIỚI HẠN'
              : 'THÊM VÀO GIỎ HÀNG'}
        </button>
      </div>

      {activeVariant && stockKnown && (stock <= 0 || canSell) && (
        <StockInterestActions
          variantId={activeVariant.id}
          productName={product.name}
          variantName={activeVariant.tenPhienBan}
          unitPrice={currentPrice}
          image={product.images?.[0]}
          outOfStock={stock <= 0}
        />
      )}

      <div className="policy-grid">
        {product.policies.map((policy, index) => (
          <div key={index} className="policy-item">
            {renderIcon(policy.icon)}
            <div className="policy-text">
              <strong>{policy.title}</strong>
              <span>{policy.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <ProductHighlights product={product} selectedVariantId={selectedVariantId} />
    </div>
  );
};

export default ProductPurchaseRightSidebar;
