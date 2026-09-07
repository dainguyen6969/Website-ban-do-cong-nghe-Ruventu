import { useLocation } from 'react-router-dom';
import { HiOutlineBell, HiOutlineUser } from 'react-icons/hi';
import './Header.css';

const routeTitleMap = {
  '/admin/tong-quat': 'TỔNG QUÁT',
  '/admin/ban-hang': 'BÁN HÀNG',
  '/admin/san-pham': 'SẢN PHẨM',
  '/admin/don-hang': 'ĐƠN HÀNG',
  '/admin/khach-hang-doi-tac': 'KHÁCH HÀNG & ĐỐI TÁC',
  '/admin/nhan-vien': 'NHÂN VIÊN',
  '/admin/khuyen-mai': 'KHUYẾN MẠI',
  '/admin/so-quy-tien-mat': 'SỔ QUỸ TIỀN MẶT',
  '/admin/bao-cao': 'BÁO CÁO',
  '/admin/bao-hanh': 'BẢO HÀNH',
  '/admin/danh-muc': 'DANH MỤC',
};

export default function Header({ notificationCount = 0 }) {
  const location = useLocation();
  
  // Find current top-level route title
  const currentPath = location.pathname;
  let currentPageName = 'ĐƠN HÀNG';
  const isCreatePromotion = currentPath === '/admin/khuyen-mai/tao-khuyen-mai';
  
  for (const [path, title] of Object.entries(routeTitleMap)) {
    if (currentPath.startsWith(path)) {
      currentPageName = title;
      break;
    }
  }

  return (
    <header className="header" role="banner">
      <div className="header__left">
        <nav className="header__breadcrumb" aria-label="Breadcrumb">
          <span className="header__breadcrumb-item header__breadcrumb-item--muted">
            ADMIN
          </span>
          <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
          <span className="header__breadcrumb-item header__breadcrumb-item--active">
            {currentPageName}
          </span>
          {isCreatePromotion && (
            <>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">TẠO KHUYẾN MẠI</span>
            </>
          )}
        </nav>
      </div>

      <div className="header__right">
        {/* Date */}
        <div className="header__group">
          <span className="header__date">Thứ Bảy, 31/08/2024</span>
        </div>

        <div className="header__divider" aria-hidden="true" />

        {/* Notification bell */}
        <div className="header__group">
          <button
            className="header__icon-btn"
            id="notification-bell"
            aria-label="Thông báo"
          >
            <HiOutlineBell size={20} />
            {Number(notificationCount) > 0 && (
              <span className="header__notification-badge">{notificationCount}</span>
            )}
          </button>
        </div>

        <div className="header__divider" aria-hidden="true" />

        {/* User info */}
        <div className="header__group header__user">
          <div className="header__user-avatar">
            <HiOutlineUser size={18} />
          </div>
          <span className="header__user-name">Admin Tổng</span>
        </div>

        {/* Red accent bar */}
        <div className="header__accent-bar" aria-hidden="true" />
      </div>
    </header>
  );
}
