// Shared layout for admin order screens.
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { HiOutlineDownload, HiOutlinePlus } from 'react-icons/hi';
import '../../../../shared/components/layout/MainContent.css';

const tabs = [
  { id: 'danh-sach-don-hang', label: 'Danh sách đơn hàng', path: '/admin/don-hang/danh-sach-don-hang' },
  { id: 'dat-hang-online', label: 'Đặt hàng online', path: '/admin/don-hang/dat-hang-online' },
  { id: 'quan-ly-giao-hang', label: 'Quản lý giao hàng', path: '/admin/don-hang/quan-ly-giao-hang' },
  { id: 'khach-tra-hang', label: 'Khách trả hàng', path: '/admin/don-hang/khach-tra-hang' },
];

export default function OrderLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOrderList = location.pathname === '/admin/don-hang/danh-sach-don-hang';
  const isOrderDetail = /^\/admin\/don-hang\/danh-sach-don-hang\/[^/]+$/.test(location.pathname);
  const isCustomerReturns = location.pathname.startsWith('/admin/don-hang/khach-tra-hang');
  const isDeliveryDetail = /^\/admin\/don-hang\/quan-ly-giao-hang\/[^/]+$/.test(location.pathname);
  const isDeliveryList = location.pathname === '/admin/don-hang/quan-ly-giao-hang';

  if (isOrderDetail) return <main className="order-detail-shell" role="main"><Outlet /></main>;
  if (isCustomerReturns) return <main className="return-shell" role="main"><Outlet /></main>;
  if (isDeliveryDetail) return <main className="delivery-detail-shell" role="main"><Outlet /></main>;
  if (isDeliveryList) return <main className="delivery-detail-shell" role="main"><Outlet /></main>;

  if (isOrderList) {
    return (
      <main className="order-list-shell" role="main">
        <section className="order-list-hero">
          <div>
            <nav className="content__breadcrumb" aria-label="Breadcrumb nội dung"><span className="content__breadcrumb-item">Đơn hàng</span><span className="content__breadcrumb-sep">›</span><span className="content__breadcrumb-item content__breadcrumb-item--current">Danh sách đơn hàng</span></nav>
            <h1>DANH SÁCH ĐƠN HÀNG</h1>
            <p>QUẢN LÝ TOÀN BỘ ĐƠN ONLINE VÀ TẠI QUẦY</p>
          </div>
          <button className="order-create-button" type="button" onClick={() => navigate('/admin/don-hang/dat-hang-online')}><HiOutlinePlus size={16} /> TẠO ĐƠN HÀNG</button>
        </section>
        <Outlet />
      </main>
    );
  }

  return (
    <main className="main-content" role="main">
      {/* Secondary breadcrumb */}
      <nav className="content__breadcrumb" aria-label="Breadcrumb nội dung">
        <span className="content__breadcrumb-item">Đơn hàng</span>
        <span className="content__breadcrumb-sep" aria-hidden="true">›</span>
        <span className="content__breadcrumb-item content__breadcrumb-item--current">
          Quản lý đơn hàng
        </span>
      </nav>

      {/* Page title + action buttons */}
      <div className="content__title-row">
        <h1 className="content__title">QUẢN LÝ ĐƠN HÀNG</h1>
        <div className="content__actions">
          <button className="btn btn--outline" id="btn-export-excel">
            <HiOutlineDownload size={16} />
            <span>XUẤT EXCEL</span>
          </button>
          <button className="btn btn--primary" id="btn-dat-hang-online">
            <HiOutlinePlus size={16} />
            <span>ĐẶT HÀNG ONLINE</span>
          </button>
        </div>
      </div>

      {/* Tabs matching URL route */}
      <div className="content__tabs" role="tablist" aria-label="Tabs đơn hàng">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.id}
              className={`content__tab ${isActive ? 'content__tab--active' : ''}`}
              onClick={() => navigate(tab.path)}
              role="tab"
              aria-selected={isActive}
              id={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="content__tabs-divider" aria-hidden="true" />

      {/* Nested route content */}
      <Outlet />
    </main>
  );
}
