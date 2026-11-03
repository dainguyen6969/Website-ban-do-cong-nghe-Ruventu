import React, { useEffect, useState, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useMockAuth from "../../auth/useMockAuth";
import {
  Search,
  User,
  ShoppingBag,
  Settings,
  ClipboardList,
} from "lucide-react";

import "./Header.css";
import logo from "../assets/reventu.png";
import CartDrawer from "./CartDrawer";
import NavMenu from "./NavMenu";
import CatalogNavigation from "./CatalogNavigation";
import FontSwitcher from "../../shared/components/ui/FontSwitcher";
import { productService, toProductCard } from "../../shared/services/productService";
import { cartService } from "../../shared/services/cartService";
import { isRecommendationQuery } from '../services/recommendationService';

const Header = () => {
  const navigate = useNavigate();
  const { logout } = useMockAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [cartCount, setCartCount] = useState(() => {
    try { return cartService.getCachedCart()?.data?.data?.tongSoLuong || 0; }
    catch { return 0; }
  });

  useEffect(() => {
    // Initial fetch
    const fetchCartCount = async () => {
      try {
        const res = await cartService.getCurrentCart();
        setCartCount(res?.data?.data?.tongSoLuong || 0);
      } catch {
        setCartCount(0);
      }
    };
    fetchCartCount();

    const handleCartUpdate = (e) => {
      if (e.detail !== undefined && e.detail.count !== undefined) {
        setCartCount(e.detail.count);
      } else {
        // Fallback fetch if event didn't include count
        fetchCartCount();
      }
    };

    window.addEventListener("cartUpdated", fetchCartCount);
    window.addEventListener("cartCountUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", fetchCartCount);
      window.removeEventListener("cartCountUpdated", handleCartUpdate);
    };
  }, []);

  // Đóng suggestions khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce gọi API tìm kiếm
  useEffect(() => {
    let active = true;
    const fetchSuggestions = async () => {
      if (isRecommendationQuery(searchQuery)) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      if (searchQuery.trim().length >= 2) {
        try {
          const response = await productService.getProducts({ keyword: searchQuery.trim(), limit: 5 });
          if (active && response && response.data && response.data.danhSachSanPham) {
            setSuggestions(response.data.danhSachSanPham.map(toProductCard));
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error("Lỗi fetch suggestions:", error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => { active = false; clearTimeout(timer); };
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Lỗi đăng xuất backend:", error);
    } finally {

      localStorage.removeItem("ruventu_cart");
      setCartCount(0);
      window.dispatchEvent(new CustomEvent("cartCountUpdated", { detail: { count: 0 } }));
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      setUser(null);
      setIsDropdownOpen(false);

      navigate("/login", { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const keyword = searchQuery.trim();

    if (!keyword) {
      return;
    }

    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(keyword)}${isRecommendationQuery(keyword) ? '&mode=recommended' : ''}`);
  };

  const displayName = user?.name || user?.ho_ten || user?.email || "Người dùng";

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="header">
        {/* ================= TOP BANNER ================= */}
        <div className="top-banner">
          <p>
            MIỄN PHÍ VẬN CHUYỂN ĐƠN HÀNG TRÊN 5.000.000Đ - BẢO HÀNH CHÍNH HÃNG
            36 THÁNG - HỖ TRỢ KỸ THUẬT 24/7
          </p>
        </div>

        {/* ================= MAIN HEADER ================= */}
        <div className="main-header">
          <div className="container header-container">
            {/* Logo */}
            <div className="logo-container">
              <Link to="/" className="header-brand" aria-label="Ruventu - Trang chủ">
                <svg className="logo-image" viewBox="150 125 190 190" aria-hidden="true" focusable="false">
                  <image href={logo} width="500" height="500" />
                </svg>
                <span className="header-brand-name">RUVENTU</span>
              </Link>
            </div>

            {/* Search */}
            <div className="search-bar" ref={searchRef} style={{ position: "relative" }}>
              <form
                onSubmit={handleSearchSubmit}
                style={{
                  display: "flex",
                  width: "100%",
                }}
              >
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                />

                <button type="submit" className="search-btn">
                  <Search size={18} />
                  <span>TÌM KIẾM</span>
                </button>
              </form>

              {showSuggestions && suggestions.length > 0 && !isRecommendationQuery(searchQuery) && (
                <div className="search-suggestions">
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.id}`}
                      className="suggestion-item"
                      onClick={() => {
                        setShowSuggestions(false);
                        setSearchQuery("");
                      }}
                    >
                      {p.image && <img src={p.image} alt={p.title} className="suggestion-img" />}
                      <div className="suggestion-info">
                        <span className="suggestion-name">{p.title}</span>
                        <span className="suggestion-price">
                          {p.priceFrom && "Từ "}{p.price}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <ClipboardList size={24} />
                <span>Đơn hàng</span>
              </Link>

              {/* User */}
              {user ? (
                <div
                  className="user-profile-menu"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="user-profile-trigger" role="button" tabIndex={0}
                    aria-label="Mở menu tài khoản" aria-expanded={isDropdownOpen}
                    onClick={() => setIsDropdownOpen(true)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setIsDropdownOpen(true);
                      }
                      if (event.key === 'Escape') setIsDropdownOpen(false);
                    }}>
                    <div className="user-avatar">{avatarLetter}</div>

                    <div className="user-greeting">
                      <span className="greeting-text">XIN CHÀO</span>

                      <span className="user-name">{displayName}</span>
                    </div>
                  </div>

                  {isDropdownOpen && (
                    <div className="user-dropdown">
                      <div className="dropdown-header">
                        <div className="user-avatar">{avatarLetter}</div>

                        <div className="user-info">
                          <span className="user-name">{displayName}</span>

                          {user?.email && (
                            <span className="user-email">{user.email}</span>
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

                        {user?.role === "admin" && (
                          <li>
                            <Link to="/admin">
                              <Settings size={16} />
                              Trang quản lý
                            </Link>
                          </li>
                        )}
                      </ul>

                      <button className="logout-btn" onClick={handleLogout}>
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
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <User size={24} />
                  <span>Tài khoản</span>
                </Link>
              )}

              {/* Cart */}
              <div
                className="action-item cart-action"
                role="button"
                tabIndex={0}
                aria-label="Mở giỏ hàng"
                onClick={() => setIsCartOpen(true)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setIsCartOpen(true);
                  }
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <ShoppingBag size={24} />

                  {cartCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-10px",
                        background: "#f11919",
                        color: "white",
                        fontSize: "10px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
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
              <CatalogNavigation />

              {/* ================= BUILD PC ================= */}
              <NavMenu label="Build PC" to="/build-pc">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li>
                          <span aria-disabled="true" title="Chưa có chế độ gợi ý theo ngân sách">Build PC theo Ngân sách</span>
                        </li>

                        <li>
                          <span aria-disabled="true" title="Chưa có chế độ gợi ý theo nhu cầu">Build PC theo Nhu cầu</span>
                        </li>

                        <li>
                          <Link to="/category/pc-build">
                            PC build sẵn
                          </Link>
                        </li>

                        <li>
                          <span aria-disabled="true" title="Chưa có danh mục PC văn phòng riêng">PC Văn phòng lắp ráp sẵn</span>
                        </li>
                      </ul>
                    </div>
                  </div>
              </NavMenu>

              {/* ================= KHÁC ================= */}
              <li>
                <NavLink
                  to="/promotions"
                  className={({ isActive }) =>
                    isActive ? "highlight active" : "highlight"
                  }
                >
                  Khuyến Mãi
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/warranty-lookup"
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  Tra Cứu Bảo Hành
                </NavLink>
              </li>
            </ul>

            <div className="hotline">
              Hotline: <a href="tel:19009999">1900 9999</a>
            </div>
          </div>
        </nav>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Header;
