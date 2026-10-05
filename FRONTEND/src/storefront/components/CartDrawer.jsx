import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2 } from 'lucide-react';
import { cartService } from '../../shared/services/cartService';
import './CartDrawer.css';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const CartDrawer = ({ isOpen, onClose }) => {
  const [cartData, setCartData] = useState({ items: [], totalAmount: 0, totalQuantity: 0 });

  const loadCart = async () => {
    try {
      const res = await cartService.getCurrentCart();
      if (res && res.data && res.data.data) {
        const data = res.data.data;
        setCartData({
          items: data.items || [],
          totalAmount: data.tongTien || 0,
          totalQuantity: data.tongSoLuong || 0
        });
        window.dispatchEvent(new CustomEvent('cartCountUpdated', { detail: { count: data.tongSoLuong || 0 } }));
      }
    } catch (err) {
      console.error("Lỗi fetch giỏ hàng:", err);
      // Giỏ hàng trống hoặc lỗi
      setCartData({ items: [], totalAmount: 0, totalQuantity: 0 });
      window.dispatchEvent(new CustomEvent('cartCountUpdated', { detail: { count: 0 } }));
    }
  };

  useEffect(() => {
    loadCart(); // Load on mount
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  useEffect(() => {
    if (isOpen) loadCart(); // Refresh when opening
  }, [isOpen]);

  const handleRemoveItem = async (id) => {
    try {
      await cartService.removeItem(id);
      loadCart();
    } catch (err) {
      alert('Lỗi khi xóa sản phẩm');
    }
  };

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await cartService.updateItem(id, newQuantity);
      loadCart();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật số lượng');
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      
      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <span>|</span> GIỎ HÀNG CỦA BẠN <span className="cart-count">{cartData.totalQuantity}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-items">
          {cartData.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
              Giỏ hàng của bạn đang trống.
            </div>
          ) : (
            cartData.items.map(item => (
              <div key={item.cartItemId} className="cart-drawer-item">
                <img src={item.anh || 'https://via.placeholder.com/60'} alt={item.tenSanPham} className="item-image" />
                <div className="item-details">
                  <div className="item-title-row">
                    <h4 className="item-title">{item.tenSanPham}</h4>
                    <button className="delete-btn" onClick={() => handleRemoveItem(item.cartItemId)}><Trash2 size={16} /></button>
                  </div>
                <p className="item-variant">{item.tenPhienBan}</p>
                <div className="item-price-row">
                  <div className="item-prices">
                    <span className="cart-current-price">{formatPrice(item.donGia)}</span>
                  </div>
                  <div className="quantity-selector">
                    <button onClick={() => updateQuantity(item.cartItemId, item.soLuong - 1)} disabled={item.soLuong <= 1}>-</button>
                    <input type="text" value={item.soLuong} readOnly />
                    <button onClick={() => updateQuantity(item.cartItemId, item.soLuong + 1)} disabled={item.soLuong >= item.tonKhoKhaDung}>+</button>
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>

        <div className="cart-drawer-footer">
          <div className="subtotal-row">
            <span>Tạm tính ({cartData.totalQuantity} sản phẩm)</span>
            <span className="subtotal-price">{formatPrice(cartData.totalAmount)}</span>
          </div>
          <div className="shipping-notice">
            * Miễn phí vận chuyển cho đơn từ 500.000đ
          </div>
          <div className="cart-drawer-actions">
            <Link 
              to="/checkout" 
              onClick={onClose} 
              style={{textDecoration: 'none'}}
              state={{ cartItemIds: cartData.items.map(i => i.cartItemId) }}
            >
              <button className="btn-checkout">THANH TOÁN NGAY &rarr;</button>
            </Link>
            <Link to="/cart" onClick={onClose} style={{textDecoration: 'none'}}>
              <button className="btn-view-cart">XEM GIỎ HÀNG &rarr;</button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
