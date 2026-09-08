import React from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2 } from 'lucide-react';
import './CartDrawer.css';
import productImg from '../assets/imgg.png';

const mockCartItems = [
  {
    id: 1,
    image: productImg,
    title: 'ASUS ROG STRIX GeForce RTX 4080 SUPER OC',
    variant: 'OC Edition / 16GB GDDR6X',
    price: '24.990.000đ',
    originalPrice: '27.900.000đ',
    quantity: 1
  }
];

const CartDrawer = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay */}
      <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      
      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <span>|</span> GIỎ HÀNG CỦA BẠN <span className="cart-count">1</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-items">
          {mockCartItems.map(item => (
            <div key={item.id} className="cart-drawer-item">
              <img src={item.image} alt={item.title} className="item-image" />
              <div className="item-details">
                <div className="item-title-row">
                  <h4 className="item-title">{item.title}</h4>
                  <button className="delete-btn"><Trash2 size={16} /></button>
                </div>
                <p className="item-variant">{item.variant}</p>
                <div className="item-price-row">
                  <div className="item-prices">
                    <span className="current-price">{item.price}</span>
                    <span className="original-price">{item.originalPrice}</span>
                  </div>
                  <div className="quantity-selector">
                    <button>-</button>
                    <input type="text" value={item.quantity} readOnly />
                    <button>+</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-drawer-footer">
          <div className="subtotal-row">
            <span>Tạm tính (1 sản phẩm)</span>
            <span className="subtotal-price">24.990.000đ</span>
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
