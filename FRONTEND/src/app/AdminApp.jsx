// Admin application routes and shell composition.
import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../shared/components/layout/Sidebar';
import Header from '../shared/components/layout/Header';
import OrderLayout from '../features/admin/orders/components/OrderLayout';
import PermissionGate, { AdminPermissionsProvider } from '../shared/components/ui/PermissionGate';
import useMockAuth from '../auth/useMockAuth';
import CustomerProvider from '../context/CustomerProvider';
import OrderProvider from '../context/OrderProvider';
import { CashbookProvider } from '../features/admin/cashbook/context/CashbookContext';
import FontPreferenceContext from '../typography/FontPreferenceContext';
import useQaTypography from '../typography/useQaTypography';
import '../styles/index.css';
import './App.css';
import '../styles/responsive.css';
import '../styles/adminTables.css';
import '../styles/adminLinks.css';

const DanhSachDonHang = lazy(() => import('../features/admin/orders/pages/DanhSachDonHang'));
const DatHangOnline = lazy(() => import('../features/admin/orders/pages/DatHangOnline'));
const DonChoHangCanXuLy = lazy(() => import('../features/admin/orders/pages/DonChoHangCanXuLy'));
const QuanLyGiaoHang = lazy(() => import('../features/admin/shipping/pages/QuanLyGiaoHang'));
const KhachTraHang = lazy(() => import('../features/admin/customers/pages/KhachTraHang'));
const DanhSachSanPham = lazy(
  () => import('../features/admin/catalog/products/pages/DanhSachSanPham')
);
const ThemSanPham = lazy(() => import('../features/admin/catalog/products/pages/ThemSanPham'));
const ChiTietSanPham = lazy(
  () => import('../features/admin/catalog/products/pages/ChiTietSanPham')
);
const DanhSachKhuyenMai = lazy(
  () => import('../features/admin/promotions/pages/DanhSachKhuyenMai')
);
const TaoKhuyenMai = lazy(() => import('../features/admin/promotions/pages/TaoKhuyenMai'));
const ChiTietKhuyenMai = lazy(() => import('../features/admin/promotions/pages/ChiTietKhuyenMai'));
const BanHang = lazy(() => import('../features/admin/sales/pages/BanHang'));
const TongQuat = lazy(() => import('../features/admin/overview/pages/TongQuat'));
const TongQuanQuy = lazy(() => import('../features/admin/cashbook/pages/TongQuanQuy'));
const SoQuy = lazy(() => import('../features/admin/cashbook/pages/SoQuy'));
const DanhSachPhieuThu = lazy(() => import('../features/admin/cashbook/pages/DanhSachPhieuThu'));
const TaoPhieuThu = lazy(() => import('../features/admin/cashbook/pages/TaoPhieuThu'));
const DanhSachLoaiPhieuThu = lazy(
  () => import('../features/admin/cashbook/pages/DanhSachLoaiPhieuThu')
);
const ChiTietLoaiPhieuThu = lazy(
  () => import('../features/admin/cashbook/pages/ChiTietLoaiPhieuThu')
);
const DanhSachPhieuChi = lazy(() => import('../features/admin/cashbook/pages/DanhSachPhieuChi'));
const TaoPhieuChi = lazy(() => import('../features/admin/cashbook/pages/TaoPhieuChi'));
const TaoPhieuThuChi = lazy(() => import('../features/admin/cashbook/pages/TaoPhieuThuChi'));
const DanhSachLoaiPhieuChi = lazy(
  () => import('../features/admin/cashbook/pages/DanhSachLoaiPhieuChi')
);
const ChiTietLoaiPhieuChi = lazy(
  () => import('../features/admin/cashbook/pages/ChiTietLoaiPhieuChi')
);
const ChiTietPhieuThu = lazy(() => import('../features/admin/cashbook/pages/ChiTietPhieuThu'));
const ChiTietPhieuChi = lazy(() => import('../features/admin/cashbook/pages/ChiTietPhieuChi'));
const PlaceholderPage = lazy(() => import('../features/admin/shared/pages/PlaceholderPage'));
const MockDanhSachBaoHanh = lazy(() => import('../features/admin/warranty/pages/DanhSachBaoHanh'));
const MockLapPhieuBaoHanh = lazy(() => import('../features/admin/warranty/pages/LapPhieuBaoHanh'));
const MockChiTietBaoHanh = lazy(() => import('../features/admin/warranty/pages/ChiTietBaoHanh'));
const QuanLyPhienBan = lazy(
  () => import('../features/admin/catalog/products/pages/QuanLyPhienBan')
);
const ChiTietTonKho = lazy(() => import('../features/admin/inventory/pages/ChiTietTonKho'));
const DanhSachSerial = lazy(() => import('../features/admin/inventory/pages/DanhSachSerial'));
const ChiTietSerial = lazy(() => import('../features/admin/inventory/pages/ChiTietSerial'));
const ThuHoiHang = lazy(() => import('../features/admin/inventory/recall/ThuHoiHang'));
const ComboSanPham = lazy(() => import('../features/admin/catalog/combos/pages/ComboSanPham'));
const ThemComboSanPham = lazy(
  () => import('../features/admin/catalog/combos/pages/ThemComboSanPham')
);
const ChiTietCombo = lazy(() => import('../features/admin/catalog/combos/pages/ChiTietCombo'));
const DanhSachNhapHang = lazy(() => import('../features/admin/purchasing/pages/DanhSachNhapHang'));
const TaoDonNhapHang = lazy(() => import('../features/admin/purchasing/pages/TaoDonNhapHang'));
const ChiTietNhapHang = lazy(() => import('../features/admin/purchasing/pages/ChiTietNhapHang'));
const KiemHang = lazy(() => import('../features/admin/inventory/pages/KiemHang'));
const TaoPhieuKiemHang = lazy(() => import('../features/admin/inventory/pages/TaoPhieuKiemHang'));
const ChiTietPhieuKiemHang = lazy(
  () => import('../features/admin/inventory/pages/ChiTietPhieuKiemHang')
);
const DanhSachKhachHang = lazy(() => import('../features/admin/customers/pages/DanhSachKhachHang'));
const ChiTietKhachHang = lazy(() => import('../features/admin/customers/pages/ChiTietKhachHang'));
const ChiTietDonHang = lazy(() => import('../features/admin/orders/pages/ChiTietDonHang'));
const NhaCungCap = lazy(() => import('../features/admin/purchasing/pages/NhaCungCap'));
const DoiTacVanChuyen = lazy(() => import('../features/admin/shipping/pages/DoiTacVanChuyen'));
const VaiTro = lazy(() => import('../features/admin/organization/pages/VaiTro'));
const AccountPage = lazy(() => import('../settings/AccountPage'));
const DanhSachNhanVien = lazy(() =>
  import('../features/admin/organization/pages/NhanVien').then((module) => ({
    default: module.DanhSachNhanVien,
  }))
);
const ChiTietNhanVien = lazy(() =>
  import('../features/admin/organization/pages/NhanVien').then((module) => ({
    default: module.ChiTietNhanVien,
  }))
);
const DanhMucSanPham = lazy(
  () => import('../features/admin/catalog/categories/pages/DanhMucSanPham')
);
const ChiTietDanhMuc = lazy(() =>
  import('../features/admin/catalog/categories/pages/DanhMucSanPham').then((module) => ({
    default: module.ChiTietDanhMuc,
  }))
);
const ThuongHieu = lazy(() => import('../features/admin/catalog/brands/pages/ThuongHieu'));
const ChiTietThuongHieu = lazy(() =>
  import('../features/admin/catalog/brands/pages/ThuongHieu').then((module) => ({
    default: module.ChiTietThuongHieu,
  }))
);

export default function AdminApp() {
  const { currentAccount } = useMockAuth();

  return (
    <AdminPermissionsProvider account={currentAccount}>
      <AdminShell />
    </AdminPermissionsProvider>
  );
}

function AdminShell() {
  const { search } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const fontPreference = useQaTypography();

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) {
      setMobileSidebarOpen((current) => !current);
      return;
    }
    setSidebarCollapsed((current) => !current);
  };

  return (
    <FontPreferenceContext.Provider value={fontPreference}>
      <CustomerProvider>
        <OrderProvider>
          <CashbookProvider>
            <div
              className="app-layout admin-app"
              style={{
                '--font-family-admin': fontPreference.font.family,
                '--font-family-base': fontPreference.font.family,
                '--project-font-family': fontPreference.font.family,
                '--project-font-scale': fontPreference.fontSize / 14,
              }}
            >
              <Sidebar
                collapsed={sidebarCollapsed}
                mobileOpen={mobileSidebarOpen}
                onToggle={toggleSidebar}
                onNavigate={() => setMobileSidebarOpen(false)}
              />
              {mobileSidebarOpen && (
                <button
                  type="button"
                  className="sidebar-backdrop"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Đóng menu điều hướng"
                />
              )}
              <div className="app-layout__main">
                <Header onMenuToggle={toggleSidebar} isMenuOpen={mobileSidebarOpen} />
                <PermissionGate>
                  <Suspense fallback={<p role="status">Đang tải trang quản trị…</p>}>
                    <Routes>
                      <Route path="/admin/tai-khoan" element={<AccountPage />} />
                      {/* Default redirect */}
                      <Route
                        path="/"
                        element={<Navigate to="/admin/don-hang/danh-sach-don-hang" replace />}
                      />

                      {/* Non-expandable top-level pages */}
                      <Route path="/admin/tong-quat" element={<TongQuat />} />
                      <Route path="/admin/ban-hang" element={<BanHang />} />

                      {/* Sản phẩm section */}
                      <Route
                        path="/admin/san-pham"
                        element={<Navigate to="/admin/san-pham/danh-sach-san-pham" replace />}
                      />
                      <Route
                        path="/admin/san-pham/danh-sach-san-pham"
                        element={<DanhSachSanPham />}
                      />
                      <Route path="/admin/san-pham/them-san-pham" element={<ThemSanPham />} />
                      <Route
                        path="/admin/san-pham/them-san-pham/:productId"
                        element={<ThemSanPham />}
                      />
                      <Route
                        path="/admin/san-pham/chi-tiet-san-pham/:productId"
                        element={<ChiTietSanPham />}
                      />
                      <Route
                        path="/kho-hang/quan-ly-phien-ban"
                        element={<QuanLyPhienBan key={search} />}
                      />
                      <Route
                        path="/kho-hang/quan-ly-phien-ban/chi-tiet/:id"
                        element={<ChiTietTonKho />}
                      />
                      <Route path="/kho-hang/danh-sach-serial" element={<DanhSachSerial />} />

                      <Route
                        path="/kho-hang/danh-sach-serial/:serialId"
                        element={<ChiTietSerial />}
                      />

                      <Route path="/kho-hang/thu-hoi" element={<ThuHoiHang />} />
                      <Route path="/kho-hang/thu-hoi/:recallId" element={<ThuHoiHang />} />

                      <Route path="/kho-hang/combo-san-pham" element={<ComboSanPham />} />

                      <Route
                        path="/kho-hang/combo-san-pham/them-moi"
                        element={<ThemComboSanPham />}
                      />
                      <Route
                        path="/kho-hang/combo-san-pham/chi-tiet/:id"
                        element={<ChiTietCombo />}
                      />
                      <Route path="/kho-hang/nhap-hang" element={<DanhSachNhapHang />} />
                      <Route path="/kho-hang/nhap-hang/tao-moi" element={<TaoDonNhapHang />} />
                      <Route path="/kho-hang/nhap-hang/:id" element={<ChiTietNhapHang />} />
                      <Route path="/kho-hang/kiem-hang" element={<KiemHang />} />
                      <Route path="/kho-hang/kiem-hang/tao-moi" element={<TaoPhieuKiemHang />} />
                      <Route
                        path="/kho-hang/kiem-hang/:id/chinh-sua"
                        element={<TaoPhieuKiemHang />}
                      />
                      <Route path="/kho-hang/kiem-hang/:id" element={<ChiTietPhieuKiemHang />} />
                      <Route
                        path="/admin/san-pham/toan-bo-phien-ban"
                        element={<Navigate to="/kho-hang/quan-ly-phien-ban" replace />}
                      />
                      <Route
                        path="/admin/san-pham/danh-sach-serial"
                        element={<Navigate to="/kho-hang/danh-sach-serial" replace />}
                      />
                      <Route
                        path="/admin/san-pham/combo-san-pham"
                        element={<Navigate to="/kho-hang/combo-san-pham" replace />}
                      />
                      <Route
                        path="/admin/san-pham/nhap-hang"
                        element={<Navigate to="/kho-hang/nhap-hang" replace />}
                      />
                      <Route
                        path="/admin/san-pham/kiem-hang"
                        element={<Navigate to="/kho-hang/kiem-hang" replace />}
                      />
                      <Route
                        path="/admin/khach-hang-doi-tac"
                        element={<Navigate to="/admin/khach-hang-doi-tac/khach-hang" replace />}
                      />
                      <Route
                        path="/admin/khach-hang-doi-tac/khach-hang"
                        element={<DanhSachKhachHang />}
                      />
                      <Route
                        path="/admin/khach-hang-doi-tac/khach-hang/:customerId"
                        element={<ChiTietKhachHang />}
                      />
                      <Route
                        path="/admin/khach-hang-doi-tac/nha-cung-cap"
                        element={<NhaCungCap />}
                      />
                      <Route
                        path="/admin/khach-hang-doi-tac/doi-tac-van-chuyen"
                        element={<DoiTacVanChuyen />}
                      />
                      <Route
                        path="/admin/nhan-vien"
                        element={<Navigate to="/admin/nhan-vien/danh-sach" replace />}
                      />
                      <Route path="/admin/nhan-vien/danh-sach" element={<DanhSachNhanVien />} />
                      <Route path="/admin/nhan-vien/vai-tro" element={<VaiTro />} />
                      <Route path="/admin/nhan-vien/:accountId" element={<ChiTietNhanVien />} />
                      <Route
                        path="/admin/khuyen-mai"
                        element={<Navigate to="/admin/khuyen-mai/danh-sach-khuyen-mai" replace />}
                      />
                      <Route
                        path="/admin/khuyen-mai/danh-sach-khuyen-mai"
                        element={<DanhSachKhuyenMai />}
                      />
                      <Route
                        path="/admin/khuyen-mai/chi-tiet-khuyen-mai/:id"
                        element={<ChiTietKhuyenMai />}
                      />
                      <Route path="/admin/khuyen-mai/tao-khuyen-mai" element={<TaoKhuyenMai />} />
                      <Route
                        path="/admin/khuyen-mai/tao-moi"
                        element={<Navigate to="/admin/khuyen-mai/tao-khuyen-mai" replace />}
                      />

                      <Route
                        path="/admin/so-quy-tien-mat"
                        element={<Navigate to="/admin/so-quy-tien-mat/tong-quan" replace />}
                      />
                      <Route path="/admin/so-quy-tien-mat/tong-quan" element={<TongQuanQuy />} />
                      <Route
                        path="/admin/so-quy-tien-mat/so-quy"
                        element={<SoQuy key={search} />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/tao-phieu-thu-chi"
                        element={<TaoPhieuThuChi />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/phieu-thu"
                        element={<DanhSachPhieuThu />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/phieu-thu/:id"
                        element={<ChiTietPhieuThu />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/tao-phieu-thu"
                        element={<TaoPhieuThu />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/loai-phieu-thu"
                        element={<DanhSachLoaiPhieuThu />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/loai-phieu-thu/:id"
                        element={<ChiTietLoaiPhieuThu />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/phieu-chi"
                        element={<DanhSachPhieuChi />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/phieu-chi/:id"
                        element={<ChiTietPhieuChi />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/tao-phieu-chi"
                        element={<TaoPhieuChi />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/loai-phieu-chi"
                        element={<DanhSachLoaiPhieuChi />}
                      />
                      <Route
                        path="/admin/so-quy-tien-mat/loai-phieu-chi/:id"
                        element={<ChiTietLoaiPhieuChi />}
                      />

                      <Route
                        path="/admin/so-quy-tien-mat/:placeholder"
                        element={<PlaceholderPage title="Tính năng đang phát triển" />}
                      />

                      <Route path="/admin/bao-cao" element={<PlaceholderPage title="Báo cáo" />} />
                      <Route
                        path="/admin/bao-hanh/danh-sach"
                        element={<MockDanhSachBaoHanh key={search} />}
                      />
                      <Route path="/admin/bao-hanh/chi-tiet/:id" element={<MockChiTietBaoHanh />} />
                      <Route path="/admin/bao-hanh/tao-moi" element={<MockLapPhieuBaoHanh />} />

                      <Route
                        path="/admin/bao-hanh"
                        element={<MockDanhSachBaoHanh key={search} />}
                      />
                      <Route path="/admin/bao-hanh/lap-phieu" element={<MockLapPhieuBaoHanh />} />
                      <Route path="/admin/bao-hanh/:id" element={<MockChiTietBaoHanh />} />
                      <Route
                        path="/admin/danh-muc"
                        element={<Navigate to="/admin/danh-muc/danh-muc-san-pham" replace />}
                      />
                      <Route
                        path="/admin/danh-muc/tags"
                        element={<PlaceholderPage title="Tags" />}
                      />
                      <Route
                        path="/admin/danh-muc/danh-muc-san-pham"
                        element={<DanhMucSanPham />}
                      />
                      <Route
                        path="/admin/danh-muc/danh-muc-san-pham/:categoryId"
                        element={<ChiTietDanhMuc />}
                      />
                      <Route path="/admin/danh-muc/thuong-hieu" element={<ThuongHieu />} />
                      <Route
                        path="/admin/danh-muc/thuong-hieu/:brandId"
                        element={<ChiTietThuongHieu />}
                      />

                      {/* Đơn hàng section — shared layout with 4 tabs */}
                      <Route path="/admin/don-hang" element={<OrderLayout />}>
                        <Route index element={<Navigate to="danh-sach-don-hang" replace />} />
                        <Route
                          path="danh-sach-don-hang"
                          element={<DanhSachDonHang key={search} />}
                        />
                        <Route path="danh-sach-don-hang/:orderId" element={<ChiTietDonHang />} />
                        <Route path="cho-hang-can-xu-ly" element={<DonChoHangCanXuLy />} />
                        <Route path="dat-hang-online" element={<DatHangOnline />} />
                        <Route path="dat-hang-online/:orderId" element={<DatHangOnline />} />
                        <Route path="quan-ly-giao-hang" element={<QuanLyGiaoHang key={search} />} />
                        <Route path="quan-ly-giao-hang/:deliveryId" element={<QuanLyGiaoHang />} />
                        <Route path="khach-tra-hang" element={<KhachTraHang key={search} />} />
                        <Route path="khach-tra-hang/tao" element={<KhachTraHang />} />
                        <Route path="khach-tra-hang/tao/:orderId" element={<KhachTraHang />} />
                        <Route path="khach-tra-hang/:returnId" element={<KhachTraHang />} />
                      </Route>

                      {/* Catch-all fallback */}
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                  </Suspense>
                </PermissionGate>
              </div>
            </div>
          </CashbookProvider>
        </OrderProvider>
      </CustomerProvider>
    </FontPreferenceContext.Provider>
  );
}
