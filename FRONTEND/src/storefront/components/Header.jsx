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
import FontSwitcher from "../../shared/components/ui/FontSwitcher";
import { productService, toProductCard } from "../../shared/services/productService";
import { cartService } from "../../shared/services/cartService";

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

  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    const fetchCartCount = async () => {
      try {
        const res = await cartService.getCurrentCart();
        if (res?.data?.data?.tongSoLuong) {
          setCartCount(res.data.data.tongSoLuong);
        }
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
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const response = await productService.getProducts({ keyword: searchQuery.trim(), limit: 5 });
          if (response && response.data && response.data.danhSachSanPham) {
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

    return () => clearTimeout(timer);
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

    navigate(`/search?q=${encodeURIComponent(keyword)}`);
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
              <Link to="/">
                <img src={logo} alt="Ruventu Logo" className="logo-image" />
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

              {showSuggestions && suggestions.length > 0 && (
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
              {/* ================= LINH KIỆN ================= */}
              <NavMenu label="Linh Kiện PC" to="/category/linh-kien">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <h4 className="mega-title">Xử lý & Bo mạch</h4>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/cpu">
                            CPU - Bộ vi xử lý
                          </Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=CPU Intel">CPU Intel</Link>
                          </li>

                          <li>
                            <Link to="/search?q=CPU AMD">CPU AMD</Link>
                          </li>
                        </ul>
                      </div>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/mainboard">
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
                          <Link to="/category/ram">
                            RAM - Bộ nhớ trong
                          </Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=DDR4">RAM DDR4</Link>
                          </li>

                          <li>
                            <Link to="/search?q=DDR5">RAM DDR5</Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="mega-col">
                      <h4 className="mega-title">Đồ họa & Nguồn</h4>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/vga">
                            VGA - Card màn hình
                          </Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=NVIDIA">VGA NVIDIA</Link>
                          </li>

                          <li>
                            <Link to="/search?q=VGA AMD">VGA AMD</Link>
                          </li>
                        </ul>
                      </div>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/psu">
                            PSU - Nguồn máy tính
                          </Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=PSU Corsair">Nguồn Corsair</Link>
                          </li>

                          <li>
                            <Link to="/search?q=PSU MSI">Nguồn MSI</Link>
                          </li>
                        </ul>
                      </div>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/case">
                            Case - Vỏ máy tính
                          </Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=Case Mid Tower">Mid Tower</Link>
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
                      <h4 className="mega-title">Lưu trữ & Tản nhiệt</h4>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/ssd">Ổ cứng SSD/HDD</Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=SSD NVMe">SSD M.2 NVMe</Link>
                          </li>

                          <li>
                            <Link to="/search?q=SSD SATA">SSD SATA 3</Link>
                          </li>
                        </ul>
                      </div>

                      <div className="mega-sub-category">
                        <h5 className="mega-sub-title">
                          <Link to="/category/tan-nhiet">
                            Tản nhiệt máy tính
                          </Link>
                        </h5>

                        <ul>
                          <li>
                            <Link to="/search?q=Tản khí">Tản nhiệt khí</Link>
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
              </NavMenu>

              {/* ================= GAMING GEAR ================= */}
              <NavMenu label="Gaming Gear" to="/category/gaming-gear">
                  <div className="mega-menu-content">
                    <div className="mega-col">
                      <ul>
                        <li>
                          <Link to="/search?q=Bàn phím cơ">Bàn phím cơ</Link>
                        </li>

                        <li>
                          <Link to="/search?q=Chuột Gaming">Chuột Gaming</Link>
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
                          <Link to="/search?q=Lót chuột">Lót chuột</Link>
                        </li>

                        <li>
                          <Link to="/search?q=Ghế Gaming">Ghế Gaming</Link>
                        </li>

                        <li>
                          <Link to="/search?q=Bàn Gaming">Bàn Gaming</Link>
                        </li>

                        <li>
                          <Link to="/search?q=Phụ kiện Gear khác">
                            Phụ kiện Gear khác
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
              </NavMenu>

              {/* ================= MÀN HÌNH ================= */}
              <NavMenu label="Màn Hình" to="/category/man-hinh">
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
              </NavMenu>

              {/* ================= LAPTOP ================= */}
              <NavMenu label="Laptop" to="/category/laptop">
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
                          <Link to="/search?q=MacBook">MacBook</Link>
                        </li>

                        <li>
                          <Link to="/search?q=Linh kiện Laptop">
                            Linh kiện Laptop
                          </Link>
                        </li>

                        <li>
                          <Link to="/search?q=Balo">Balo / Túi chống sốc</Link>
                        </li>
                      </ul>
                    </div>
                  </div>
              </NavMenu>

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
