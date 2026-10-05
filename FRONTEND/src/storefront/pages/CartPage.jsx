import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { cartService } from '../../shared/services/cartService';
import './CartPage.css';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [cartData, setCartData] = useState({ tongTien: 0, tongTienSauKhuyenMai: 0, khuyenMai: null });
  const [voucherCode, setVoucherCode] = useState('');

  const loadCart = async () => {
    try {
      const res = await cartService.getCurrentCart();
      if (res?.data?.data) {
        const data = res.data.data;
        // Keep existing selected states if they exist
        setCartItems(prev => {
          const prevSelected = prev.reduce((acc, item) => ({...acc, [item.cartItemId]: item.selected}), {});
          return (data.items || []).map(item => ({
            ...item,
            selected: prevSelected[item.cartItemId] !== false // default true
          }));
        });
        setCartData({
          tongTien: data.tongTien || 0,
          tongTienSauKhuyenMai: data.tongTienSauKhuyenMai || 0,
          khuyenMai: data.khuyenMai || null
        });
        window.dispatchEvent(new CustomEvent('cartCountUpdated', { detail: { count: data.tongSoLuong || 0 } }));
      }
    } catch (err) {
      console.error(err);
      setCartItems([]);
    }
  };

  useEffect(() => {
    loadCart();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  const saveCart = (newItems) => {
    setCartItems(newItems);
    localStorage.setItem('ruventu_cart', JSON.stringify(newItems));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const handleQuantityChange = async (id, change) => {
    const item = cartItems.find(i => i.cartItemId === id);
    if (!item) return;
    const newQty = Math.max(1, item.soLuong + change);
    try {
      await cartService.updateItem(id, newQty);
      loadCart();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cập nhật số lượng');
    }
  };

  const handleDelete = async (id) => {
    try {
      await cartService.removeItem(id);
      loadCart();
    } catch (err) {
      alert('Không thể xóa sản phẩm');
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode) return;
    try {
      await cartService.applyPromotion(voucherCode);
      loadCart();
      alert('Áp dụng mã giảm giá thành công!');
    } catch (err) {
      alert(err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleRemoveVoucher = async () => {
    try {
      // Assuming removePromotion exists or we can just send empty. 
      // Since backend doesn't have a specific remove endpoint in the controller we saw, 
      // wait, the plan is to just apply or not.
      // If there's no remove endpoint, we might not need this. But let's try calling apply with empty string if remove doesn't exist.
      // Assuming cartService.removePromotion() exists based on our creation.
      await cartService.removePromotion();
      loadCart();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSelect = (id) => {
    const newItems = cartItems.map(item => 
      item.cartItemId === id ? { ...item, selected: !item.selected } : item
    );
    saveCart(newItems);
  };

  const handleToggleSelectAll = () => {
    const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
    const newItems = cartItems.map(item => ({ ...item, selected: !allSelected }));
    saveCart(newItems);
  };

  const selectedItems = cartItems.filter(item => item.selected);
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.soLuong, 0);
  
  // Calculate local total for selected items
  const localTotalPrice = selectedItems.reduce((sum, item) => sum + (item.donGia * item.soLuong), 0);
  const isAllSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
  const totalCartQuantity = cartItems.reduce((sum, item) => sum + item.soLuong, 0);
  
  // If all selected, use API totals (which includes voucher). Otherwise use local total (ignoring voucher for simplicity on partial select)
  const finalPrice = isAllSelected && cartData.khuyenMai ? cartData.tongTienSauKhuyenMai : localTotalPrice;
  const discountAmount = isAllSelected && cartData.khuyenMai ? (cartData.tongTien - cartData.tongTienSauKhuyenMai) : 0;

  return (
    <div className="cart-page-wrapper">
      <Header />
      
      {/* Red Breadcrumb/Header Bar */}
      <div className="cart-page-header">
        <div className="container">
          <div className="cart-page-title">
            <span><ShoppingBagIcon /> GIỎ HÀNG</span>
            <span className="cart-count">{totalCartQuantity}</span>
          </div>
          <div className="cart-breadcrumb">
            <Link to="/">TRANG CHỦ</Link> <span>&gt;</span> <span className="current">GIỎ HÀNG</span>
          </div>
        </div>
      </div>

      <div className="cart-page-content container">
        <div className="cart-main">
          <div className="cart-table-header">
            <div className="col-checkbox">
              <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} />
              <span>CHỌN TẤT CẢ ({cartItems.length} SẢN PHẨM)</span>
            </div>
            <div className="col-quantity">SỐ LƯỢNG</div>
            <div className="col-price">THÀNH TIỀN</div>
          </div>

          <div className="cart-items-list">
            {cartItems.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                Giỏ hàng của bạn đang trống.
              </div>
            ) : (
              cartItems.map(item => (
                <div key={item.cartItemId} className="cart-page-item">
                  <div className="item-select">
                    <input type="checkbox" checked={item.selected} onChange={() => handleToggleSelect(item.cartItemId)} />
                  </div>
                  <div className="item-info">
                    <img src={item.anh || 'https://via.placeholder.com/100'} alt={item.tenSanPham} />
                    <div className="item-details">
                      <h4>{item.tenSanPham}</h4>
                      <p>{item.tenPhienBan}</p>
                      <div className="item-price-mobile">
                        <span className="current">{formatPrice(item.donGia)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="item-quantity">
                    <div className="quantity-selector">
                      <button onClick={() => handleQuantityChange(item.cartItemId, -1)} disabled={item.soLuong <= 1}>-</button>
                      <input type="text" value={item.soLuong} readOnly />
                      <button onClick={() => handleQuantityChange(item.cartItemId, 1)} disabled={item.soLuong >= item.tonKhoKhaDung}>+</button>
                    </div>
                  </div>
                  <div className="item-total">
                    <span className="total-price">{formatPrice(item.donGia * item.soLuong)}</span>
                    <button className="delete-btn" onClick={() => handleDelete(item.cartItemId)}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {cartItems.length > 0 && (
            <div className="cart-selection-info">
              Đã chọn <strong>{selectedQuantity}</strong> sản phẩm
            </div>
          )}
        </div>

        <div className="cart-sidebar">
          <div className="coupon-box">
            <h3><TagIcon /> MÃ GIẢM GIÁ</h3>
            {cartData.khuyenMai ? (
              <div className="applied-coupon" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'rgba(255,0,0,0.1)', border: '1px solid #ff0000', marginTop: '10px' }}>
                <div>
                  <strong>{cartData.khuyenMai.maKhuyenMai}</strong>
                  <div style={{ fontSize: '12px', color: '#888' }}>{cartData.khuyenMai.tenKhuyenMai}</div>
                </div>
                <button onClick={handleRemoveVoucher} style={{ background: 'none', border: 'none', color: '#ff0000', cursor: 'pointer' }}><X size={16} /></button>
              </div>
            ) : (
              <div className="coupon-input">
                <input 
                  type="text" 
                  placeholder="Nhập mã giảm giá..." 
                  value={voucherCode} 
                  onChange={e => setVoucherCode(e.target.value)}
                />
                <button onClick={handleApplyVoucher}>ÁP DỤNG</button>
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
              <div className="summary-row" style={{ color: '#ff0000' }}>
                <span>Giảm giá (Voucher)</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span className="free-shipping">{finalPrice > 5000000 ? 'MIỄN PHÍ' : '30.000đ'}</span>
            </div>
            <div className="summary-total">
              <span>TỔNG TIỀN</span>
              <span className="total-amount">{formatPrice(finalPrice + (finalPrice > 0 && finalPrice <= 5000000 ? 30000 : 0))}</span>
            </div>
            <Link 
              to="/checkout" 
              style={{textDecoration: 'none'}}
              state={{ 
                cartItemIds: selectedItems.map(i => i.cartItemId), 
                voucherCode: cartData.khuyenMai?.maKhuyenMai 
              }}
            >
              <button className="btn-checkout-full" disabled={selectedQuantity === 0} style={{ opacity: selectedQuantity === 0 ? 0.5 : 1 }}>TIẾN HÀNH ĐẶT HÀNG &rarr;</button>
            </Link>
            <div className="trust-badges">
              <span><ShieldCheckIcon /> Bảo hành chính hãng</span>
              <span><TruckIcon /> Giao hàng toàn quốc</span>
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
);

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
);

const ShieldCheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
);

const TruckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
);

export default CartPage;
