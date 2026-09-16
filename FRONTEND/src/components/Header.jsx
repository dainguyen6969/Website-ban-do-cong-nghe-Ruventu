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
  const isInventoryDetail = currentPath.startsWith('/kho-hang/quan-ly-phien-ban/chi-tiet/');
  const isVersionManagement = currentPath === '/kho-hang/quan-ly-phien-ban';
  const isSerialDetail = currentPath.startsWith('/kho-hang/danh-sach-serial/');
  const isSerialList = currentPath === '/kho-hang/danh-sach-serial';
  const isComboPage = currentPath.startsWith('/kho-hang/combo-san-pham');
  const isPurchasePage = currentPath.startsWith('/kho-hang/nhap-hang');
  const isStockCheckPage = currentPath.startsWith('/kho-hang/kiem-hang');
  const isStockCheckCreate = currentPath === '/kho-hang/kiem-hang/tao-moi' || currentPath.endsWith('/chinh-sua');
  const isStockCheckDetail = isStockCheckPage && currentPath !== '/kho-hang/kiem-hang' && !isStockCheckCreate;
  const isCustomerDetail = /^\/admin\/khach-hang-doi-tac\/khach-hang\/[^/]+$/.test(currentPath);
  const isOrderDetail = /^\/admin\/don-hang\/danh-sach-don-hang\/[^/]+$/.test(currentPath);
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
          {isOrderDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">ĐƠN HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT ĐƠN HÀNG</span>
            </>
          ) : isCustomerDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHÁCH HÀNG &amp; ĐỐI TÁC</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT KHÁCH HÀNG</span>
            </>
          ) : isStockCheckPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHO HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className={`header__breadcrumb-item ${isStockCheckCreate || isStockCheckDetail ? 'header__breadcrumb-item--muted' : 'header__breadcrumb-item--active'}`}>KIỂM HÀNG</span>
              {(isStockCheckCreate || isStockCheckDetail) && <>
                <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
                <span className="header__breadcrumb-item header__breadcrumb-item--active">{isStockCheckCreate ? 'TẠO PHIẾU KIỂM HÀNG' : 'CHI TIẾT PHIẾU KIỂM HÀNG'}</span>
              </>}
            </>
          ) : isPurchasePage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHO HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">{currentPath.includes('/tao-moi') ? 'TẠO / CHỈNH SỬA ĐƠN NHẬP HÀNG' : currentPath === '/kho-hang/nhap-hang' ? 'NHẬP HÀNG' : 'CHI TIẾT ĐƠN NHẬP HÀNG'}</span>
            </>
          ) : isComboPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHO HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">COMBO SẢN PHẨM</span>
            </>
          ) : isSerialDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">DANH SÁCH SERIAL</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT SERIAL</span>
            </>
          ) : isSerialList ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHO HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">DANH SÁCH SERIAL</span>
            </>
          ) : isInventoryDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">QUẢN LÝ PHIÊN BẢN</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT TỒN KHO</span>
            </>
          ) : isVersionManagement ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHO HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">QUẢN LÝ PHIÊN BẢN</span>
            </>
          ) : (
            <span className="header__breadcrumb-item header__breadcrumb-item--active">
              {currentPageName}
            </span>
          )}
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
