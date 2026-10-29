import { Link, useNavigate, useLocation } from 'react-router-dom';
import { VIETNAM_LOCATIONS, matchProvince, matchDistrict } from '../../data/vietnamLocations';
import { ArrowLeft, ShieldCheck, Truck, MapPin, Navigation, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { orderService } from '../../shared/services/orderService';
import { cartService } from '../../shared/services/cartService';
import './CheckoutPage.css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { errorMessage, withIdempotency } from '../../shared/services/mutationUtils';
import { priceConfirmation } from '../../shared/services/saleQuote';

const formatPrice = (price) => {
  const num = Number(price);
  if (isNaN(num)) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [deliveryMethod, setDeliveryMethod] = useState('GIAO_HANG');
  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');

  const [cartItemIds, setCartItemIds] = useState([]);
  const [cartItemsData, setCartItemsData] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [promotionCode, setPromotionCode] = useState(null);
  const [promotionRemoving, setPromotionRemoving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewRevision, setPreviewRevision] = useState(0);

  const [placing, setPlacing] = useState(false);
  const [hasPendingAttempt, setHasPendingAttempt] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const checkoutAttempt = useRef(null);
  const placingRef = useRef(false);
  const GOONG_API_KEY = 'w6ddDpyabJSpcJXqsZB9FPLFv6dgaIrL9WfTYvAS';

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const addressWrapperRef = useRef(null);

  const LOCATION_DATA = VIETNAM_LOCATIONS;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    province: 'Hà Nội',
    ward: 'Quận Cầu Giấy',
    address: '',
    note: '',
  });

  const checkoutDraft = useMemo(
    () => ({
      cart_item_ids: cartItemIds,
      hinh_thuc_nhan_hang: deliveryMethod,
      dia_chi_id: null,

      thong_tin_nguoi_nhan: {
        ten_nguoi_nhan: formData.name.trim(),
        sdt_nguoi_nhan: formData.phone.replace(/[\s.-]/g, ''),

        dia_chi_giao_hang:
          deliveryMethod === 'GIAO_HANG'
            ? [formData.address.trim(), formData.ward.trim(), formData.province.trim()]
                .filter(Boolean)
                .join(', ')
            : null,
      },

      phuong_thuc_thanh_toan: paymentMethod,
      ma_chuong_trinh: promotionCode,
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
      promotionCode,
    ]
  );

  const draftSignature = JSON.stringify(checkoutDraft);

  const previewData = preview?.signature === draftSignature ? preview.data : null;

  const draftReady =
    cartReady &&
    cartItemIds.length > 0 &&
    Boolean(checkoutDraft.thong_tin_nguoi_nhan.ten_nguoi_nhan) &&
    /^(?:\+84|0)\d{9,10}$/.test(checkoutDraft.thong_tin_nguoi_nhan.sdt_nguoi_nhan) &&
    (deliveryMethod === 'NHAN_TAI_CUA_HANG' || Boolean(formData.address.trim()));

  const [errors, setErrors] = useState({});

  // Tạm tính từ giỏ hàng khi chưa có previewData từ server
  const tempSubtotal = useMemo(() => {
    return cartItemsData
      .filter((c) => cartItemIds.includes(c.cartItemId))
      .reduce(
        (sum, item) => sum + (Number(item.donGia ?? item.giaBan) || 0) * (item.soLuong || 1),
        0
      );
  }, [cartItemsData, cartItemIds]);

  useEffect(() => {
    let active = true;

    try {
      const userStr = localStorage.getItem('user');

      if (userStr) {
        const user = JSON.parse(userStr);

        setFormData((previous) => ({
          ...previous,
          name: user.ho_ten || user.name || user.hoTen || previous.name,
          phone: user.so_dien_thoai || user.soDienThoai || previous.phone,
          email: user.email || previous.email,
        }));
      }
    } catch (error) {
      console.error(error);
    }

    const selectedIds = (location.state?.cartItemIds || []).map(Number);

    if (!selectedIds.length) {
      navigate('/cart', { replace: true });

      return () => {
        active = false;
      };
    }

    setCartReady(false);
    setCartItemIds(selectedIds);
    setCheckoutError('');

    cartService
      .getCurrentCart()
      .then((response) => {
        if (!active) return;

        const cart = response.data?.data;

        if (!cart || !Array.isArray(cart.items)) {
          throw new Error('Dữ liệu giỏ hàng không hợp lệ.');
        }

        const availableIds = new Set(cart.items.map((item) => Number(item.cartItemId)));

        if (selectedIds.some((id) => !availableIds.has(id))) {
          throw new Error('Giỏ hàng đã thay đổi. Vui lòng trở lại giỏ hàng để chọn lại.');
        }

        const promotion = cart.khuyen_mai || cart.khuyenMai;

        setCartItemsData(cart.items);

        setPromotionCode(
          promotion?.ma_chuong_trinh || promotion?.maChuongTrinh || promotion?.maKhuyenMai || null
        );

        setCartReady(true);
      })
      .catch((error) => {
        if (!active) return;

        setCartReady(false);
        setCheckoutError(errorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [location.state, navigate]);

  useEffect(() => {
    const controller = new AbortController();

    setPreview(null);
    setPreviewError('');

    if (!draftReady) {
      setPreviewLoading(false);
      return () => controller.abort();
    }

    setPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await orderService.previewCheckout(checkoutDraft, controller.signal);

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

    if (name === 'province') {
      const defaultWard = LOCATION_DATA[value]?.[0] || '';
      setFormData((prev) => ({
        ...prev,
        province: value,
        ward: defaultWard,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }

    if (name === 'address') {
      if (value.trim().length >= 3) {
        searchGoongPlaces(value.trim());
      } else {
        setAddressSuggestions([]);
        setShowAddressDropdown(false);
      }
    }
  };

  // Tìm kiếm địa chỉ với Goong AutoComplete
  const searchGoongPlaces = async (query) => {
    try {
      setAddressSearchLoading(true);
      const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.predictions) {
        setAddressSuggestions(data.predictions);
        setShowAddressDropdown(true);
      }
    } catch (err) {
      console.error('Lỗi tìm kiếm địa chỉ Goong:', err);
    } finally {
      setAddressSearchLoading(false);
    }
  };

  // Chọn địa chỉ từ danh sách gợi ý của Goong
  const handleSelectSuggestion = (place) => {
    const compound = place.compound || {};
    const fullAddress = place.description || '';

    const matchedProvince = matchProvince(compound.province || '');
    const availableWards = LOCATION_DATA[matchedProvince] || [];
    const matchedWard = matchDistrict(compound.district || compound.commune || '', availableWards);

    setFormData((prev) => ({
      ...prev,
      address: fullAddress,
      province: matchedProvince,
      ward: matchedWard,
    }));

    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: null }));
    }

    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  // Lấy vị trí GPS hiện tại của người dùng qua Geolocation + Goong Reverse Geocoding
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const url = `https://rsapi.goong.io/Geocode?api_key=${GOONG_API_KEY}&latlng=${latitude},${longitude}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data?.results && data.results.length > 0) {
            const first = data.results[0];
            const compound = first.compound || {};
            const fullAddress = first.formatted_address || first.address || '';

            const matchedProvince = matchProvince(compound.province || '');
            const availableWards = LOCATION_DATA[matchedProvince] || [];
            const matchedWard = matchDistrict(
              compound.district || compound.commune || '',
              availableWards
            );

            setFormData((prev) => ({
              ...prev,
              address: fullAddress,
              province: matchedProvince,
              ward: matchedWard,
            }));

            if (errors.address) {
              setErrors((prev) => ({ ...prev, address: null }));
            }
          }
        } catch (err) {
          console.error('Lỗi lấy thông tin vị trí:', err);
          alert('Không thể chuyển đổi tọa độ thành địa chỉ. Vui lòng nhập tay.');
        } finally {
          setLocatingUser(false);
        }
      },
      (err) => {
        console.error('Lỗi Geolocation:', err);
        setLocatingUser(false);
        alert(
          'Không thể truy cập vị trí hiện tại. Vui lòng cho phép quyền định vị trên trình duyệt.'
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Đóng dropdown gợi ý địa chỉ khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target)) {
        setShowAddressDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlaceOrder = async () => {
    if (placingRef.current || promotionRemoving) return;

    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên.';
    }

    if (!/^(?:\+84|0)\d{9,10}$/.test(formData.phone.replace(/[\s.-]/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ.';
    }

    if (deliveryMethod === 'GIAO_HANG' && !formData.address.trim()) {
      newErrors.address = 'Vui lòng nhập địa chỉ cụ thể.';
    }

    if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      newErrors.email = 'Email không hợp lệ.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    placingRef.current = true;
    setPlacing(true);
    setCheckoutError('');

    try {
      let payload;

      if (checkoutAttempt.current) {
        const {
          ma_xac_nhan_gia: _quote,
          tong_thanh_toan_xac_nhan: _total,
          ...previousDraft
        } = checkoutAttempt.current.body;

        if (JSON.stringify(previousDraft) !== draftSignature) {
          throw new Error('Đơn trước chưa xác định kết quả. Hãy giữ nguyên thông tin để thử lại.');
        }

        payload = checkoutAttempt.current.body;
      } else {
        if (!previewData || previewLoading || previewData.tong_thanh_toan == null) {
          throw new Error('Vui lòng chờ tính lại tổng tiền.');
        }

        payload = {
          ...checkoutDraft,
          ...priceConfirmation(previewData),
        };
      }

      const response = await withIdempotency(
        checkoutAttempt,
        'customer:checkout',
        payload,
        (key, body) => orderService.submitCheckout(body, key)
      );

      const order = response.data.data;

      window.dispatchEvent(new CustomEvent('cartUpdated'));

      navigate('/success', {
        state: {
          orderCode: order.ma_don_hang,
          intake: order.tiep_nhan,
        },
      });
    } catch (error) {
      setCheckoutError(errorMessage(error));

      const status = Number(error.status || error.response?.status);

      if ([400, 404, 409, 422].includes(status)) {
        setPreview(null);
        setPreviewRevision((current) => current + 1);
      }
    } finally {
      placingRef.current = false;
      setHasPendingAttempt(Boolean(checkoutAttempt.current));
      setPlacing(false);
    }
  };

  const removeCheckoutPromotion = async () => {
    if (placingRef.current || checkoutAttempt.current || promotionRemoving || !promotionCode) {
      return;
    }

    setPromotionRemoving(true);
    setCheckoutError('');

    try {
      await cartService.removePromotion();

      setPromotionCode(null);
      setPreview(null);
      setPreviewRevision((value) => value + 1);

      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
      setCheckoutError(errorMessage(error));
    } finally {
      setPromotionRemoving(false);
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
                color: 'white',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ArrowLeft size={18} style={{ marginRight: '8px' }} /> THÔNG TIN THANH TOÁN
            </Link>
          </div>
          <div className="checkout-breadcrumb">
            <Link to="/cart" style={{ color: '#888', textDecoration: 'none' }}>
              GIỎ HÀNG{' '}
            </Link>
            <span>&gt;</span>
            <span className="current">THANH TOÁN</span>
            <span>&gt;</span>
            <span style={{ color: '#888' }}>XÁC NHẬN</span>
          </div>
        </div>
      </div>

      <div className="checkout-page-content container">
        <div className="checkout-main" inert={placing || hasPendingAttempt || promotionRemoving}>
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
                className={`form-input ${errors.name ? 'input-error' : ''}`}
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
                  className={`form-input ${errors.phone ? 'input-error' : ''}`}
                  placeholder="09xx xxx xxx"
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">EMAIL</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="ten@email.com"
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="checkout-section">
            <h3 className="section-title">PHƯƠNG THỨC NHẬN HÀNG</h3>
            <div className="selection-boxes">
              <div
                className={`selection-box ${deliveryMethod === 'GIAO_HANG' ? 'active' : ''}`}
                onClick={() => setDeliveryMethod('GIAO_HANG')}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Giao hàng tận nơi</h4>
                  <p>Giao trong 1-3 ngày làm việc</p>
                  <span className="badge-free">MIỄN PHÍ TỪ 5TR</span>
                </div>
              </div>
              <div
                className={`selection-box ${deliveryMethod === 'NHAN_TAI_CUA_HANG' ? 'active' : ''}`}
                onClick={() => setDeliveryMethod('NHAN_TAI_CUA_HANG')}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Nhận tại cửa hàng</h4>
                  <p>Sẵn sàng sau 2-4 giờ</p>
                  <span className="badge-free badge-green">MIỄN PHÍ VẬN CHUYỂN</span>
                </div>
              </div>
            </div>

            {deliveryMethod === 'GIAO_HANG' && (
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
                      {Object.keys(LOCATION_DATA).map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">QUẬN / HUYỆN / PHƯỜNG</label>
                    <select
                      name="ward"
                      value={formData.ward}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      {(LOCATION_DATA[formData.province] || []).map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div
                  className="form-group"
                  ref={addressWrapperRef}
                  style={{ position: 'relative' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label className="form-label" style={{ margin: 0 }}>
                      ĐỊA CHỈ CỤ THỂ
                    </label>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={locatingUser}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f11919',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: locatingUser ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                      }}
                      title="Lấy vị trí hiện tại của bạn"
                    >
                      {locatingUser ? (
                        <>
                          <Loader2 size={13} className="spin-animate" />
                          <span>Đang định vị...</span>
                        </>
                      ) : (
                        <>
                          <Navigation size={13} />
                          <span>Lấy vị trí hiện tại</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      onFocus={() => {
                        if (addressSuggestions.length > 0) setShowAddressDropdown(true);
                      }}
                      className={`form-input ${errors.address ? 'input-error' : ''}`}
                      placeholder="Nhập địa chỉ hoặc tên địa điểm (Goong Maps)..."
                      autoComplete="off"
                    />
                    {addressSearchLoading && (
                      <div
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#888',
                        }}
                      >
                        <Loader2 size={16} className="spin-animate" />
                      </div>
                    )}
                  </div>

                  {errors.address && <span className="error-text">{errors.address}</span>}

                  {showAddressDropdown && addressSuggestions.length > 0 && (
                    <div className="goong-autocomplete-dropdown">
                      {addressSuggestions.map((item, idx) => (
                        <div
                          key={item.place_id || idx}
                          className="goong-suggestion-item"
                          onClick={() => handleSelectSuggestion(item)}
                        >
                          <MapPin size={16} className="goong-icon" />
                          <div className="goong-item-text">
                            <span className="goong-main">
                              {item.structured_formatting?.main_text || item.description}
                            </span>
                            {item.structured_formatting?.secondary_text && (
                              <span className="goong-secondary">
                                {item.structured_formatting.secondary_text}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h3 className="section-title">PHƯƠNG THỨC THANH TOÁN</h3>
            <div className="selection-boxes" style={{ flexDirection: 'column', gap: '10px' }}>
              <div
                className={`selection-box ${paymentMethod === 'TIEN_MAT' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('TIEN_MAT')}
                style={{ padding: '15px 20px' }}
              >
                <div className="radio-custom"></div>
                <div className="selection-content">
                  <h4>Thanh toán khi nhận hàng (COD)</h4>
                  <p>Kiểm tra hàng trước khi thanh toán</p>
                </div>
              </div>
              <div
                className={`selection-box ${paymentMethod === 'CHUYEN_KHOAN' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('CHUYEN_KHOAN')}
                style={{ padding: '15px 20px' }}
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
                style={{ resize: 'vertical' }}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Sidebar Order Summary */}
        <div className="checkout-sidebar">
          <div className="sidebar-header">ĐƠN HÀNG CỦA BẠN</div>

          <div className="sidebar-items">
            {previewData?.san_pham
              ? previewData.san_pham.map((item) => {
                  const cartInfo =
                    cartItemsData.find((c) => c.phienBanId === item.phien_ban_id) || {};
                  return (
                    <div key={item.ma_dong} className="sidebar-item">
                      <img
                        src={cartInfo.anh || 'https://via.placeholder.com/60'}
                        alt={cartInfo.tenSanPham || 'Sản phẩm'}
                      />
                      <div className="sidebar-item-details">
                        <h4>
                          {item.ten_san_pham ||
                            cartInfo.tenSanPham ||
                            `Phiên bản #${item.phien_ban_id}`}
                        </h4>

                        <p>{item.ten_phien_ban || cartInfo.tenPhienBan || 'Tiêu chuẩn'}</p>

                        {item.la_qua_tang && <span className="checkout-gift-badge">QUÀ TẶNG</span>}

                        <div className="sidebar-item-price">
                          <span className="qty">x{item.so_luong}</span>

                          <span className="price">
                            {item.don_gia_da_gom_vat == null
                              ? '—'
                              : formatPrice(item.don_gia_da_gom_vat)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              : cartItemsData
                  .filter((c) => cartItemIds.includes(c.cartItemId))
                  .map((item) => (
                    <div key={item.cartItemId} className="sidebar-item">
                      <img
                        src={item.anh || 'https://via.placeholder.com/60'}
                        alt={item.tenSanPham || 'Sản phẩm'}
                      />
                      <div className="sidebar-item-details">
                        <h4>{item.tenSanPham}</h4>
                        <p>{item.tenPhienBan || 'Tiêu chuẩn'}</p>
                        <div className="sidebar-item-price">
                          <span className="qty">x{item.soLuong}</span>
                          <span className="price">{formatPrice(item.donGia ?? item.giaBan)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
          </div>

          <div className="sidebar-summary">
            {promotionCode && (
              <div className="checkout-promotion">
                <span>
                  Khuyến mại: <strong>{promotionCode}</strong>
                </span>

                <button
                  type="button"
                  disabled={placing || hasPendingAttempt || promotionRemoving}
                  onClick={removeCheckoutPromotion}
                >
                  {promotionRemoving ? 'ĐANG BỎ ƯU ĐÃI...' : 'BỎ ƯU ĐÃI VÀ TÍNH LẠI'}
                </button>
              </div>
            )}

            {hasPendingAttempt && (
              <p className="checkout-summary-message" role="status">
                Chưa xác định được kết quả đặt hàng. Giữ nguyên thông tin và thử lại cùng yêu cầu.
              </p>
            )}
            <div className="summary-row">
              <span>Tạm tính</span>

              <span>
                {formatPrice(previewData ? previewData.tong_tien_hang_da_gom_vat : tempSubtotal)}
              </span>
            </div>

            {previewData && Number(previewData.tien_giam_da_gom_vat) > 0 && (
              <div className="summary-row summary-row--discount">
                <span>Khuyến mại</span>

                <span>−{formatPrice(previewData.tien_giam_da_gom_vat)}</span>
              </div>
            )}

            <div className="summary-row">
              <span>Phí vận chuyển</span>

              {!previewData ? (
                <span>Chờ xác nhận</span>
              ) : Number(previewData.phi_giao_hang) === 0 ? (
                <span className="checkout-shipping-badge">MIỄN PHÍ</span>
              ) : (
                <span>{formatPrice(previewData.phi_giao_hang)}</span>
              )}
            </div>

            <p className="checkout-vat-note">Giá sản phẩm đã bao gồm VAT.</p>

            <div className="summary-row total">
              <span>TỔNG THANH TOÁN</span>

              <span className="price">
                {previewData ? formatPrice(previewData.tong_thanh_toan) : 'Chờ xác nhận'}
              </span>
            </div>

            {!previewData && (
              <p className="checkout-summary-message">
                {previewLoading
                  ? 'Đang cập nhật tổng tiền...'
                  : 'Vui lòng hoàn tất thông tin nhận hàng để xác nhận tổng tiền.'}
              </p>
            )}

            {previewError && (
              <p className="error-text checkout-summary-error" role="alert">
                {previewError}
              </p>
            )}

            {previewData?.tiep_nhan?.thong_bao && (
              <p className="checkout-summary-message" role="status">
                {previewData.tiep_nhan.thong_bao}
              </p>
            )}

            {previewData?.tiep_nhan?.luu_y_uu_dai && (
              <p className="checkout-summary-message">{previewData.tiep_nhan.luu_y_uu_dai}</p>
            )}

            {checkoutError && (
              <p className="error-text checkout-summary-error" role="alert">
                {checkoutError}
              </p>
            )}

            <button
              type="button"
              className="btn-confirm-order"
              onClick={handlePlaceOrder}
              disabled={
                placing ||
                promotionRemoving ||
                (!checkoutAttempt.current &&
                  (!previewData?.ma_xac_nhan_gia ||
                    previewData.co_the_thanh_toan === false ||
                    previewLoading ||
                    !draftReady))
              }
            >
              {placing
                ? 'ĐANG ĐẶT HÀNG...'
                : checkoutAttempt.current
                  ? 'THỬ LẠI YÊU CẦU'
                  : 'XÁC NHẬN ĐẶT HÀNG →'}
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
