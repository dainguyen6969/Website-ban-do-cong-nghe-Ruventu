import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2 } from 'lucide-react';
import './CartDrawer.css';

const CartDrawer = ({ isOpen, onClose }) => {
  const [cartItems, setCartItems] = useState([]);

  const loadCart = () => {
    const items = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    setCartItems(items);
  };

  useEffect(() => {
    loadCart(); // Load on mount
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  const handleRemoveItem = (id) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('ruventu_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new CustomEvent('cartUpdated')); 
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedCart = cartItems.map(item => item.id === id ? { ...item, quantity: newQuantity } : item);
    setCartItems(updatedCart);
    localStorage.setItem('ruventu_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new CustomEvent('cartUpdated')); 
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const priceStr = item.price.replace(/\D/g, ''); // remove non-digits
      const price = parseInt(priceStr, 10) || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      
      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <span>|</span> GIỎ HÀNG CỦA BẠN <span className="cart-count">{totalQuantity}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-items">
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
              Giỏ hàng của bạn đang trống.
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="cart-drawer-item">
                <img src={item.image} alt={item.title} className="item-image" />
                <div className="item-details">
                  <div className="item-title-row">
                    <h4 className="item-title">{item.title}</h4>
                    <button className="delete-btn" onClick={() => handleRemoveItem(item.id)}><Trash2 size={16} /></button>
                  </div>
                <p className="item-variant">{item.variant}</p>
                <div className="item-price-row">
                  <div className="item-prices">
                    <span className="cart-current-price">{item.price}</span>
                    <span className="cart-original-price">{item.originalPrice}</span>
                  </div>
                  <div className="quantity-selector">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <input type="text" value={item.quantity} readOnly />
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>

        <div className="cart-drawer-footer">
          <div className="subtotal-row">
            <span>Tạm tính ({totalQuantity} sản phẩm)</span>
            <span className="subtotal-price">{calculateTotal().toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="shipping-notice">
            * Miễn phí vận chuyển cho đơn từ 500.000đ
          </div>
          <div className="cart-drawer-actions">
            <Link to="/checkout" onClick={onClose} style={{textDecoration: 'none'}}>
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
