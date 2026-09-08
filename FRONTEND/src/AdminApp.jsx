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
import PlaceholderPage from './pages/PlaceholderPage';
import './index.css';
import './App.css';

export default function AdminApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="app-layout__main">
        <Header />
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/admin/don-hang/danh-sach-don-hang" replace />} />

          {/* Non-expandable top-level pages */}
          <Route path="/admin/tong-quat" element={<PlaceholderPage title="Tổng quát" />} />
          <Route path="/admin/ban-hang" element={<PlaceholderPage title="Bán hàng" />} />

          {/* Sản phẩm section */}
          <Route path="/admin/san-pham" element={<Navigate to="/admin/san-pham/danh-sach-san-pham" replace />} />
          <Route path="/admin/san-pham/danh-sach-san-pham" element={<DanhSachSanPham />} />
          <Route path="/admin/san-pham/them-san-pham" element={<ThemSanPham />} />
          <Route path="/admin/san-pham/them-san-pham/:productId" element={<ThemSanPham />} />
          <Route path="/admin/san-pham/chi-tiet-san-pham/:productId" element={<ChiTietSanPham />} />
          <Route path="/admin/san-pham/quan-ly-kho" element={<PlaceholderPage title="Quản lý kho" />} />
          <Route path="/admin/san-pham/toan-bo-phien-ban" element={<PlaceholderPage title="Toàn bộ phiên bản" />} />
          <Route path="/admin/san-pham/danh-sach-serial" element={<PlaceholderPage title="Danh sách Serial" />} />
          <Route path="/admin/san-pham/combo-san-pham" element={<PlaceholderPage title="Combo sản phẩm" />} />
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
