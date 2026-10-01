import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './CartPage.css';

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);

  const loadCart = () => {
    const items = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    setCartItems(items.map(item => ({ ...item, selected: item.selected !== false })));
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

  const handleQuantityChange = (id, change) => {
    const newItems = cartItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCart(newItems);
  };

  const handleDelete = (id) => {
    const newItems = cartItems.filter(item => item.id !== id);
    saveCart(newItems);
  };

  const handleToggleSelect = (id) => {
    const newItems = cartItems.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    );
    saveCart(newItems);
  };

  const handleToggleSelectAll = () => {
    const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
    const newItems = cartItems.map(item => ({ ...item, selected: !allSelected }));
    saveCart(newItems);
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    return parseInt(priceStr.toString().replace(/\D/g, ''), 10) || 0;
  };

  const selectedItems = cartItems.filter(item => item.selected);
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
  
  const totalCartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isAllSelected = cartItems.length > 0 && cartItems.every(item => item.selected);

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
                <div key={item.id} className="cart-page-item">
                  <div className="item-select">
                    <input type="checkbox" checked={item.selected} onChange={() => handleToggleSelect(item.id)} />
                  </div>
                  <div className="item-info">
                    <img src={item.image} alt={item.title} />
                    <div className="item-details">
                      <h4>{item.title}</h4>
                      <p>{item.variant || 'Tiêu chuẩn'}</p>
                      <div className="item-price-mobile">
                        <span className="current">{item.price}</span>
                        {item.originalPrice && <span className="original">{item.originalPrice}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="item-quantity">
                    <div className="quantity-selector">
                      <button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
                      <input type="text" value={item.quantity} readOnly />
                      <button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                    </div>
                  </div>
                  <div className="item-total">
                    <span className="total-price">{(parsePrice(item.price) * item.quantity).toLocaleString('vi-VN')}đ</span>
                    <button className="delete-btn" onClick={() => handleDelete(item.id)}><Trash2 size={18} /></button>
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
            <div className="coupon-input">
              <input type="text" placeholder="Nhập mã giảm giá..." />
              <button>ÁP DỤNG</button>
            </div>
            <div className="coupon-tags">
              <span>RUVENTU10</span>
              <span>PCGAMING15</span>
              <span>WELCOME20</span>
            </div>
          </div>

          <div className="summary-box">
            <h3>TÓM TẮT ĐƠN HÀNG</h3>
            <div className="summary-row">
              <span>Tạm tính ({selectedQuantity} sản phẩm)</span>
              <span>{totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span className="free-shipping">{totalPrice > 5000000 ? 'MIỄN PHÍ' : '30.000đ'}</span>
            </div>
            <div className="summary-total">
              <span>TỔNG TIỀN</span>
              <span className="total-amount">{(totalPrice + (totalPrice > 0 && totalPrice <= 5000000 ? 30000 : 0)).toLocaleString('vi-VN')}đ</span>
            </div>
            <Link to="/checkout" style={{textDecoration: 'none'}}>
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
