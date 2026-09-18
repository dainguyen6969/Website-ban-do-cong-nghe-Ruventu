import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineMenu,
  HiOutlineLogout,
  HiOutlineUser,
} from 'react-icons/hi';
import './Sidebar.css';
import useMockAuth from '../auth/useMockAuth';

const IconTongQuat = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="4" y="4" width="6" height="6" />
    <rect x="14" y="4" width="6" height="6" />
    <rect x="4" y="14" width="6" height="6" />
    <rect x="14" y="14" width="6" height="6" />
  </svg>
);

const IconBanHang = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M12 2v20M16 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8" />
  </svg>
);

const IconSanPham = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <polygon points="12 2 22 7.5 22 16.5 12 22 2 16.5 2 7.5" />
  </svg>
);

const IconDonHang = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M5 2h10l4 4v16H5V2z" />
    <path d="M14 2v5h5" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="15" y2="16" />
  </svg>
);

const IconKhachHangDoiTac = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <circle cx="8" cy="7" r="4" />
    <path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 4l4 3-4 3" />
    <path d="M16 14l4 3v4" />
  </svg>
);

const IconNhanVien = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="9" y="4" width="6" height="6" />
    <path d="M5 21v-4l3-4h8l3 4v4" />
  </svg>
);

const IconKhuyenMai = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M2 2l9 0 11 11-9 9L2 11V2z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const IconSoQuyTienMat = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="2" y="3" width="20" height="14" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
);

const IconBaoCao = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="4" y="12" width="4" height="8" />
    <rect x="10" y="4" width="4" height="16" />
    <rect x="16" y="8" width="4" height="12" />
    <path d="M2 22h20" />
  </svg>
);

const IconBaoHanh = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M12 2L3 6v6c0 5 9 10 9 10s9-5 9-10V6L12 2z" />
  </svg>
);

const IconDanhMuc = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <rect x="4" y="5" width="3" height="3" />
    <rect x="4" y="11" width="3" height="3" />
    <rect x="4" y="17" width="3" height="3" />
    <line x1="10" y1="6.5" x2="20" y2="6.5" />
    <line x1="10" y1="12.5" x2="20" y2="12.5" />
    <line x1="10" y1="18.5" x2="20" y2="18.5" />
  </svg>
);

const menuItems = [
  {
    id: 'tong-quat',
    label: 'Tổng quát',
    icon: IconTongQuat,
    path: '/admin/tong-quat',
    expandable: false,
  },
  {
    id: 'ban-hang',
    label: 'Bán hàng',
    icon: IconBanHang,
    path: '/admin/ban-hang',
    expandable: false,
  },
  {
    id: 'san-pham',
    label: 'Sản phẩm',
    icon: IconSanPham,
    path: '/admin/san-pham',
    expandable: true,
    subItems: [
      { id: 'danh-sach-san-pham', label: 'Danh sách sản phẩm', path: '/admin/san-pham/danh-sach-san-pham' },
      { id: 'quan-ly-kho', label: 'Quản lý kho', expandable: true, children: [
        { id: 'toan-bo-phien-ban', label: 'Quản lý phiên bản', path: '/kho-hang/quan-ly-phien-ban' },
        { id: 'danh-sach-serial', label: 'Danh sách Serial', path: '/kho-hang/danh-sach-serial' },
        { id: 'combo-san-pham', label: 'Combo sản phẩm', path: '/kho-hang/combo-san-pham' },
        { id: 'nhap-hang', label: 'Nhập hàng', path: '/kho-hang/nhap-hang' },
        { id: 'kiem-hang', label: 'Kiểm hàng', path: '/kho-hang/kiem-hang' },
      ] },
    ],
  },
  {
    id: 'don-hang',
    label: 'Đơn hàng',
    icon: IconDonHang,
    path: '/admin/don-hang',
    expandable: true,
    badge: '0',
    subItems: [
      { id: 'danh-sach-don-hang', label: 'Danh sách đơn hàng', path: '/admin/don-hang/danh-sach-don-hang' },
      { id: 'dat-hang-online', label: 'Đặt hàng online', path: '/admin/don-hang/dat-hang-online' },
      { id: 'quan-ly-giao-hang', label: 'Quản lý giao hàng', path: '/admin/don-hang/quan-ly-giao-hang', badge: '0' },
      { id: 'khach-tra-hang', label: 'Khách trả hàng', path: '/admin/don-hang/khach-tra-hang' },
    ],
  },
  {
    id: 'khach-hang-doi-tac',
    label: 'Khách hàng & Đối tác',
    icon: IconKhachHangDoiTac,
    path: '/admin/khach-hang-doi-tac',
    expandable: true,
    subItems: [
      { id: 'khach-hang', label: 'Khách hàng', path: '/admin/khach-hang-doi-tac/khach-hang' },
      { id: 'nha-cung-cap', label: 'Nhà cung cấp', path: '/admin/khach-hang-doi-tac/nha-cung-cap' },
      { id: 'doi-tac-van-chuyen', label: 'Đối tác vận chuyển', path: '/admin/khach-hang-doi-tac/doi-tac-van-chuyen' },
    ],
  },
  {
    id: 'nhan-vien',
    label: 'Nhân viên',
    icon: IconNhanVien,
    path: '/admin/nhan-vien',
    expandable: true,
    subItems: [
      { id: 'danh-sach-nhan-vien', label: 'Danh sách nhân viên', path: '/admin/nhan-vien/danh-sach' },
      { id: 'vai-tro-nhan-vien', label: 'Vai trò', path: '/admin/nhan-vien/vai-tro' },
    ],
  },
  {
    id: 'khuyen-mai',
    label: 'Khuyến mại',
    icon: IconKhuyenMai,
    path: '/admin/khuyen-mai',
    expandable: true,
    subItems: [
      { id: 'danh-sach-khuyen-mai', label: 'Danh sách khuyến mại', path: '/admin/khuyen-mai/danh-sach-khuyen-mai' },
      { id: 'tao-khuyen-mai', label: 'Tạo khuyến mại', path: '/admin/khuyen-mai/tao-khuyen-mai' },
    ],
  },
  {
    id: 'so-quy-tien-mat',
    label: 'Sổ quỹ tiền mặt',
    icon: IconSoQuyTienMat,
    path: '/admin/so-quy-tien-mat',
    expandable: true,
    subItems: [],
  },
  {
    id: 'bao-cao',
    label: 'Báo cáo',
    icon: IconBaoCao,
    path: '/admin/bao-cao',
    expandable: true,
    subItems: [],
  },
  {
    id: 'bao-hanh',
    label: 'Bảo hành',
    icon: IconBaoHanh,
    path: '/admin/bao-hanh',
    expandable: true,
    subItems: [],
  },
  {
    id: 'danh-muc',
    label: 'Danh mục',
    icon: IconDanhMuc,
    path: '/admin/danh-muc',
    expandable: true,
    subItems: [],
  },
];

const shouldShowBadge = (badge) => {
  if (badge === undefined || badge === null || badge === false) return false;
  const num = Number(badge);
  if (!isNaN(num)) {
    return num > 0;
  }
  return String(badge).trim().length > 0 && badge !== '0';
};

const hasActivePath = (item, pathname) =>
  (item.path ? pathname.startsWith(item.path) : false) || item.children?.some((child) => hasActivePath(child, pathname));

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentAccount } = useMockAuth();
  const [expandedMenus, setExpandedMenus] = useState(['don-hang']);

  // Auto-expand menu if current route matches sub-item or section
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems && item.subItems.length > 0) {
        const isSubActive = item.subItems.some((sub) => hasActivePath(sub, location.pathname)) || location.pathname.startsWith(item.path);
        if (isSubActive) {
          setExpandedMenus((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
        }
        item.subItems.forEach((sub) => {
          if (sub.children?.some((child) => hasActivePath(child, location.pathname))) {
            setExpandedMenus((prev) => (prev.includes(sub.id) ? prev : [...prev, sub.id]));
          }
        });
      }
    });
  }, [location.pathname]);

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isExpanded = (menuId) => expandedMenus.includes(menuId);

  const handleParentClick = (item) => {
    if (item.expandable) {
      toggleMenu(item.id);
      // If it has subitems, don't navigate top-level. If it has no subitems, navigate to its path
      if (!item.subItems || item.subItems.length === 0) {
        navigate(item.path);
      }
    } else {
      navigate(item.path);
    }
  };

  const handleSubClick = (subPath) => {
    navigate(subPath);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar__header">
        <button
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label="Toggle menu"
          id="sidebar-toggle"
        >
          <HiOutlineMenu size={22} />
        </button>
        {!collapsed && (
          <div className="sidebar__brand">
            <span className="sidebar__logo">RUVENTU</span>
            <span className="sidebar__admin-badge">ADMIN</span>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="sidebar__nav" role="navigation" aria-label="Menu chính">
        <ul className="sidebar__menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Check active parent item based on URL route
            const isDirectActive = location.pathname === item.path;
            const isChildActive = item.subItems?.some((sub) => hasActivePath(sub, location.pathname));
            const isActive = isDirectActive || isChildActive;
            const isMenuExpanded = isExpanded(item.id);

            return (
              <li
                key={item.id}
                className={`sidebar__menu-item ${isMenuExpanded ? 'sidebar__menu-item--expanded' : ''}`}
              >
                <button
                  className={`sidebar__menu-btn ${isActive ? 'sidebar__menu-btn--active' : ''} ${isMenuExpanded ? 'sidebar__menu-btn--expanded' : ''}`}
                  onClick={() => handleParentClick(item)}
                  id={`menu-${item.id}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__menu-icon">
                    <Icon size={20} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="sidebar__menu-label">{item.label}</span>
                      {shouldShowBadge(item.badge) && (
                        <span className="sidebar__badge sidebar__badge--red">
                          {item.badge}
                        </span>
                      )}
                      {item.expandable && (
                        <span className="sidebar__chevron">
                          {isMenuExpanded ? (
                            <HiOutlineChevronUp size={16} />
                          ) : (
                            <HiOutlineChevronDown size={16} />
                          )}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {item.expandable &&
                  item.subItems &&
                  item.subItems.length > 0 &&
                  isMenuExpanded &&
                  !collapsed && (
                    <ul className="sidebar__submenu">
                      {item.subItems.map((sub) => {
                        const isSubActive = hasActivePath(sub, location.pathname);
                        const isSubExpanded = isExpanded(sub.id);
                        return (
                          <li key={sub.id} className={`sidebar__submenu-item ${isSubExpanded ? 'sidebar__submenu-item--expanded' : ''}`}>
                            <button
                              className={`sidebar__submenu-btn ${isSubActive ? 'sidebar__submenu-btn--active' : ''}`}
                              onClick={() => {
                                if (sub.children) {
                                  toggleMenu(sub.id);
                                } else {
                                  handleSubClick(sub.path);
                                }
                              }}
                              id={`submenu-${sub.id}`}
                            >
                              <span className="sidebar__submenu-bullet">—</span>
                              <span className="sidebar__submenu-label">{sub.label}</span>
                              {sub.children && <span className="sidebar__submenu-chevron">{isSubExpanded ? <HiOutlineChevronUp size={14} /> : <HiOutlineChevronDown size={14} />}</span>}
                              {shouldShowBadge(sub.badge) && (
                                <span className="sidebar__badge sidebar__badge--red sidebar__badge--sm">
                                  {sub.badge}
                                </span>
                              )}
                            </button>
                            {sub.children && isSubExpanded && (
                              <ul className="sidebar__nested-submenu">
                                {sub.children.map((child) => <li key={child.id}><button className={`sidebar__nested-submenu-btn ${location.pathname.startsWith(child.path) ? 'sidebar__nested-submenu-btn--active' : ''}`} onClick={() => handleSubClick(child.path)}><span>—</span>{child.label}</button></li>)}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">
            <HiOutlineUser size={20} />
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{currentAccount?.name ?? 'Quản trị viên'}</span>
              <span className="sidebar__user-email">{currentAccount?.email}</span>
            </div>
          )}
        </div>
        <button className="sidebar__exit-btn" id="exit-to-portal" title="Về cổng khách hàng" onClick={() => navigate('/')}>
          <HiOutlineLogout size={18} />
          {!collapsed && <span>Về cổng khách hàng</span>}
        </button>
      </div>
    </aside>
  );
}
