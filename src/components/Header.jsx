import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, Settings } from 'lucide-react';
import './Header.css';
import logo from '../assets/reventu.png';
import CartDrawer from './CartDrawer';

const Header = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => {
    const items = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
    return items.reduce((total, item) => total + item.quantity, 0);
  });

  useEffect(() => {
    const handleCartUpdate = () => {
      const items = JSON.parse(localStorage.getItem('ruventu_cart') || '[]');
      const count = items.reduce((total, item) => total + item.quantity, 0);
      setCartCount(count);
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsDropdownOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
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
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%' }}>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm sản phẩm..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="search-btn">
                  <Search size={18} />
                  <span>TÌM KIẾM</span>
                </button>
              </form>
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
                        {user?.role === 'admin' && (
                          <li><Link to="/admin"><Settings size={16} /> Trang quản lý</Link></li>
                        )}
                      </ul>
                      <button className="logout-btn" onClick={handleLogout}>
                        ĐĂNG XUẤT
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="action-item" style={{textDecoration: 'none', color: 'inherit'}}>
                  <User size={24} />
                  <span>Tài khoản</span>
                </Link>
              )}
              <div className="action-item cart-action" onClick={() => setIsCartOpen(true)} style={{cursor: 'pointer'}}>
                <div style={{ position: 'relative' }}>
                  <ShoppingBag size={24} />
                  {cartCount > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-10px', background: '#f11919', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {cartCount}
                    </span>
                  )}
                </div>
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
                <Link to="/category/linh-kien">Linh Kiện PC</Link>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <h4 className="mega-title">Xử lý & Bo mạch</h4>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">CPU - Bộ vi xử lý</Link></h5>
                        <ul>
                          <li><Link to="/search?q=CPU Intel">CPU Intel</Link></li>
                          <li><Link to="/search?q=CPU AMD">CPU AMD</Link></li>
                        </ul>
                      </div>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">Mainboard - Bo mạch chủ</Link></h5>
                        <ul>
                          <li><Link to="/search?q=Mainboard Intel">Mainboard Intel</Link></li>
                          <li><Link to="/search?q=Mainboard AMD">Mainboard AMD</Link></li>
                        </ul>
                      </div>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">RAM - Bộ nhớ trong</Link></h5>
                        <ul>
                          <li><Link to="/search?q=DDR4">RAM DDR4</Link></li>
                          <li><Link to="/search?q=DDR5">RAM DDR5</Link></li>
                        </ul>
                      </div>
                    </div>
                    <div className="mega-col">
                      <h4 className="mega-title">Đồ họa & Nguồn</h4>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">VGA - Card màn hình</Link></h5>
                        <ul>
                          <li><Link to="/search?q=NVIDIA">VGA NVIDIA</Link></li>
                          <li><Link to="/search?q=AMD">VGA AMD</Link></li>
                        </ul>
                      </div>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">PSU - Nguồn máy tính</Link></h5>
                        <ul>
                          <li><Link to="/search?q=Corsair">Nguồn Corsair</Link></li>
                          <li><Link to="/search?q=MSI">Nguồn MSI</Link></li>
                        </ul>
                      </div>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">Case - Vỏ máy tính</Link></h5>
                        <ul>
                          <li><Link to="/search?q=Case Mid Tower">Mid Tower</Link></li>
                          <li><Link to="/search?q=Case Full Tower">Full Tower</Link></li>
                        </ul>
                      </div>
                    </div>
                    <div className="mega-col">
                      <h4 className="mega-title">Lưu trữ & Tản nhiệt</h4>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">Ổ cứng SSD/HDD</Link></h5>
                        <ul>
                          <li><Link to="/search?q=SSD NVMe">SSD M.2 NVMe</Link></li>
                          <li><Link to="/search?q=SSD SATA">SSD SATA 3</Link></li>
                        </ul>
                      </div>
                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title"><Link to="/category/linh-kien">Tản nhiệt máy tính</Link></h5>
                        <ul>
                          <li><Link to="/search?q=Tản khí">Tản nhiệt khí</Link></li>
                          <li><Link to="/search?q=Tản nước">Tản nhiệt nước (AIO)</Link></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              
              <li className="has-mega-menu">
                <Link to="/category/gaming-gear">Gaming Gear</Link>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><Link to="/search?q=Bàn phím cơ">Bàn phím cơ</Link></li>
                        <li><Link to="/search?q=Chuột Gaming">Chuột Gaming</Link></li>
                        <li><Link to="/search?q=Tai nghe Gaming">Tai nghe Gaming</Link></li>
                      </ul>
                    </div>
                    <div className="mega-col">
                      <ul>
                        <li><Link to="/search?q=Lót chuột">Lót chuột</Link></li>
                        <li><Link to="/search?q=Ghế Gaming">Ghế Gaming</Link></li>
                        <li><Link to="/search?q=Bàn Gaming">Bàn Gaming</Link></li>
                        <li><Link to="/search?q=Phụ kiện Gear khác">Phụ kiện Gear khác</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li className="has-mega-menu">
                <Link to="/category/man-hinh">Màn Hình</Link>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><Link to="/search?q=Màn hình Gaming">Màn hình Gaming (144Hz - 360Hz)</Link></li>
                        <li><Link to="/search?q=Màn hình Đồ họa">Màn hình Đồ họa</Link></li>
                        <li><Link to="/search?q=Màn hình Văn phòng">Màn hình Văn phòng</Link></li>
                        <li><Link to="/search?q=Giá treo màn hình">Giá treo màn hình (Arm)</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li className="has-mega-menu">
                <Link to="/category/laptop">Laptop</Link>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><Link to="/search?q=Laptop Gaming">Laptop Gaming</Link></li>
                        <li><Link to="/search?q=Laptop Văn phòng">Laptop Văn phòng</Link></li>
                        <li><Link to="/search?q=Laptop Đồ họa">Laptop Đồ họa - Creator</Link></li>
                      </ul>
                    </div>
                    <div className="mega-col">
                      <ul>
                        <li><Link to="/search?q=MacBook">MacBook</Link></li>
                        <li><Link to="/search?q=Linh kiện Laptop">Linh kiện Laptop</Link></li>
                        <li><Link to="/search?q=Balo">Balo / Túi chống sốc</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li className="has-mega-menu">
                <Link to="/build-pc">Build PC</Link>
                <div className="mega-menu">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li><Link to="/build-pc?type=budget">Build PC theo Ngân sách</Link></li>
                        <li><Link to="/build-pc?type=need">Build PC theo Nhu cầu</Link></li>
                        <li><Link to="/category/pc-gaming">PC Gaming lắp ráp sẵn</Link></li>
                        <li><Link to="/category/pc-van-phong">PC Văn phòng lắp ráp sẵn</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>

              <li><Link to="/promotions" className="highlight">Khuyến Mãi</Link></li>
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
