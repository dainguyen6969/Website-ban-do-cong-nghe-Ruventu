import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, ShoppingBag } from 'lucide-react';
import './Header.css';
import logo from '../assets/reventu.png';
import CartDrawer from './CartDrawer';

const Header = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);


  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <header className="header">
        {/* Top Banner */}
        <div className="top-banner">
          <p>MIỄN PHÍ VẬN CHUYỂN ĐƠN HÀNG TRÊN 5.000.000Đ - BẢO HÀNH CHÍNH HÃNG 36 THÁNG - HỖ TRỢ KỸ THUẬT 24/7</p>
        </div>

        {/* Main Header */}
        <div className="main-header">
          <div className="container header-container">
            {/* Logo */}
            <div className="logo-container">
              <Link to="/">
                <img src={logo} alt="Ruventu Logo" className="logo-image" />
              </Link>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
              <input type="text" placeholder="Tìm kiếm sản phẩm..." />
              <button className="search-btn">
                <Search size={18} />
                <span>TÌM KIẾM</span>
              </button>
            </div>

            {/* Actions */}
            <div className="header-actions">
              {user ? (
                <div 
                  className="user-profile-menu"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="user-profile-trigger">
                    <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                    <div className="user-greeting">
                      <span className="greeting-text">XIN CHÀO</span>
                      <span className="user-name">{user.name}</span>
                    </div>
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="user-dropdown">
                      <div className="dropdown-header">
                        <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                        <div className="user-info">
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </div>
                      <ul className="dropdown-links">
                        <li><Link to="/profile?tab=profile"><User size={16} /> Tài khoản của tôi</Link></li>
                        <li><Link to="/profile?tab=orders"><ShoppingBag size={16} /> Đơn hàng đã mua</Link></li>
                        <li><Link to="/warranty-lookup"><Search size={16} /> Tra cứu bảo hành</Link></li>
                      </ul>
                      <button className="logout-btn" onClick={handleLogout}>
                        ĐĂNG XUẤT
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="action-item">
                  <User size={24} />
                  <span>Tài khoản</span>
                </Link>
              )}
              <div className="action-item cart-action" onClick={() => setIsCartOpen(true)} style={{cursor: 'pointer'}}>
                <ShoppingBag size={24} />
                <span>Giỏ hàng</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="navbar">
          <div className="container nav-container">
            <ul className="nav-links">
              <li className="has-mega-menu">
                <a href="#">Linh Kiện PC</a>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <h4 className="mega-title">Xử lý & Bo mạch</h4>
                      <ul>
                        <li><a href="#">CPU - Bộ vi xử lý</a></li>
                        <li><a href="#">Mainboard - Bo mạch chủ</a></li>
                        <li><a href="#">RAM - Bộ nhớ trong</a></li>
                      </ul>
                    </div>
                    <div className="mega-col">
                      <h4 className="mega-title">Đồ họa & Nguồn</h4>
                      <ul>
                        <li><a href="#">VGA - Card màn hình</a></li>
                        <li><a href="#">PSU - Nguồn máy tính</a></li>
                        <li><a href="#">Case - Vỏ máy tính</a></li>
                      </ul>
                    </div>
                    <div className="mega-col">
                      <h4 className="mega-title">Lưu trữ & Tản nhiệt</h4>
                      <ul>
                        <li><a href="#">Ổ cứng SSD/HDD</a></li>
                        <li><a href="#">Tản nhiệt khí / nước</a></li>
                        <li><a href="#">Quạt tản nhiệt (Fan)</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
              
              <li className="has-mega-menu">
                <a href="#">Gaming Gear</a>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><a href="#">Bàn phím cơ</a></li>
                        <li><a href="#">Chuột Gaming</a></li>
                        <li><a href="#">Tai nghe Gaming</a></li>
                      </ul>
                    </div>
                    <div className="mega-col">
                      <ul>
                        <li><a href="#">Lót chuột</a></li>
                        <li><a href="#">Ghế Gaming</a></li>
                        <li><a href="#">Bàn Gaming</a></li>
                        <li><a href="#">Phụ kiện Gear khác</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li className="has-mega-menu">
                <a href="#">Màn Hình</a>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><a href="#">Màn hình Gaming (144Hz - 360Hz)</a></li>
                        <li><a href="#">Màn hình Đồ họa</a></li>
                        <li><a href="#">Màn hình Văn phòng</a></li>
                        <li><a href="#">Giá treo màn hình (Arm)</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li className="has-mega-menu">
                <a href="#">Laptop</a>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><a href="#">Laptop Gaming</a></li>
                        <li><a href="#">Laptop Văn phòng</a></li>
                        <li><a href="#">Laptop Đồ họa - Creator</a></li>
                      </ul>
                    </div>
                    <div className="mega-col">
                      <ul>
                        <li><a href="#">MacBook</a></li>
                        <li><a href="#">Linh kiện Laptop</a></li>
                        <li><a href="#">Balo / Túi chống sốc</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li className="has-mega-menu">
                <a href="#">Build PC</a>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><a href="#">Build PC theo Ngân sách</a></li>
                        <li><a href="#">Build PC theo Nhu cầu</a></li>
                        <li><a href="#">PC Gaming lắp ráp sẵn</a></li>
                        <li><a href="#">PC Văn phòng lắp ráp sẵn</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li><a href="#" className="highlight">Khuyến Mãi</a></li>
            </ul>
            <div className="hotline">
              Hotline: <span>1900 9999</span>
            </div>
          </div>
        </nav>
      </header>
      
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Header;
