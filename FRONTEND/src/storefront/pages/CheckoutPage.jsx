import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { orderService } from "../../shared/services/orderService";
import { cartService } from "../../shared/services/cartService";
import "./CheckoutPage.css";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  errorMessage,
  withIdempotency,
} from "../../shared/services/mutationUtils";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [deliveryMethod, setDeliveryMethod] = useState("GIAO_HANG");
  const [paymentMethod, setPaymentMethod] = useState("TIEN_MAT");

  const [cartItemIds, setCartItemIds] = useState([]);
  const [cartItemsData, setCartItemsData] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewRevision, setPreviewRevision] = useState(0);

  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const checkoutAttempt = useRef(null);
  const placingRef = useRef(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    province: "Hà Nội",
    ward: "Cầu Giấy",
    address: "",
    note: "",
  });

  const checkoutDraft = useMemo(
    () => ({
      cart_item_ids: cartItemIds,
      hinh_thuc_nhan_hang: deliveryMethod,
      dia_chi_id: null,
      thong_tin_nguoi_nhan: {
        ten_nguoi_nhan: formData.name.trim(),
        sdt_nguoi_nhan: formData.phone.replace(/[\s.-]/g, ""),
        dia_chi_giao_hang:
          deliveryMethod === "GIAO_HANG"
            ? [
                formData.address.trim(),
                formData.ward.trim(),
                formData.province.trim(),
              ]
                .filter(Boolean)
                .join(", ")
            : null,
      },
      phuong_thuc_thanh_toan: paymentMethod,
      ma_chuong_trinh: location.state?.voucherCode || null,
      ghi_chu: formData.note.trim() || null,
    }),
    [
      cartItemIds,
      deliveryMethod,
      paymentMethod,
      formData.name,
      formData.phone,
      formData.address,
      formData.ward,
      formData.province,
      formData.note,
      location.state?.voucherCode,
    ],
  );

  const draftSignature = JSON.stringify(checkoutDraft);

  const previewData =
    preview?.signature === draftSignature ? preview.data : null;

  const draftReady =
    cartItemIds.length > 0 &&
    Boolean(checkoutDraft.thong_tin_nguoi_nhan.ten_nguoi_nhan) &&
    /^(?:\+84|0)\d{9,10}$/.test(
      checkoutDraft.thong_tin_nguoi_nhan.sdt_nguoi_nhan,
    ) &&
    (deliveryMethod === "NHAN_TAI_CUA_HANG" ||
      Boolean(formData.address.trim()));

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if user is logged in to prefill data
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setFormData((prev) => ({
          ...prev,
          name: user.ho_ten || user.name || user.hoTen || prev.name,
          phone: user.so_dien_thoai || user.soDienThoai || prev.phone,
          email: user.email || prev.email,
        }));
      }
    } catch (e) {
      console.error(e);
    }

    if (location.state?.cartItemIds && location.state.cartItemIds.length > 0) {
      setCartItemIds(location.state.cartItemIds);
      // Lấy thông tin giỏ hàng để hiển thị tên và ảnh sản phẩm
      cartService
        .getCurrentCart()
        .then((res) => {
          if (res?.data?.data?.items) {
            setCartItemsData(res.data.data.items);
          }
        })
        .catch((err) => console.error("Lỗi fetch giỏ hàng ở checkout:", err));
    } else {
      // If no item selected, return to cart
      navigate("/cart");
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const controller = new AbortController();

    setPreview(null);
    setPreviewError("");

    if (!draftReady) {
      setPreviewLoading(false);
      return () => controller.abort();
    }

    setPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await orderService.previewCheckout(
          checkoutDraft,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setPreview({
          signature: draftSignature,
          data: response.data.data,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreviewError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [checkoutDraft, draftSignature, draftReady, previewRevision]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  {
    previewError && (
      <p className="error-text" role="alert">
        {previewError}
      </p>
    );
  }

  {
    checkoutError && (
      <p className="error-text" role="alert">
        {checkoutError}
      </p>
    );
  }

  <button
    type="button"
    className="btn-confirm-order"
    onClick={handlePlaceOrder}
    disabled={
      placing ||
      (!checkoutAttempt.current &&
        (!previewData || previewLoading || !draftReady))
    }
  >
    {placing
      ? "ĐANG ĐẶT HÀNG..."
      : checkoutAttempt.current
        ? "THỬ LẠI YÊU CẦU"
        : "XÁC NHẬN ĐẶT HÀNG →"}
  </button>;

  const handlePlaceOrder = async () => {
    if (placingRef.current) return;

    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập họ và tên.";
    }

    if (!/^(?:\+84|0)\d{9,10}$/.test(formData.phone.replace(/[\s.-]/g, ""))) {
      newErrors.phone = "Số điện thoại không hợp lệ.";
    }

    if (deliveryMethod === "GIAO_HANG" && !formData.address.trim()) {
      newErrors.address = "Vui lòng nhập địa chỉ cụ thể.";
    }

    // Email không thuộc body checkout mới.
    // Nếu giữ ô email trên UI thì để tùy chọn.
    if (
      formData.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(formData.email.trim())
    ) {
      newErrors.email = "Email không hợp lệ.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    placingRef.current = true;
    setPlacing(true);
    setCheckoutError("");

    try {
      let payload;

      if (checkoutAttempt.current) {
        const { tong_thanh_toan_xac_nhan: _total, ...previousDraft } =
          checkoutAttempt.current.body;

        if (JSON.stringify(previousDraft) !== draftSignature) {
          throw new Error(
            "Đơn trước chưa xác định kết quả. Hãy giữ nguyên thông tin để thử lại.",
          );
        }

        payload = checkoutAttempt.current.body;
      } else {
        if (
          !previewData ||
          previewLoading ||
          previewData.tong_thanh_toan == null
        ) {
          throw new Error("Vui lòng chờ tính lại tổng tiền.");
        }

        payload = {
          ...checkoutDraft,
          tong_thanh_toan_xac_nhan: previewData.tong_thanh_toan,
        };
      }

      const response = await withIdempotency(
        checkoutAttempt,
        "customer:checkout",
        payload,
        (key, body) => orderService.submitCheckout(body, key),
      );

      const order = response.data.data;

      window.dispatchEvent(new CustomEvent("cartUpdated"));

      navigate("/success", {
        state: {
          orderCode: order.ma_don_hang,
        },
      });
    } catch (error) {
      setCheckoutError(errorMessage(error));

      if ([400, 409, 422].includes(error.response?.status)) {
        setPreview(null);
        setPreviewRevision((current) => current + 1);
      }
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  return (
    <div className="checkout-page-wrapper">
      <Header />

      {/* Red Header Bar */}
      <div className="checkout-page-header">
        <div className="container">
          <div className="checkout-page-title">
            <Link
              to="/cart"
              style={{
                color: "white",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ArrowLeft size={18} style={{ marginRight: "8px" }} /> THÔNG TIN
              THANH TOÁN
            </Link>
          </div>
          <div className="checkout-breadcrumb">
            <Link to="/cart" style={{ color: "#888", textDecoration: "none" }}>
              GIỎ HÀNG
            </Link>
            <span>&gt;</span>
            <span className="current">THANH TOÁN</span>
            <span>&gt;</span>
            <span style={{ color: "#888" }}>XÁC NHẬN</span>
          </div>
        </div>
      </div>

      <div className="checkout-page-content container">
        <div className="checkout-main">
          {/* Contact Info */}
          <div className="checkout-section">
            <h3 className="section-title">THÔNG TIN LIÊN HỆ</h3>
            <div className="form-group">
              <label className="form-label">HỌ VÀ TÊN</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-input ${errors.name ? "input-error" : ""}`}
                placeholder="Nhập họ và tên..."
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SỐ ĐIỆN THOẠI</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`form-input ${errors.phone ? "input-error" : ""}`}
                  placeholder="09xx xxx xxx"
                />
                {errors.phone && (
                  <span className="error-text">{errors.phone}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">EMAIL</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${errors.email ? "input-error" : ""}`}
                  placeholder="ten@email.com"
                />
                {errors.email && (
                  <span className="error-text">{errors.email}</span>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="checkout-section">
            <h3 className="section-title">PHƯƠNG THỨC NHẬN HÀNG</h3>
            <div className="selection-boxes">
              <div
                className={`selection-box ${deliveryMethod === "GIAO_HANG" ? "active" : ""}`}
                onClick={() => setDeliveryMethod("GIAO_HANG")}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Giao hàng tận nơi</h4>
                  <p>Giao trong 1-3 ngày làm việc</p>
                  <span className="badge-free">MIỄN PHÍ TỪ 5TR</span>
                </div>
              </div>
              <div
                className={`selection-box ${deliveryMethod === "NHAN_TAI_CUA_HANG" ? "active" : ""}`}
                onClick={() => setDeliveryMethod("NHAN_TAI_CUA_HANG")}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Nhận tại cửa hàng</h4>
                  <p>Sẵn sàng sau 2-4 giờ</p>
                  <span className="badge-free badge-green">
                    MIỄN PHÍ VẬN CHUYỂN
                  </span>
                </div>
              </div>
            </div>

            {deliveryMethod === "GIAO_HANG" && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">TỈNH / THÀNH PHỐ</label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      <option>Hà Nội</option>
                      <option>TP. Hồ Chí Minh</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">PHƯỜNG / XÃ</label>
                    <select
                      name="ward"
                      value={formData.ward}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      <option>Cầu Giấy</option>
                      <option>Đống Đa</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ĐỊA CHỈ CỤ THỂ</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`form-input ${errors.address ? "input-error" : ""}`}
                    placeholder="Số nhà, tên đường, khu dân cư..."
                  />
                  {errors.address && (
                    <span className="error-text">{errors.address}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h3 className="section-title">PHƯƠNG THỨC THANH TOÁN</h3>
            <div
              className="selection-boxes"
              style={{ flexDirection: "column", gap: "10px" }}
            >
              <div
                className={`selection-box ${paymentMethod === "TIEN_MAT" ? "active" : ""}`}
                onClick={() => setPaymentMethod("TIEN_MAT")}
                style={{ padding: "15px 20px" }}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Thanh toán khi nhận hàng (COD)</h4>
                  <p>Kiểm tra hàng trước khi thanh toán</p>
                </div>
              </div>
              <div
                className={`selection-box ${paymentMethod === "CHUYEN_KHOAN" ? "active" : ""}`}
                onClick={() => setPaymentMethod("CHUYEN_KHOAN")}
                style={{ padding: "15px 20px" }}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Chuyển khoản QR</h4>
                  <p>Quét mã VietQR - xác nhận tự động</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Notes */}
          <div className="checkout-section">
            <h3 className="section-title">GHI CHÚ ĐƠN HÀNG</h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                className="form-input"
                rows="3"
                placeholder="Ghi chú thêm cho đơn hàng (ví dụ: giao ngoài giờ hành chính, gọi trước khi giao...)"
                style={{ resize: "vertical" }}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Sidebar Order Summary */}
        <div className="checkout-sidebar">
          <div className="sidebar-header">ĐƠN HÀNG CỦA BẠN</div>

          <div className="sidebar-items">
            {previewData &&
              previewData.san_pham &&
              previewData.san_pham.map((item) => {
                const cartInfo =
                  cartItemsData.find(
                    (c) => c.phienBanId === item.phien_ban_id,
                  ) || {};
                return (
                  <div key={item.phien_ban_id} className="sidebar-item">
                    <img
                      src={cartInfo.anh || "https://via.placeholder.com/60"}
                      alt={cartInfo.tenSanPham || "Sản phẩm"}
                    />
                    <div className="sidebar-item-details">
                      <h4>{cartInfo.tenSanPham || "Đang tải..."}</h4>
                      <p>{cartInfo.tenPhienBan || "Tiêu chuẩn"}</p>
                      <div className="sidebar-item-price">
                        <span className="qty">x{item.so_luong}</span>
                        <span className="price">
                          {formatPrice(item.don_gia)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="sidebar-summary">
            {previewData ? (
              <>
                <div className="summary-row">
                  <span>Tạm tính</span>
                  <span>{formatPrice(previewData.tong_tien_hang)}</span>
                </div>
                {previewData.tien_chiet_khau > 0 && (
                  <div className="summary-row" style={{ color: "#ff0000" }}>
                    <span>Khuyến mãi</span>
                    <span>-{formatPrice(previewData.tien_chiet_khau)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Phí vận chuyển</span>
                  {previewData.phi_giao_hang === 0 ? (
                    <span
                      style={{
                        backgroundColor: "#111",
                        color: "white",
                        padding: "2px 6px",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      MIỄN PHÍ
                    </span>
                  ) : (
                    <span>{formatPrice(previewData.phi_giao_hang)}</span>
                  )}
                </div>
                <div className="summary-row total">
                  <span>TỔNG TIỀN</span>
                  <span className="price">
                    {formatPrice(previewData.tong_thanh_toan)}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                Đang tính toán...
              </div>
            )}

            <button
              className="btn-confirm-order"
              onClick={handlePlaceOrder}
              disabled={!previewData}
            >
              XÁC NHẬN ĐẶT HÀNG &rarr;
            </button>
          </div>

          <div className="sidebar-trust">
            <span>
              <ShieldCheck size={14} /> Bảo hành chính hãng
            </span>
            <span>
              <Truck size={14} /> Giao hàng toàn quốc
            </span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
