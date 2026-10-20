import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, X } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cartService } from "../../shared/services/cartService";
import { errorMessage } from "../../shared/services/mutationUtils";
import "./CartPage.css";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

const CartPage = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);

  const [cartData, setCartData] = useState({});
  const [cartError, setCartError] = useState("");
  const [cartLoading, setCartLoading] = useState(true);

  const [voucherCode, setVoucherCode] = useState("");

  const loadCart = async () => {
    setCartLoading(true);

    try {
      const response = await cartService.getCurrentCart();
      const data = response.data?.data;

      if (!data || !Array.isArray(data.items)) {
        throw new Error("Dữ liệu giỏ hàng không hợp lệ.");
      }

      setCartItems((previous) => {
        const selectedById = new Map(
          previous.map((item) => [item.cartItemId, item.selected]),
        );

        return data.items.map((item) => ({
          ...item,
          selected: selectedById.get(item.cartItemId) !== false,
        }));
      });

      setCartData({
        ...data,
        khuyenMai: data.khuyen_mai || data.khuyenMai || null,
      });

      setCartError("");

      window.dispatchEvent(
        new CustomEvent("cartCountUpdated", {
          detail: {
            count: data.tongSoLuong || 0,
          },
        }),
      );
    } catch (error) {
      setCartError(errorMessage(error));
    } finally {
      setCartLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    window.addEventListener("cartUpdated", loadCart);
    return () => window.removeEventListener("cartUpdated", loadCart);
  }, []);

  const saveCart = (newItems) => {
    setCartItems(newItems);
  };

  const handleQuantityChange = async (id, change) => {
    const item = cartItems.find((i) => i.cartItemId === id);
    if (!item) return;
    const newQty = Math.max(1, item.soLuong + change);
    try {
      await cartService.updateItem(id, newQty);
      loadCart();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật số lượng");
    }
  };

  const handleDelete = async (id) => {
    try {
      await cartService.removeItem(id);
      loadCart();
    } catch (err) {
      alert("Không thể xóa sản phẩm");
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode) return;
    try {
      await cartService.applyPromotion(voucherCode);
      loadCart();
      alert("Áp dụng mã giảm giá thành công!");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Mã giảm giá không hợp lệ hoặc đã hết hạn.",
      );
    }
  };

  const handleRemoveVoucher = async () => {
    try {
      await cartService.removePromotion();
      await loadCart();
    } catch (error) {
      setCartError(errorMessage(error));
    }
  };

  const handleToggleSelect = (id) => {
    const newItems = cartItems.map((item) =>
      item.cartItemId === id ? { ...item, selected: !item.selected } : item,
    );
    saveCart(newItems);
  };

  const handleToggleSelectAll = () => {
    const allSelected =
      cartItems.length > 0 && cartItems.every((item) => item.selected);
    const newItems = cartItems.map((item) => ({
      ...item,
      selected: !allSelected,
    }));
    saveCart(newItems);
  };

  const selectedItems = cartItems.filter((item) => item.selected);

  const selectedQuantity = selectedItems.reduce(
    (sum, item) => sum + Number(item.soLuong),
    0,
  );

  const localTotalPrice = selectedItems.reduce(
    (sum, item) => sum + Number(item.donGia) * Number(item.soLuong),
    0,
  );

  const isAllSelected =
    cartItems.length > 0 && cartItems.every((item) => item.selected);

  const totalCartQuantity = cartItems.reduce(
    (sum, item) => sum + Number(item.soLuong),
    0,
  );

  const promotion = cartData.khuyenMai;

  const appliedPromotionCode =
    promotion?.ma_chuong_trinh ||
    promotion?.maChuongTrinh ||
    promotion?.maKhuyenMai ||
    "";

  const promotionName =
    promotion?.ten_chuong_trinh ||
    promotion?.tenChuongTrinh ||
    promotion?.tenKhuyenMai ||
    "";

  const pricingBlocked = cartData.co_the_thanh_toan === false;

  const finalPrice =
    isAllSelected &&
    !pricingBlocked &&
    !cartLoading &&
    !cartError &&
    cartData.tongTien != null
      ? Number(cartData.tongTien)
      : null;

  const discountAmount =
    isAllSelected &&
    !pricingBlocked &&
    !cartLoading &&
    !cartError &&
    cartData.giamGia != null
      ? Number(cartData.giamGia)
      : null;

  const gifts = isAllSelected ? cartData.qua_tang || [] : [];

  const pricingMessage =
    cartData.ly_do_khuyen_mai || cartData.ly_do_tinh_gia || "";

  const handleProceedToCheckout = () => {
    if (selectedQuantity === 0 || cartLoading || cartError || pricingBlocked) {
      return;
    }

    navigate("/checkout", {
      state: {
        cartItemIds: selectedItems.map((item) => item.cartItemId),
        voucherCode: appliedPromotionCode || null,
      },
    });
  };

  return (
    <div className="cart-page-wrapper">
      <Header />

      {/* Red Breadcrumb/Header Bar */}
      <div className="cart-page-header">
        <div className="container">
          <div className="cart-page-title">
            <span>
              <ShoppingBagIcon /> GIỎ HÀNG
            </span>
            <span className="cart-count">{totalCartQuantity}</span>
          </div>
          <div className="cart-breadcrumb">
            <Link to="/">TRANG CHỦ</Link> <span>&gt;</span>{" "}
            <span className="current">GIỎ HÀNG</span>
          </div>
        </div>
      </div>

      <div className="cart-page-content container">
        <div className="cart-main">
          {cartLoading && (
            <p className="cart-pricing-note" role="status">
              Đang cập nhật giỏ hàng...
            </p>
          )}

          {cartError && (
            <p className="cart-pricing-error" role="alert">
              {cartError}
            </p>
          )}

          {pricingMessage && (
            <p className="cart-pricing-error" role="alert">
              {pricingMessage}
            </p>
          )}
          <div className="cart-table-header">
            <div className="col-checkbox">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
              />
              <span>CHỌN TẤT CẢ ({cartItems.length} SẢN PHẨM)</span>
            </div>
            <div className="col-quantity">SỐ LƯỢNG</div>
            <div className="col-price">THÀNH TIỀN</div>
          </div>

          <div className="cart-items-list">
            {cartItems.length === 0 ? (
              <div
                style={{ padding: "40px", textAlign: "center", color: "#666" }}
              >
                Giỏ hàng của bạn đang trống.
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.cartItemId} className="cart-page-item">
                  <div className="item-select">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleSelect(item.cartItemId)}
                    />
                  </div>
                  <div className="item-info">
                    <img
                      src={item.anh || "https://via.placeholder.com/100"}
                      alt={item.tenSanPham}
                    />
                    <div className="item-details">
                      <h4>{item.tenSanPham}</h4>
                      <p>{item.tenPhienBan}</p>
                      <div className="item-price-mobile">
                        <span className="current">
                          {formatPrice(item.donGia)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="item-quantity">
                    <div className="quantity-selector">
                      <button
                        onClick={() =>
                          handleQuantityChange(item.cartItemId, -1)
                        }
                        disabled={item.soLuong <= 1}
                      >
                        -
                      </button>
                      <input type="text" value={item.soLuong} readOnly />
                      <button
                        onClick={() => handleQuantityChange(item.cartItemId, 1)}
                        disabled={item.soLuong >= item.tonKhoKhaDung}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="item-total">
                    <span className="total-price">
                      {formatPrice(item.donGia * item.soLuong)}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(item.cartItemId)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {gifts.length > 0 && (
            <section className="cart-gifts">
              <h3>QUÀ TẶNG KHUYẾN MẠI</h3>

              {gifts.map((item) => (
                <div className="cart-gift-item" key={item.ma_dong}>
                  <div>
                    <strong>
                      {item.ten_san_pham || `Phiên bản #${item.phien_ban_id}`}
                    </strong>

                    {item.ten_phien_ban && <small>{item.ten_phien_ban}</small>}
                  </div>

                  <span>×{item.so_luong}</span>
                  <strong>{formatPrice(item.thanh_toan_dong)}</strong>
                </div>
              ))}
            </section>
          )}

          {cartItems.length > 0 && (
            <div className="cart-selection-info">
              Đã chọn <strong>{selectedQuantity}</strong> sản phẩm
            </div>
          )}
        </div>

        <div className="cart-sidebar">
          <div className="coupon-box">
            <h3>
              <TagIcon /> MÃ GIẢM GIÁ
            </h3>

            {appliedPromotionCode ? (
              <div className="applied-coupon cart-applied-promotion">
                <div>
                  <strong>{appliedPromotionCode}</strong>
                  <div className="cart-promotion-name">{promotionName}</div>
                </div>

                <button
                  type="button"
                  aria-label="Bỏ khuyến mại"
                  onClick={handleRemoveVoucher}
                  disabled={cartLoading}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="coupon-input">
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá..."
                  value={voucherCode}
                  onChange={(event) => setVoucherCode(event.target.value)}
                />

                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={cartLoading}
                >
                  ÁP DỤNG
                </button>
              </div>
            )}
          </div>

          <div className="summary-box">
            <h3>TÓM TẮT ĐƠN HÀNG</h3>

            <div className="summary-row">
              <span>Tạm tính ({selectedQuantity} sản phẩm)</span>
              <span>{formatPrice(localTotalPrice)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="summary-row cart-discount-row">
                <span>Giảm giá</span>
                <span>−{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span>Xác nhận ở bước thanh toán</span>
            </div>

            <p className="cart-pricing-note">Giá sản phẩm đã bao gồm VAT.</p>

            {!isAllSelected && selectedQuantity > 0 && (
              <p className="cart-pricing-note">
                Khuyến mại và tổng tiền của các sản phẩm đã chọn sẽ được xác
                nhận tại bước thanh toán.
              </p>
            )}

            <div className="summary-total">
              <span>TIỀN HÀNG SAU ƯU ĐÃI</span>

              <span className="total-amount">
                {finalPrice == null ? "Chờ xác nhận" : formatPrice(finalPrice)}
              </span>
            </div>

            <button
              type="button"
              className="btn-checkout-full"
              onClick={handleProceedToCheckout}
              disabled={
                selectedQuantity === 0 ||
                cartLoading ||
                Boolean(cartError) ||
                pricingBlocked
              }
            >
              TIẾN HÀNH ĐẶT HÀNG →
            </button>

            <div className="trust-badges">
              <span>
                <ShieldCheckIcon /> Bảo hành chính hãng
              </span>
              <span>
                <TruckIcon /> Giao hàng toàn quốc
              </span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// SVG Icons specifically used in Cart Page
const ShoppingBagIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>
);

const TagIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
    <line x1="7" y1="7" x2="7.01" y2="7"></line>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <polyline points="9 12 11 14 15 10"></polyline>
  </svg>
);

const TruckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="3" width="15" height="13"></rect>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
    <circle cx="5.5" cy="18.5" r="2.5"></circle>
    <circle cx="18.5" cy="18.5" r="2.5"></circle>
  </svg>
);

export default CartPage;
