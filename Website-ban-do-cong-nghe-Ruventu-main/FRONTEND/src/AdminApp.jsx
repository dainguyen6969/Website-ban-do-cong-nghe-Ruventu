import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OrderLayout from './components/OrderLayout';
import DanhSachDonHang from './pages/DanhSachDonHang';
import DatHangOnline from './pages/DatHangOnline';
import QuanLyGiaoHang from './pages/QuanLyGiaoHang';
import KhachTraHang from './pages/KhachTraHang';
import DanhSachSanPham from './pages/DanhSachSanPham';
import ThemSanPham from './pages/ThemSanPham';
import ChiTietSanPham from './pages/ChiTietSanPham';
import TaoKhuyenMai from './pages/TaoKhuyenMai';
import DanhSachKhuyenMai from './pages/DanhSachKhuyenMai';
import ChiTietKhuyenMai from './pages/ChiTietKhuyenMai';
import BanHang from './pages/BanHang';
import TongQuanQuy from './pages/TongQuanQuy';
import PhieuThu from './pages/PhieuThu';
import ChiTietPhieuThu from './pages/ChiTietPhieuThu';
import TaoPhieuThu from './pages/TaoPhieuThu';
import TaoPhieuThuChi from './pages/TaoPhieuThuChi';
import LoaiPhieuThu from './pages/LoaiPhieuThu';
import ChiTietLoaiPhieuThu from './pages/ChiTietLoaiPhieuThu';
import LoaiPhieuChi from './pages/LoaiPhieuChi';
import ChiTietLoaiPhieuChi from './pages/ChiTietLoaiPhieuChi';
import PhieuChi from './pages/PhieuChi';
import ChiTietPhieuChi from './pages/ChiTietPhieuChi';
import TaoPhieuChi from './pages/TaoPhieuChi';
import SoQuy from './pages/SoQuy';
import PlaceholderPage from './pages/PlaceholderPage';
import QuanLyPhienBan from './pages/QuanLyPhienBan';
import ChiTietTonKho from './pages/ChiTietTonKho';
import DanhSachSerial from './pages/DanhSachSerial';
import ChiTietSerial from './pages/ChiTietSerial';
import ComboSanPham from './pages/ComboSanPham';
import ThemComboSanPham from './pages/ThemComboSanPham';
import ChiTietCombo from './pages/ChiTietCombo';
import DanhSachNhapHang from './pages/DanhSachNhapHang';
import TaoDonNhapHang from './pages/TaoDonNhapHang';
import ChiTietNhapHang from './pages/ChiTietNhapHang';
import KiemHang from './pages/KiemHang';
import TaoPhieuKiemHang from './pages/TaoPhieuKiemHang';
import ChiTietPhieuKiemHang from './pages/ChiTietPhieuKiemHang';
import DanhSachKhachHang from './pages/DanhSachKhachHang';
import ChiTietKhachHang from './pages/ChiTietKhachHang';
import ChiTietDonHang from './pages/ChiTietDonHang';
import CustomerProvider from './context/CustomerProvider';
import OrderProvider from './context/OrderProvider';
import './index.css';
import './App.css';

export default function AdminApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <CustomerProvider>
      <OrderProvider>
        <div className="app-layout admin-app">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="app-layout__main">
          <Header />
          <Routes>
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
          <Route path="/kho-hang/combo-san-pham/sua/:id" element={<ThemComboSanPham />} />
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
          <Route path="/admin/khach-hang-doi-tac/nha-cung-cap" element={<PlaceholderPage title="Nhà cung cấp" />} />
          <Route path="/admin/khach-hang-doi-tac/doi-tac-van-chuyen" element={<PlaceholderPage title="Đối tác vận chuyển" />} />
          <Route path="/admin/nhan-vien" element={<PlaceholderPage title="Nhân viên" />} />
          <Route path="/admin/khuyen-mai" element={<Navigate to="/admin/khuyen-mai/danh-sach-khuyen-mai" replace />} />
          <Route path="/admin/khuyen-mai/danh-sach-khuyen-mai" element={<DanhSachKhuyenMai />} />
          <Route path="/admin/khuyen-mai/chi-tiet/:id" element={<ChiTietKhuyenMai />} />
          <Route path="/admin/khuyen-mai/tao-khuyen-mai" element={<TaoKhuyenMai />} />
          <Route path="/admin/khuyen-mai/sua-khuyen-mai/:id" element={<TaoKhuyenMai />} />
          <Route path="/admin/so-quy-tien-mat" element={<Navigate to="/admin/so-quy-tien-mat/tong-quan" replace />} />
          <Route path="/admin/so-quy-tien-mat/tong-quan" element={<TongQuanQuy />} />
          <Route path="/admin/so-quy-tien-mat/phieu-thu" element={<PhieuThu />} />
          <Route path="/admin/so-quy-tien-mat/phieu-thu/tao-moi" element={<TaoPhieuThu />} />
          <Route path="/admin/so-quy-tien-mat/tao-phieu" element={<TaoPhieuThuChi />} />
          <Route path="/admin/so-quy-tien-mat/phieu-thu/chi-tiet/:id" element={<ChiTietPhieuThu />} />
          <Route path="/admin/so-quy-tien-mat/loai-phieu-thu" element={<LoaiPhieuThu />} />
          <Route path="/admin/so-quy-tien-mat/loai-phieu-thu/chi-tiet/:id" element={<ChiTietLoaiPhieuThu />} />
          <Route path="/admin/so-quy-tien-mat/phieu-chi" element={<PhieuChi />} />
          <Route path="/admin/so-quy-tien-mat/phieu-chi/tao-moi" element={<TaoPhieuChi />} />
          <Route path="/admin/so-quy-tien-mat/phieu-chi/chi-tiet/:id" element={<ChiTietPhieuChi />} />
          <Route path="/admin/so-quy-tien-mat/loai-phieu-chi" element={<LoaiPhieuChi />} />
          <Route path="/admin/so-quy-tien-mat/loai-phieu-chi/chi-tiet/:id" element={<ChiTietLoaiPhieuChi />} />
          <Route path="/admin/so-quy-tien-mat/so-quy" element={<SoQuy />} />
          <Route path="/admin/bao-cao" element={<PlaceholderPage title="Báo cáo" />} />
          <Route path="/admin/bao-hanh" element={<PlaceholderPage title="Bảo hành" />} />
          <Route path="/admin/danh-muc" element={<PlaceholderPage title="Danh mục" />} />

          {/* Đơn hàng section — shared layout with 4 tabs */}
          <Route path="/admin/don-hang" element={<OrderLayout />}>
            <Route index element={<Navigate to="danh-sach-don-hang" replace />} />
            <Route path="danh-sach-don-hang" element={<DanhSachDonHang />} />
            <Route path="danh-sach-don-hang/:orderId" element={<ChiTietDonHang />} />
            <Route path="dat-hang-online" element={<DatHangOnline />} />
            <Route path="quan-ly-giao-hang" element={<QuanLyGiaoHang />} />
            <Route path="khach-tra-hang" element={<KhachTraHang />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/admin/don-hang/danh-sach-don-hang" replace />} />
          </Routes>
        </div>
        </div>
      </OrderProvider>
    </CustomerProvider>
  );
}
