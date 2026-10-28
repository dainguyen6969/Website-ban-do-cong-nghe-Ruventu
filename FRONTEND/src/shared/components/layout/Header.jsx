// Shared admin layout component: Header.
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineUser } from 'react-icons/hi';
import NotificationBell from './NotificationBell';
import FontSwitcher from '../ui/FontSwitcher';
import './Header.css';

const routeTitleMap = {
  '/admin/tai-khoan': 'TRANG TÀI KHOẢN',
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

import useMockAuth from '../../../auth/useMockAuth';

const DAYS_VN = [
  'Ch\u1ee7 Nh\u1eadt',
  'Th\u1ee9 Hai',
  'Th\u1ee9 Ba',
  'Th\u1ee9 T\u01b0',
  'Th\u1ee9 N\u0103m',
  'Th\u1ee9 S\u00e1u',
  'Th\u1ee9 B\u1ea3y',
];
function getLiveDate() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return DAYS_VN[now.getDay()] + ', ' + d + '/' + m + '/' + now.getFullYear();
}

export default function Header({ onMenuToggle, isMenuOpen = false }) {
  const location = useLocation();
  const { currentAccount } = useMockAuth();

  // Find current top-level route title
  const currentPath = location.pathname;
  const isWarrantyCreate = ['/admin/bao-hanh/lap-phieu', '/admin/bao-hanh/tao-moi'].includes(
    currentPath
  );
  const isWarrantyDetail =
    !isWarrantyCreate &&
    currentPath !== '/admin/bao-hanh/danh-sach' &&
    /^\/admin\/bao-hanh\/(?:chi-tiet\/)?[^/]+$/.test(currentPath);
  const isInventoryDetail = currentPath.startsWith('/kho-hang/quan-ly-phien-ban/chi-tiet/');
  const isVersionManagement = currentPath === '/kho-hang/quan-ly-phien-ban';
  const isSerialDetail = currentPath.startsWith('/kho-hang/danh-sach-serial/');
  const isSerialList = currentPath === '/kho-hang/danh-sach-serial';
  const isComboPage = currentPath.startsWith('/kho-hang/combo-san-pham');
  const isPurchasePage = currentPath.startsWith('/kho-hang/nhap-hang');
  const isRecallPage =
    currentPath === '/kho-hang/thu-hoi' || currentPath.startsWith('/kho-hang/thu-hoi/');

  const isRecallDetail = isRecallPage && currentPath !== '/kho-hang/thu-hoi';
  const isStockCheckPage = currentPath.startsWith('/kho-hang/kiem-hang');
  const isStockCheckCreate =
    currentPath === '/kho-hang/kiem-hang/tao-moi' || currentPath.endsWith('/chinh-sua');
  const isStockCheckDetail =
    isStockCheckPage && currentPath !== '/kho-hang/kiem-hang' && !isStockCheckCreate;
  const isCustomerDetail = /^\/admin\/khach-hang-doi-tac\/khach-hang\/[^/]+$/.test(currentPath);
  const isEmployeeDetail =
    /^\/admin\/nhan-vien\/[^/]+$/.test(currentPath) &&
    !currentPath.endsWith('/danh-sach') &&
    !currentPath.endsWith('/vai-tro');
  const isRolePage = currentPath === '/admin/nhan-vien/vai-tro';
  const isSupplierPage = currentPath === '/admin/khach-hang-doi-tac/nha-cung-cap';
  const isShippingPartnerPage = currentPath === '/admin/khach-hang-doi-tac/doi-tac-van-chuyen';
  const isOrderDetail = /^\/admin\/don-hang\/danh-sach-don-hang\/[^/]+$/.test(currentPath);
  const isCategoryDetail = /^\/admin\/danh-muc\/danh-muc-san-pham\/[^/]+$/.test(currentPath);
  const isCategoryList = currentPath === '/admin/danh-muc/danh-muc-san-pham';
  let currentPageName = 'ĐƠN HÀNG';
  const isCreatePromotion = currentPath === '/admin/khuyen-mai/tao-khuyen-mai';
  const isPromoDetail = /^\/admin\/khuyen-mai\/chi-tiet-khuyen-mai\/[^/]+$/.test(currentPath);

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
          <span className="header__breadcrumb-item header__breadcrumb-item--muted">ADMIN</span>
          <span className="header__breadcrumb-sep" aria-hidden="true">
            ›
          </span>
          {isWarrantyDetail || isWarrantyCreate ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                BẢO HÀNH
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                {isWarrantyCreate ? 'LẬP PHIẾU BẢO HÀNH' : 'CHI TIẾT PHIẾU BẢO HÀNH'}
              </span>
            </>
          ) : isCategoryDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                DANH MỤC SẢN PHẨM
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT DANH MỤC
              </span>
            </>
          ) : isCategoryList ? (
            <span className="header__breadcrumb-item header__breadcrumb-item--active">
              DANH MỤC SẢN PHẨM
            </span>
          ) : isOrderDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                ĐƠN HÀNG
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT ĐƠN HÀNG
              </span>
            </>
          ) : isShippingPartnerPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHÁCH HÀNG &amp; ĐỐI TÁC
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              {location.state?.partnerId && (
                <>
                  <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                    ĐỐI TÁC VẬN CHUYỂN
                  </span>
                  <span className="header__breadcrumb-sep" aria-hidden="true">
                    ›
                  </span>
                </>
              )}
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                {location.state?.partnerId ? 'CHI TIẾT ĐỐI TÁC VẬN CHUYỂN' : 'ĐỐI TÁC VẬN CHUYỂN'}
              </span>
            </>
          ) : isSupplierPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHÁCH HÀNG &amp; ĐỐI TÁC
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              {location.state?.supplierId && (
                <>
                  <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                    NHÀ CUNG CẤP
                  </span>
                  <span className="header__breadcrumb-sep" aria-hidden="true">
                    ›
                  </span>
                </>
              )}
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                {location.state?.supplierId ? 'CHI TIẾT NHÀ CUNG CẤP' : 'NHÀ CUNG CẤP'}
              </span>
            </>
          ) : isRolePage ? (
            <span className="header__breadcrumb-item header__breadcrumb-item--active">VAI TRÒ</span>
          ) : isEmployeeDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                NHÂN VIÊN
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT NHÂN VIÊN
              </span>
            </>
          ) : isCustomerDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHÁCH HÀNG &amp; ĐỐI TÁC
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT KHÁCH HÀNG
              </span>
            </>
          ) : isStockCheckPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHO HÀNG
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span
                className={`header__breadcrumb-item ${isStockCheckCreate || isStockCheckDetail ? 'header__breadcrumb-item--muted' : 'header__breadcrumb-item--active'}`}
              >
                KIỂM HÀNG
              </span>
              {(isStockCheckCreate || isStockCheckDetail) && (
                <>
                  <span className="header__breadcrumb-sep" aria-hidden="true">
                    ›
                  </span>
                  <span className="header__breadcrumb-item header__breadcrumb-item--active">
                    {isStockCheckCreate ? 'TẠO PHIẾU KIỂM HÀNG' : 'CHI TIẾT PHIẾU KIỂM HÀNG'}
                  </span>
                </>
              )}
            </>
          ) : isRecallPage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHO HÀNG
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                {isRecallDetail ? 'CHI TIẾT THU HỒI' : 'THU HỒI HÀNG'}
              </span>
            </>
          ) : isPurchasePage ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHO HÀNG
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                COMBO SẢN PHẨM
              </span>
            </>
          ) : isSerialDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                DANH SÁCH SERIAL
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT SERIAL
              </span>
            </>
          ) : isSerialList ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHO HÀNG
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                DANH SÁCH SERIAL
              </span>
            </>
          ) : isInventoryDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                QUẢN LÝ PHIÊN BẢN
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT TỒN KHO
              </span>
            </>
          ) : isVersionManagement ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHO HÀNG
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                QUẢN LÝ PHIÊN BẢN
              </span>
            </>
          ) : isPromoDetail ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHUYẾN MẠI
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                CHI TIẾT KHUYẾN MẠI
              </span>
            </>
          ) : isCreatePromotion ? (
            <>
              <span className="header__breadcrumb-item header__breadcrumb-item--muted">
                KHUYẾN MẠI
              </span>
              <span className="header__breadcrumb-sep" aria-hidden="true">
                ›
              </span>
              <span className="header__breadcrumb-item header__breadcrumb-item--active">
                TẠO KHUYẾN MẠI
              </span>
            </>
          ) : (
            <span className="header__breadcrumb-item header__breadcrumb-item--active">
              {currentPageName}
            </span>
          )}
        </nav>
      </div>

      <div className="header__right">
        {/* Date */}
        <div className="header__group">
          <span className="header__date">{getLiveDate()}</span>
        </div>

        <div className="header__divider" aria-hidden="true" />

        {/* Font switcher and notification bell */}
        <div className="header__group header__utilities">
          <FontSwitcher variant="admin" />
          <NotificationBell key={currentAccount?.id} />
        </div>

        <div className="header__divider" aria-hidden="true" />

        {/* User info */}
        {(() => {
          const user =
            currentAccount ||
            (() => {
              try {
                return JSON.parse(localStorage.getItem('user') || 'null');
              } catch {
                return null;
              }
            })();
          const displayName = user?.name || user?.ho_ten || user?.hoTen || user?.email || 'Admin';
          const userInitial = (displayName.trim().charAt(0) || 'A').toUpperCase();
          return (
            <Link
              to="/admin/tai-khoan"
              className="header__group header__user"
              aria-label="Mở trang tài khoản"
            >
              <div
                className="header__user-avatar"
                aria-label={`Tài khoản ${displayName}`}
                title={displayName}
              >
                <span className="header__user-initial">{userInitial}</span>
              </div>
              <span className="header__user-name">{displayName}</span>
            </Link>
          );
        })()}

        {/* Red accent bar */}
        <div className="header__accent-bar" aria-hidden="true" />
      </div>
    </header>
  );
}
