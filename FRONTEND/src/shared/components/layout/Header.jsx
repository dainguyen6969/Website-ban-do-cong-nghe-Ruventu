// Shared admin layout component: Header.
import { useLocation } from 'react-router-dom';
import { HiOutlineBell, HiOutlineMenu, HiOutlineUser } from 'react-icons/hi';
import FontSwitcher from '../ui/FontSwitcher';
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

export default function Header({ notificationCount = 0, onMenuToggle, isMenuOpen = false }) {
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
  const isEmployeeDetail = /^\/admin\/nhan-vien\/[^/]+$/.test(currentPath) && !currentPath.endsWith('/danh-sach') && !currentPath.endsWith('/vai-tro');
  const isRolePage = currentPath === '/admin/nhan-vien/vai-tro';
  const isSupplierPage = currentPath === '/admin/khach-hang-doi-tac/nha-cung-cap';
  const isShippingPartnerPage = currentPath === '/admin/khach-hang-doi-tac/doi-tac-van-chuyen';
  const isOrderDetail = /^\/admin\/don-hang\/danh-sach-don-hang\/[^/]+$/.test(currentPath);
  const isCategoryDetail = /^\/admin\/danh-muc\/danh-muc-san-pham\/[^/]+$/.test(currentPath);
  const isCategoryList = currentPath === '/admin/danh-muc/danh-muc-san-pham';
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
        <button
          type="button"
          className="header__mobile-menu"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={isMenuOpen}
          aria-controls="admin-sidebar"
        >
          <HiOutlineMenu size={22} />
        </button>
        <nav className="header__breadcrumb" aria-label="Breadcrumb">
          <span className="header__breadcrumb-item header__breadcrumb-item--muted">
            ADMIN
          </span>
          <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
          {isCategoryDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">DANH MỤC SẢN PHẨM</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT DANH MỤC</span>
            </>
          ) : isCategoryList ? (
            <span className="header__breadcrumb-item header__breadcrumb-item--active">DANH MỤC SẢN PHẨM</span>
          ) : isOrderDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">ĐƠN HÀNG</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT ĐƠN HÀNG</span>
            </>
          ) : isShippingPartnerPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHÁCH HÀNG &amp; ĐỐI TÁC</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              {location.state?.partnerId && <><span className="header__breadcrumb-item header__breadcrumb-item--muted">ĐỐI TÁC VẬN CHUYỂN</span><span className="header__breadcrumb-sep" aria-hidden="true">›</span></>}
              <span className="header__breadcrumb-item header__breadcrumb-item--active">{location.state?.partnerId ? 'CHI TIẾT ĐỐI TÁC VẬN CHUYỂN' : 'ĐỐI TÁC VẬN CHUYỂN'}</span>
            </>
          ) : isSupplierPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">KHÁCH HÀNG &amp; ĐỐI TÁC</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              {location.state?.supplierId && <><span className="header__breadcrumb-item header__breadcrumb-item--muted">NHÀ CUNG CẤP</span><span className="header__breadcrumb-sep" aria-hidden="true">›</span></>}
              <span className="header__breadcrumb-item header__breadcrumb-item--active">{location.state?.supplierId ? 'CHI TIẾT NHÀ CUNG CẤP' : 'NHÀ CUNG CẤP'}</span>
            </>
          ) : isRolePage ? (
            <span className="header__breadcrumb-item header__breadcrumb-item--active">VAI TRÒ</span>
          ) : isEmployeeDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">NHÂN VIÊN</span>
              <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">CHI TIẾT NHÂN VIÊN</span>
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

        {/* Font switcher and notification bell */}
        <div className="header__group header__utilities">
          <FontSwitcher variant="admin" />
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
