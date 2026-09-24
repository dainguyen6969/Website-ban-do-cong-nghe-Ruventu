// Admin application routes and shell composition.
import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../shared/components/layout/Sidebar';
import Header from '../shared/components/layout/Header';
import OrderLayout from '../features/admin/orders/components/OrderLayout';
import DanhSachDonHang from '../features/admin/orders/pages/DanhSachDonHang';
import DatHangOnline from '../features/admin/orders/pages/DatHangOnline';
import QuanLyGiaoHang from '../features/admin/shipping/pages/QuanLyGiaoHang';
import KhachTraHang from '../features/admin/customers/pages/KhachTraHang';
import DanhSachSanPham from '../features/admin/catalog/products/pages/DanhSachSanPham';
import ThemSanPham from '../features/admin/catalog/products/pages/ThemSanPham';
import ChiTietSanPham from '../features/admin/catalog/products/pages/ChiTietSanPham';
import TaoKhuyenMai from '../features/admin/promotions/pages/TaoKhuyenMai';
import BanHang from '../features/admin/sales/pages/BanHang';
import PlaceholderPage from '../features/admin/shared/pages/PlaceholderPage';
import QuanLyPhienBan from '../features/admin/catalog/products/pages/QuanLyPhienBan';
import ChiTietTonKho from '../features/admin/inventory/pages/ChiTietTonKho';
import DanhSachSerial from '../features/admin/inventory/pages/DanhSachSerial';
import ChiTietSerial from '../features/admin/inventory/pages/ChiTietSerial';
import ComboSanPham from '../features/admin/catalog/combos/pages/ComboSanPham';
import ThemComboSanPham from '../features/admin/catalog/combos/pages/ThemComboSanPham';
import ChiTietCombo from '../features/admin/catalog/combos/pages/ChiTietCombo';
import DanhSachNhapHang from '../features/admin/purchasing/pages/DanhSachNhapHang';
import TaoDonNhapHang from '../features/admin/purchasing/pages/TaoDonNhapHang';
import ChiTietNhapHang from '../features/admin/purchasing/pages/ChiTietNhapHang';
import KiemHang from '../features/admin/inventory/pages/KiemHang';
import TaoPhieuKiemHang from '../features/admin/inventory/pages/TaoPhieuKiemHang';
import ChiTietPhieuKiemHang from '../features/admin/inventory/pages/ChiTietPhieuKiemHang';
import DanhSachKhachHang from '../features/admin/customers/pages/DanhSachKhachHang';
import ChiTietKhachHang from '../features/admin/customers/pages/ChiTietKhachHang';
import ChiTietDonHang from '../features/admin/orders/pages/ChiTietDonHang';
import NhaCungCap from '../features/admin/purchasing/pages/NhaCungCap';
import DoiTacVanChuyen from '../features/admin/shipping/pages/DoiTacVanChuyen';
import { DanhSachNhanVien, ChiTietNhanVien } from '../features/admin/organization/pages/NhanVien';
import VaiTro from '../features/admin/organization/pages/VaiTro';
import DanhMucSanPham, { ChiTietDanhMuc } from '../features/admin/catalog/categories/pages/DanhMucSanPham';
import ThuongHieu, { ChiTietThuongHieu } from '../features/admin/catalog/brands/pages/ThuongHieu';
import PermissionGate from '../shared/components/ui/PermissionGate';
import CustomerProvider from '../context/CustomerProvider';
import OrderProvider from '../context/OrderProvider';
import { ADMIN_FONT_STORAGE_KEY } from '../typography/fontOptions';
import FontPreferenceContext from '../typography/FontPreferenceContext';
import usePersistentFontPreference from '../typography/usePersistentFontPreference';
import '../styles/index.css';
import './App.css';
import '../styles/responsive.css';

export default function AdminApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const fontPreference = usePersistentFontPreference(ADMIN_FONT_STORAGE_KEY);

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
        <div className="app-layout admin-app" style={{ '--font-family-admin': fontPreference.font.family }}>
        <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} onToggle={toggleSidebar} onNavigate={() => setMobileSidebarOpen(false)} />
        {mobileSidebarOpen && <button type="button" className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} aria-label="Đóng menu điều hướng" />}
        <div className="app-layout__main">
          <Header onMenuToggle={toggleSidebar} isMenuOpen={mobileSidebarOpen} />
          <PermissionGate><Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/admin/don-hang/danh-sach-don-hang" replace />} />

          {/* Non-expandable top-level pages */}
          <Route path="/admin/tong-quat" element={<PlaceholderPage title="Tổng quát" />} />
          <Route path="/admin/ban-hang" element={<BanHang />} />

          {/* Sản phẩm section */}
          <Route path="/admin/san-pham" element={<Navigate to="/admin/san-pham/danh-sach-san-pham" replace />} />
          <Route path="/admin/san-pham/danh-sach-san-pham" element={<DanhSachSanPham />} />
          <Route path="/admin/san-pham/them-san-pham" element={<ThemSanPham />} />
          <Route path="/admin/san-pham/them-san-pham/:productId" element={<ThemSanPham />} />
          <Route path="/admin/san-pham/chi-tiet-san-pham/:productId" element={<ChiTietSanPham />} />
          <Route path="/kho-hang/quan-ly-phien-ban" element={<QuanLyPhienBan />} />
          <Route path="/kho-hang/quan-ly-phien-ban/chi-tiet/:id" element={<ChiTietTonKho />} />
          <Route path="/kho-hang/danh-sach-serial" element={<DanhSachSerial />} />
          <Route path="/kho-hang/danh-sach-serial/:serialId" element={<ChiTietSerial />} />
          <Route path="/kho-hang/combo-san-pham" element={<ComboSanPham />} />
          <Route path="/kho-hang/combo-san-pham/them-moi" element={<ThemComboSanPham />} />
          <Route path="/kho-hang/combo-san-pham/chi-tiet/:id" element={<ChiTietCombo />} />
          <Route path="/kho-hang/nhap-hang" element={<DanhSachNhapHang />} />
          <Route path="/kho-hang/nhap-hang/tao-moi" element={<TaoDonNhapHang />} />
          <Route path="/kho-hang/nhap-hang/:id" element={<ChiTietNhapHang />} />
          <Route path="/kho-hang/kiem-hang" element={<KiemHang />} />
          <Route path="/kho-hang/kiem-hang/tao-moi" element={<TaoPhieuKiemHang />} />
          <Route path="/kho-hang/kiem-hang/:id/chinh-sua" element={<TaoPhieuKiemHang />} />
          <Route path="/kho-hang/kiem-hang/:id" element={<ChiTietPhieuKiemHang />} />
          <Route path="/admin/san-pham/toan-bo-phien-ban" element={<Navigate to="/kho-hang/quan-ly-phien-ban" replace />} />
          <Route path="/admin/san-pham/danh-sach-serial" element={<Navigate to="/kho-hang/danh-sach-serial" replace />} />
          <Route path="/admin/san-pham/combo-san-pham" element={<Navigate to="/kho-hang/combo-san-pham" replace />} />
          <Route path="/admin/san-pham/nhap-hang" element={<Navigate to="/kho-hang/nhap-hang" replace />} />
          <Route path="/admin/san-pham/kiem-hang" element={<Navigate to="/kho-hang/kiem-hang" replace />} />
          <Route path="/admin/khach-hang-doi-tac" element={<Navigate to="/admin/khach-hang-doi-tac/khach-hang" replace />} />
          <Route path="/admin/khach-hang-doi-tac/khach-hang" element={<DanhSachKhachHang />} />
          <Route path="/admin/khach-hang-doi-tac/khach-hang/:customerId" element={<ChiTietKhachHang />} />
          <Route path="/admin/khach-hang-doi-tac/nha-cung-cap" element={<NhaCungCap />} />
          <Route path="/admin/khach-hang-doi-tac/doi-tac-van-chuyen" element={<DoiTacVanChuyen />} />
          <Route path="/admin/nhan-vien" element={<Navigate to="/admin/nhan-vien/danh-sach" replace />} />
          <Route path="/admin/nhan-vien/danh-sach" element={<DanhSachNhanVien />} />
          <Route path="/admin/nhan-vien/vai-tro" element={<VaiTro />} />
          <Route path="/admin/nhan-vien/:accountId" element={<ChiTietNhanVien />} />
          <Route path="/admin/khuyen-mai" element={<Navigate to="/admin/khuyen-mai/danh-sach-khuyen-mai" replace />} />
          <Route path="/admin/khuyen-mai/danh-sach-khuyen-mai" element={<PlaceholderPage title="Danh sách khuyến mại" />} />
          <Route path="/admin/khuyen-mai/tao-khuyen-mai" element={<TaoKhuyenMai />} />
          <Route path="/admin/so-quy-tien-mat" element={<PlaceholderPage title="Sổ quỹ tiền mặt" />} />
          <Route path="/admin/bao-cao" element={<PlaceholderPage title="Báo cáo" />} />
          <Route path="/admin/bao-hanh" element={<PlaceholderPage title="Bảo hành" />} />
          <Route path="/admin/danh-muc" element={<Navigate to="/admin/danh-muc/danh-muc-san-pham" replace />} />
          <Route path="/admin/danh-muc/tags" element={<PlaceholderPage title="Tags" />} />
          <Route path="/admin/danh-muc/danh-muc-san-pham" element={<DanhMucSanPham />} />
          <Route path="/admin/danh-muc/danh-muc-san-pham/:categoryId" element={<ChiTietDanhMuc />} />
          <Route path="/admin/danh-muc/thuong-hieu" element={<ThuongHieu />} />
          <Route path="/admin/danh-muc/thuong-hieu/:brandId" element={<ChiTietThuongHieu />} />

          {/* Đơn hàng section — shared layout with 4 tabs */}
          <Route path="/admin/don-hang" element={<OrderLayout />}>
            <Route index element={<Navigate to="danh-sach-don-hang" replace />} />
            <Route path="danh-sach-don-hang" element={<DanhSachDonHang />} />
            <Route path="danh-sach-don-hang/:orderId" element={<ChiTietDonHang />} />
            <Route path="dat-hang-online" element={<DatHangOnline />} />
            <Route path="quan-ly-giao-hang" element={<QuanLyGiaoHang />} />
            <Route path="quan-ly-giao-hang/:deliveryId" element={<QuanLyGiaoHang />} />
            <Route path="khach-tra-hang" element={<KhachTraHang />} />
            <Route path="khach-tra-hang/tao/:orderId" element={<KhachTraHang />} />
            <Route path="khach-tra-hang/:returnId" element={<KhachTraHang />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/admin/don-hang/danh-sach-don-hang" replace />} />
          </Routes></PermissionGate>
        </div>
        </div>
        </OrderProvider>
      </CustomerProvider>
    </FontPreferenceContext.Provider>
  );
}
