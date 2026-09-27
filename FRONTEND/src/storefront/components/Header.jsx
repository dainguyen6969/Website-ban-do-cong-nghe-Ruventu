import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
    Search,
    User,
    ShoppingBag,
    Settings,
    ClipboardList,
} from 'lucide-react';
import axios from 'axios';

import './Header.css';
import logo from '../assets/reventu.png';
import CartDrawer from './CartDrawer';
import FontSwitcher from '../../shared/components/ui/FontSwitcher';

const Header = () => {
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);

    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const getCartCount = () => {
        try {
            const items = JSON.parse(
                localStorage.getItem('ruventu_cart') || '[]'
            );

            if (!Array.isArray(items)) {
                return 0;
            }

            return items.reduce(
                (total, item) => total + Number(item.quantity || 0),
                0
            );
        } catch {
            return 0;
        }
    };

    const [cartCount, setCartCount] = useState(getCartCount);

    /*
     * Theo dõi thay đổi giỏ hàng.
     *
     * Các component khác chỉ cần:
     *
     * window.dispatchEvent(new CustomEvent('cartUpdated'));
     *
     * Header sẽ tự đọc lại localStorage.
     */
    useEffect(() => {
        const handleCartUpdate = () => {
            setCartCount(getCartCount());
        };

        window.addEventListener('cartUpdated', handleCartUpdate);

        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post(
                'http://localhost:8080/api/v1/auth/logout',
                {},
                {
                    withCredentials: true,
                }
            );
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
        } finally {
            /*
             * Dù backend logout lỗi vẫn xóa session phía FE.
             */
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');

            setUser(null);
            setIsDropdownOpen(false);

            navigate('/login');
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();

        const keyword = searchQuery.trim();

        if (!keyword) {
            return;
        }

        navigate(`/search?q=${encodeURIComponent(keyword)}`);
    };

    const displayName =
        user?.name ||
        user?.ho_ten ||
        user?.email ||
        'Người dùng';

    const avatarLetter =
        displayName.charAt(0).toUpperCase();

    return (
        <>
            <header className="header">
                {/* ================= TOP BANNER ================= */}
                <div className="top-banner">
                    <button
                        className="banner-control banner-control-prev"
                        type="button"
                        aria-label="Khuyến mãi trước"
                    >
                        ◀
                    </button>

                    <button
                        className="banner-control banner-control-next"
                        type="button"
                        aria-label="Khuyến mãi tiếp theo"
                    >
                        ▶
                    </button>

                    <p>
                        MIỄN PHÍ VẬN CHUYỂN ĐƠN HÀNG TRÊN 5.000.000Đ -
                        BẢO HÀNH CHÍNH HÃNG 36 THÁNG -
                        HỖ TRỢ KỸ THUẬT 24/7
                    </p>
                </div>

                {/* ================= MAIN HEADER ================= */}
                <div className="main-header">
                    <div className="container header-container">
                        {/* Logo */}
                        <div className="logo-container">
                            <Link to="/">
                                <img
                                    src={logo}
                                    alt="Ruventu Logo"
                                    className="logo-image"
                                />
                            </Link>
                        </div>

                        {/* Search */}
                        <div className="search-bar">
                            <form
                                onSubmit={handleSearchSubmit}
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sản phẩm..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                />

                                <button
                                    type="submit"
                                    className="search-btn"
                                >
                                    <Search size={18} />
                                    <span>TÌM KIẾM</span>
                                </button>
                            </form>
                        </div>

                        {/* Actions */}
                        <div className="header-actions">
                            {/* Giữ lại từ main-test */}
                            <FontSwitcher variant="homepage" />

                            {/* Feature: tra cứu đơn hàng */}
                            <Link
                                to="/order-lookup"
                                className="action-item"
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                }}
                            >
                                <ClipboardList size={24} />
                                <span>Đơn hàng</span>
                            </Link>

                            {/* User */}
                            {user ? (
                                <div
                                    className="user-profile-menu"
                                    onMouseEnter={() =>
                                        setIsDropdownOpen(true)
                                    }
                                    onMouseLeave={() =>
                                        setIsDropdownOpen(false)
                                    }
                                >
                                    <div className="user-profile-trigger">
                                        <div className="user-avatar">
                                            {avatarLetter}
                                        </div>

                                        <div className="user-greeting">
                      <span className="greeting-text">
                        XIN CHÀO
                      </span>

                                            <span className="user-name">
                        {displayName}
                      </span>
                                        </div>
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="user-dropdown">
                                            <div className="dropdown-header">
                                                <div className="user-avatar">
                                                    {avatarLetter}
                                                </div>

                                                <div className="user-info">
                          <span className="user-name">
                            {displayName}
                          </span>

                                                    {user?.email && (
                                                        <span className="user-email">
                              {user.email}
                            </span>
                                                    )}
                                                </div>
                                            </div>

                                            <ul className="dropdown-links">
                                                <li>
                                                    <Link to="/profile?tab=profile">
                                                        <User size={16} />
                                                        Tài khoản của tôi
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/profile?tab=orders">
                                                        <ShoppingBag size={16} />
                                                        Đơn hàng đã mua
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/warranty-lookup">
                                                        <Search size={16} />
                                                        Tra cứu bảo hành
                                                    </Link>
                                                </li>

                                                {user?.role === 'admin' && (
                                                    <li>
                                                        <Link to="/admin">
                                                            <Settings size={16} />
                                                            Trang quản lý
                                                        </Link>
                                                    </li>
                                                )}
                                            </ul>

                                            <button
                                                className="logout-btn"
                                                onClick={handleLogout}
                                            >
                                                ĐĂNG XUẤT
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="action-item"
                                    style={{
                                        textDecoration: 'none',
                                        color: 'inherit',
                                    }}
                                >
                                    <User size={24} />
                                    <span>Tài khoản</span>
                                </Link>
                            )}

                            {/* Cart */}
                            <div
                                className="action-item cart-action"
                                onClick={() => setIsCartOpen(true)}
                                style={{
                                    cursor: 'pointer',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                    }}
                                >
                                    <ShoppingBag size={24} />

                                    {cartCount > 0 && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '-5px',
                                                right: '-10px',
                                                background: '#f11919',
                                                color: 'white',
                                                fontSize: '10px',
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                            }}
                                        >
                      {cartCount}
                    </span>
                                    )}
                                </div>

                                <span>Giỏ hàng</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= NAVIGATION ================= */}
                <nav className="navbar">
                    <div className="container nav-container">
                        <ul className="nav-links">
                            {/* ================= LINH KIỆN ================= */}
                            <li className="has-mega-menu">
                                <NavLink
                                    to="/category/linh-kien"
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    Linh Kiện PC
                                </NavLink>

                                <div className="mega-menu">
                                    <div className="mega-menu-content">
                                        <div className="mega-col">
                                            <h4 className="mega-title">
                                                Xử lý & Bo mạch
                                            </h4>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        CPU - Bộ vi xử lý
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=CPU Intel">
                                                            CPU Intel
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=CPU AMD">
                                                            CPU AMD
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        Mainboard - Bo mạch chủ
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=Mainboard Intel">
                                                            Mainboard Intel
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=Mainboard AMD">
                                                            Mainboard AMD
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        RAM - Bộ nhớ trong
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=DDR4">
                                                            RAM DDR4
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=DDR5">
                                                            RAM DDR5
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="mega-col">
                                            <h4 className="mega-title">
                                                Đồ họa & Nguồn
                                            </h4>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        VGA - Card màn hình
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=NVIDIA">
                                                            VGA NVIDIA
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=AMD">
                                                            VGA AMD
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        PSU - Nguồn máy tính
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=Corsair">
                                                            Nguồn Corsair
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=MSI">
                                                            Nguồn MSI
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        Case - Vỏ máy tính
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=Case Mid Tower">
                                                            Mid Tower
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=Case Full Tower">
                                                            Full Tower
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="mega-col">
                                            <h4 className="mega-title">
                                                Lưu trữ & Tản nhiệt
                                            </h4>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        Ổ cứng SSD/HDD
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=SSD NVMe">
                                                            SSD M.2 NVMe
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=SSD SATA">
                                                            SSD SATA 3
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="mega-sub-category">
                                                <h5 className="mega-sub-title">
                                                    <Link to="/category/linh-kien">
                                                        Tản nhiệt máy tính
                                                    </Link>
                                                </h5>

                                                <ul>
                                                    <li>
                                                        <Link to="/search?q=Tản khí">
                                                            Tản nhiệt khí
                                                        </Link>
                                                    </li>

                                                    <li>
                                                        <Link to="/search?q=Tản nước">
                                                            Tản nhiệt nước (AIO)
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>

                            {/* ================= GAMING GEAR ================= */}
                            <li className="has-mega-menu">
                                <NavLink
                                    to="/category/gaming-gear"
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    Gaming Gear
                                </NavLink>

                                <div className="mega-menu">
                                    <div className="mega-menu-content">
                                        <div className="mega-col">
                                            <ul>
                                                <li>
                                                    <Link to="/search?q=Bàn phím cơ">
                                                        Bàn phím cơ
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Chuột Gaming">
                                                        Chuột Gaming
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Tai nghe Gaming">
                                                        Tai nghe Gaming
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="mega-col">
                                            <ul>
                                                <li>
                                                    <Link to="/search?q=Lót chuột">
                                                        Lót chuột
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Ghế Gaming">
                                                        Ghế Gaming
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Bàn Gaming">
                                                        Bàn Gaming
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Phụ kiện Gear khác">
                                                        Phụ kiện Gear khác
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </li>

                            {/* ================= MÀN HÌNH ================= */}
                            <li className="has-mega-menu">
                                <NavLink
                                    to="/category/man-hinh"
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    Màn Hình
                                </NavLink>

                                <div className="mega-menu">
                                    <div className="mega-menu-content">
                                        <div className="mega-col">
                                            <ul>
                                                <li>
                                                    <Link to="/search?q=Màn hình Gaming">
                                                        Màn hình Gaming (144Hz - 360Hz)
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Màn hình Đồ họa">
                                                        Màn hình Đồ họa
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Màn hình Văn phòng">
                                                        Màn hình Văn phòng
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Giá treo màn hình">
                                                        Giá treo màn hình (Arm)
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </li>

                            {/* ================= LAPTOP ================= */}
                            <li className="has-mega-menu">
                                <NavLink
                                    to="/category/laptop"
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    Laptop
                                </NavLink>

                                <div className="mega-menu">
                                    <div className="mega-menu-content">
                                        <div className="mega-col">
                                            <ul>
                                                <li>
                                                    <Link to="/search?q=Laptop Gaming">
                                                        Laptop Gaming
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Laptop Văn phòng">
                                                        Laptop Văn phòng
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Laptop Đồ họa">
                                                        Laptop Đồ họa - Creator
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="mega-col">
                                            <ul>
                                                <li>
                                                    <Link to="/search?q=MacBook">
                                                        MacBook
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Linh kiện Laptop">
                                                        Linh kiện Laptop
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/search?q=Balo">
                                                        Balo / Túi chống sốc
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </li>

                            {/* ================= BUILD PC ================= */}
                            <li className="has-mega-menu">
                                <NavLink
                                    to="/build-pc"
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    Build PC
                                </NavLink>

                                <div className="mega-menu">
                                    <div className="mega-menu-content">
                                        <div className="mega-col">
                                            <ul>
                                                <li>
                                                    <Link to="/build-pc?type=budget">
                                                        Build PC theo Ngân sách
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/build-pc?type=need">
                                                        Build PC theo Nhu cầu
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/category/pc-gaming">
                                                        PC Gaming lắp ráp sẵn
                                                    </Link>
                                                </li>

                                                <li>
                                                    <Link to="/category/pc-van-phong">
                                                        PC Văn phòng lắp ráp sẵn
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </li>

                            {/* ================= KHÁC ================= */}
                            <li>
                                <NavLink
                                    to="/promotions"
                                    className={({ isActive }) =>
                                        isActive
                                            ? 'highlight active'
                                            : 'highlight'
                                    }
                                >
                                    Khuyến Mãi
                                </NavLink>
                            </li>

                            <li>
                                <NavLink
                                    to="/warranty-lookup"
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    Tra Cứu Bảo Hành
                                </NavLink>
                            </li>
                        </ul>

                        <div className="hotline">
                            Hotline: <span>1900 9999</span>
                        </div>
                    </div>
                </nav>
            </header>

            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
            />
        </>
    );
};

export default Header;