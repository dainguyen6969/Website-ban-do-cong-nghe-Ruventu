// Manual check in Vite: pagination, page-size requests and filter reset; no real API calls.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import OrderLayout from '../src/features/admin/orders/components/OrderLayout';
import DanhSachDonHang from '../src/features/admin/orders/pages/DanhSachDonHang';
import DanhSachSanPham from '../src/features/admin/catalog/products/pages/DanhSachSanPham';
import DoiTacVanChuyen from '../src/features/admin/shipping/pages/DoiTacVanChuyen';
import ComboSanPham from '../src/features/admin/catalog/combos/pages/ComboSanPham';
import ThuongHieu from '../src/features/admin/catalog/brands/pages/ThuongHieu';
import '../src/styles/index.css';
import '../src/styles/responsive.css';
import '../src/styles/adminTables.css';

// In-memory fixture identity only; every request below is mocked, no stored session changes.
Object.defineProperty(window, 'localStorage', { value: { getItem: (key) => key === 'accessToken' ? 'pagination-fixture' : null } });
let pageClickedAt = 0;
document.addEventListener('click', (event) => {
  if (event.target.closest('nav[aria-label="Phân trang"]')) pageClickedAt = performance.now();
}, true);
window.fetch = async (url, options) => {
  const request = new URL(url, location.origin);
  if (request.pathname.endsWith('/realtime-ticket')) {
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  }
  if (!['/api/v1/admin/orders', '/api/v1/admin/products', '/api/v1/admin/shipping-partners', '/api/v1/admin/brands', '/api/v1/admin/combos'].includes(request.pathname)) {
    return new Response(JSON.stringify({ data: { items: [], pagination: { total_pages: 1 } } }), { status: 200 });
  }
  const page = Number(request.searchParams.get('page'));
  document.getElementById('pagination-request-log').textContent = `Yêu cầu trang ${page + 1} · Sau nhấn: ${(performance.now() - pageClickedAt).toFixed(0)} ms`;
  const delay = Number(new URLSearchParams(location.search).get('delay')) || 0;
  // Deliberately ignore AbortSignal to check that obsolete responses cannot overwrite the latest page.
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, page === 1 ? delay * 3 : delay));
  const limit = Number(request.searchParams.get('limit'));
  const total = request.searchParams.get('keyword') ? 3 : request.pathname.endsWith('/brands') ? 26 : request.pathname.endsWith('/combos') ? ({1:18,0:6}[request.searchParams.get('trang_thai')] ?? 24) : 240;
  const realistic = new URLSearchParams(location.search).has('realistic');
  const items = Array.from({ length: Math.max(0, Math.min(limit, total - page * limit)) }, (_, index) => ({
    id: page * limit + index + 1,
    ma_don_hang: realistic ? `ORD-00000000-0000-0000-0000-${String(page * limit + index + 1).padStart(12, '0')}` : `MAU-${String(page * limit + index + 1).padStart(3, '0')}`,
    ten_khach_hang: realistic ? 'Khách kiểm thử bảo hành 061026' : 'Khách hàng mẫu',
    ngay_tao: '2026-10-27T09:00:00',
    loai_don_hang: 'ONLINE',
    trang_thai_don_hang: 'CHO_DUYET',
    trang_thai_thanh_toan: 'CHUA_THANH_TOAN',
    trang_thai_dong_goi: 'CHUA_DONG_GOI',
    trang_thai_xuat_kho: 'CHUA_XUAT_KHO',
    tong_thanh_toan: realistic ? 347619000 : 1000000,
    phieu_giao_hang_gan_nhat_id: realistic ? 1 : null,
    ma_san_pham: `SP-MAU-${page * limit + index + 1}`,
    ten_san_pham: `Sản phẩm mẫu ${page * limit + index + 1}`,
    loai_san_pham: 'LINH_KIEN',
    trang_thai: 1,
    ma_doi_tac: `DT-MAU-${page * limit + index + 1}`,
    ten_doi_tac: `Đối tác mẫu ${page * limit + index + 1}`,
    loai_doi_tac: 'DON_VI_VAN_CHUYEN',
    ten_thuong_hieu: `Thương hiệu mẫu ${page * limit + index + 1}`,
    duong_dan_url: `thuong-hieu-${page * limit + index + 1}`,
    so_luong_san_pham: 20,
    gia_ban: 90940000,
    so_bo_co_the_lap: 8,
    thanh_phan: Array.from({length:7}, (_, part) => ({
      phien_ban_id:part + 1,
      ten_san_pham:`RAM Corsair Vengeance RGB 64GB (2x32GB) DDR5 6000MHz / ${'Thành phần cấu hình tên dài '.repeat(4)}`,
      ten_phien_ban:'64GB (2x32GB) DDR5 RGB Platinum White / Phiên bản cấu hình tên dài',
      ma_vach:`RV26-V000${part + 1}`,
      so_luong:1,
    })),
  }));
  return new Response(JSON.stringify({ data: { items, pagination: { total_elements: total, total_pages: Math.ceil(total / limit), page } } }), { status: 200 });
};

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <div className="admin-app" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', paddingLeft: new URLSearchParams(location.search).has('sidebar') ? 260 : 0 }}>
      <p style={{ padding: '12px 28px', borderBottom: '2px solid #111' }}>KIỂM TRA PHÂN TRANG · DỮ LIỆU MẪU · KHÔNG KẾT NỐI ĐƠN HÀNG THẬT</p>
      <output id="pagination-request-log" style={{ padding: '0 28px' }} />
      <Routes>
        <Route path="/admin/don-hang" element={<OrderLayout />}>
          <Route path="danh-sach-don-hang" element={<DanhSachDonHang />} />
        </Route>
        <Route path="/preview/products" element={<DanhSachSanPham />} />
        <Route path="/preview/partners" element={<DoiTacVanChuyen />} />
        <Route path="/preview/combos" element={<ComboSanPham />} />
        <Route path="/preview/brands" element={<ThuongHieu />} />
        <Route path="*" element={<Navigate to={{products:'/preview/products',partners:'/preview/partners',combos:'/preview/combos',brands:'/preview/brands'}[new URLSearchParams(location.search).get('screen')] || '/admin/don-hang/danh-sach-don-hang'} replace />} />
      </Routes>
    </div>
  </HashRouter>
);
