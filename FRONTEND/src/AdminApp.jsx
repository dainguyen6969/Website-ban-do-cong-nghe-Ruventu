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
import BanHang from './pages/BanHang';
import PlaceholderPage from './pages/PlaceholderPage';
import QuanLyPhienBan from './pages/QuanLyPhienBan';
import ChiTietTonKho from './pages/ChiTietTonKho';
import DanhSachSerial from './pages/DanhSachSerial';
import ChiTietSerial from './pages/ChiTietSerial';
import ComboSanPham from './pages/ComboSanPham';
import ThemComboSanPham from './pages/ThemComboSanPham';
import ChiTietCombo from './pages/ChiTietCombo';
import './index.css';
import './App.css';

export default function AdminApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
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
          <Route path="/kho-hang/combo-san-pham/chi-tiet/:id" element={<ChiTietCombo />} />
          <Route path="/admin/san-pham/toan-bo-phien-ban" element={<Navigate to="/kho-hang/quan-ly-phien-ban" replace />} />
          <Route path="/admin/san-pham/danh-sach-serial" element={<Navigate to="/kho-hang/danh-sach-serial" replace />} />
          <Route path="/admin/san-pham/combo-san-pham" element={<Navigate to="/kho-hang/combo-san-pham" replace />} />
          <Route path="/admin/san-pham/nhap-hang" element={<PlaceholderPage title="Nhập hàng" />} />
          <Route path="/admin/san-pham/kiem-hang" element={<PlaceholderPage title="Kiểm hàng" />} />
          <Route path="/admin/khach-hang-doi-tac" element={<PlaceholderPage title="Khách hàng & Đối tác" />} />
          <Route path="/admin/nhan-vien" element={<PlaceholderPage title="Nhân viên" />} />
          <Route path="/admin/khuyen-mai" element={<Navigate to="/admin/khuyen-mai/danh-sach-khuyen-mai" replace />} />
          <Route path="/admin/khuyen-mai/danh-sach-khuyen-mai" element={<PlaceholderPage title="Danh sách khuyến mại" />} />
          <Route path="/admin/khuyen-mai/tao-khuyen-mai" element={<TaoKhuyenMai />} />
          <Route path="/admin/so-quy-tien-mat" element={<PlaceholderPage title="Sổ quỹ tiền mặt" />} />
          <Route path="/admin/bao-cao" element={<PlaceholderPage title="Báo cáo" />} />
          <Route path="/admin/bao-hanh" element={<PlaceholderPage title="Bảo hành" />} />
          <Route path="/admin/danh-muc" element={<PlaceholderPage title="Danh mục" />} />

          {/* Đơn hàng section — shared layout with 4 tabs */}
          <Route path="/admin/don-hang" element={<OrderLayout />}>
            <Route index element={<Navigate to="danh-sach-don-hang" replace />} />
            <Route path="danh-sach-don-hang" element={<DanhSachDonHang />} />
            <Route path="dat-hang-online" element={<DatHangOnline />} />
            <Route path="quan-ly-giao-hang" element={<QuanLyGiaoHang />} />
            <Route path="khach-tra-hang" element={<KhachTraHang />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/admin/don-hang/danh-sach-don-hang" replace />} />
        </Routes>
      </div>
    </div>
  );
}
