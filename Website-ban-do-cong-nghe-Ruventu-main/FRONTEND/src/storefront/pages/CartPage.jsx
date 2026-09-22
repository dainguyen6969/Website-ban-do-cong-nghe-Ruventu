import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './CartPage.css';
import productImg from '../assets/imgg.png';

const mockCartItems = [
  {
    id: 1,
    image: productImg,
    title: 'ASUS ROG STRIX GeForce RTX 4080 SUPER OC',
    variant: 'OC Edition / 16GB GDDR6X',
    price: '24.990.000đ',
    originalPrice: '27.900.000đ',
    quantity: 1,
    selected: true
  },
  {
    id: 2,
    image: productImg,
    title: 'AMD Ryzen 9 7950X Processor',
    variant: 'Boxed / Without Cooler',
    price: '15.290.000đ',
    originalPrice: '17.500.000đ',
    quantity: 1,
    selected: true
  },
  {
    id: 3,
    image: productImg,
    title: 'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz',
    variant: '6000MHz CL36 / Black',
    price: '6.980.000đ',
    originalPrice: '8.990.000đ',
    quantity: 2,
    selected: true
  },
  {
    id: 4,
    image: productImg,
    title: 'Samsung 990 Pro NVMe SSD 2TB',
    variant: '2TB / PCIe 4.0',
    price: '3.290.000đ',
    originalPrice: '3.990.000đ',
    quantity: 1,
    selected: false,
    outOfStock: true
  }
];

const CartPage = () => {
  return (
    <div className="cart-page-wrapper">
      <Header />
      
      {/* Red Breadcrumb/Header Bar */}
      <div className="cart-page-header">
        <div className="container">
          <div className="cart-page-title">
            <span><ShoppingBagIcon /> GIỎ HÀNG</span>
            <span className="cart-count">4</span>
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
              <input type="checkbox" defaultChecked />
              <span>CHỌN TẤT CẢ (5 SẢN PHẨM)</span>
            </div>
            <div className="col-quantity">SỐ LƯỢNG</div>
            <div className="col-price">THÀNH TIỀN</div>
          </div>

          <div className="cart-items-list">
            {mockCartItems.map(item => (
              <div key={item.id} className={`cart-page-item ${item.outOfStock ? 'out-of-stock' : ''}`}>
                <div className="item-select">
                  <input type="checkbox" defaultChecked={item.selected} disabled={item.outOfStock} />
                </div>
                <div className="item-info">
                  <img src={item.image} alt={item.title} />
                  <div className="item-details">
                    <h4>{item.title}</h4>
                    <p>{item.variant}</p>
                    <div className="item-price-mobile">
                      <span className="current">{item.price}</span>
                      <span className="original">{item.originalPrice}</span>
                    </div>
                  </div>
                </div>
                <div className="item-quantity">
                  {item.outOfStock ? (
                    <span className="out-of-stock-badge">HẾT HÀNG</span>
                  ) : (
                    <div className="quantity-selector">
                      <button>-</button>
                      <input type="text" value={item.quantity} readOnly />
                      <button>+</button>
                    </div>
                  )}
                </div>
                <div className="item-total">
                  {item.outOfStock ? '-' : <span className="total-price">{item.price}</span>}
                  <button className="delete-btn"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="cart-selection-info">
            Đã chọn <strong>4</strong> sản phẩm
          </div>
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
              <span>Tạm tính (4 sản phẩm)</span>
              <span>47.260.000đ</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span className="free-shipping">MIỄN PHÍ</span>
            </div>
            <div className="summary-total">
              <span>TỔNG TIỀN</span>
              <span className="total-amount">47.260.000đ</span>
            </div>
            <Link to="/checkout" style={{textDecoration: 'none'}}>
              <button className="btn-checkout-full">TIẾN HÀNH ĐẶT HÀNG &rarr;</button>
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
