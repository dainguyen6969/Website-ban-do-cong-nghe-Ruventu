import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhieuChiList } from '../utils/phieuChiStore';
import './PhieuChi.css';

export default function PhieuChi() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TẤT CẢ TRẠNG THÁI');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [nhomFilter, setNhomFilter] = useState('TẤT CẢ NHÓM');
  const [phuongThucFilter, setPhuongThucFilter] = useState('TẤT CẢ PHƯƠNG THỨC');
  const [nguonFilter, setNguonFilter] = useState('TẤT CẢ NGUỒN');

  const list = getPhieuChiList();

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split(' ');
    if (parts.length === 0) return null;
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) return null;
    return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00`);
  };

  const filteredList = list.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = searchTerm === '' || 
           p.id.toLowerCase().includes(searchLower) || 
           p.nguoiNhan.toLowerCase().includes(searchLower) ||
           p.chungTu.toLowerCase().includes(searchLower);

    const matchStatus = statusFilter === 'TẤT CẢ TRẠNG THÁI' || p.trangThai === statusFilter;

    // Basic filters
    let matchDate = true;
    const pDate = parseDateString(p.ngayGhiNhan);
    if (pDate) {
      if (fromDate) {
        const fDate = new Date(fromDate);
        if (pDate < fDate) matchDate = false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (pDate > tDate) matchDate = false;
      }
    }

    // Advanced filters
    const matchNhom = !showAdvancedFilters || nhomFilter === 'TẤT CẢ NHÓM' || p.nhomDoiTuong === nhomFilter;
    const matchPhuongThuc = !showAdvancedFilters || phuongThucFilter === 'TẤT CẢ PHƯƠNG THỨC' || p.phuongThuc === phuongThucFilter;
    const matchNguon = !showAdvancedFilters || nguonFilter === 'TẤT CẢ NGUỒN' || p.nguonTao === nguonFilter;

    return matchSearch && matchStatus && matchDate && matchNhom && matchPhuongThuc && matchNguon;
  });

  return (
    <main className="phieu-chi-page">
      <div className="phieu-chi-header">
        <div className="phieu-chi-breadcrumb">SỔ QUỸ TIỀN MẶT / <strong>PHIẾU CHI</strong></div>
        <div className="phieu-chi-title-row">
          <div className="phieu-chi-title">
            <h1>PHIẾU CHI</h1>
            <p>QUẢN LÝ CÁC KHOẢN TIỀN ĐÃ CHI RA KHỎI QUỸ</p>
          </div>
          <button 
            className="phieu-chi-btn-create" 
            onClick={() => navigate('/admin/so-quy-tien-mat/phieu-chi/tao-moi')}
          >
            + TẠO PHIẾU CHI
          </button>
        </div>
      </div>

      <div className="phieu-chi-filters-container">
        <div className="phieu-chi-filters-basic">
          <input 
            type="text" 
            className="pc-search-input" 
            placeholder="TÌM MÃ PHIẾU / NGƯỜI NHẬN / CHỨNG TỪ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="pc-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>TẤT CẢ TRẠNG THÁI</option>
            <option>ĐÃ GHI NHẬN</option>
            <option>ĐÃ HỦY</option>
          </select>
          <div className="pc-date-group">
            <span className="pc-date-label">TỪ NGÀY</span>
            <input 
              type="date" 
              className="pc-date-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="pc-date-group">
            <span className="pc-date-label">ĐẾN NGÀY</span>
            <input 
              type="date" 
              className="pc-date-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button 
            className={`pc-btn-advanced-filter ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            BỘ LỌC NÂNG CAO {showAdvancedFilters ? '▲' : '▼'}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="phieu-chi-filters-advanced">
            <select 
              className="pc-select"
              value={nhomFilter}
              onChange={(e) => setNhomFilter(e.target.value)}
            >
              <option>TẤT CẢ NHÓM</option>
              <option>NHÂN VIÊN</option>
              <option>KHÁCH HÀNG</option>
              <option>NHÀ CUNG CẤP</option>
              <option>ĐỐI TÁC GIAO HÀNG</option>
            </select>
            <select 
              className="pc-select"
              value={phuongThucFilter}
              onChange={(e) => setPhuongThucFilter(e.target.value)}
            >
              <option>TẤT CẢ PHƯƠNG THỨC</option>
              <option>TIỀN MẶT</option>
              <option>CHUYỂN KHOẢN</option>
            </select>
            <select 
              className="pc-select"
              value={nguonFilter}
              onChange={(e) => setNguonFilter(e.target.value)}
            >
              <option>TẤT CẢ NGUỒN</option>
              <option>THỦ CÔNG</option>
              <option>TỰ ĐỘNG</option>
            </select>
          </div>
        )}
      </div>

      <div className="phieu-chi-table-container">
        <table className="phieu-chi-table">
          <thead>
            <tr>
              <th>MÃ PHIẾU</th>
              <th>NGƯỜI NHẬN</th>
              <th>NHÓM ĐỐI TƯỢNG</th>
              <th>LOẠI CHI</th>
              <th>PHƯƠNG THỨC</th>
              <th>NGƯỜI TẠO</th>
              <th>SỐ TIỀN CHI</th>
              <th>NGÀY GHI NHẬN</th>
              <th>NGUỒN TẠO</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length > 0 ? filteredList.map(p => (
              <tr key={p.id}>
                <td><strong>{p.id}</strong></td>
                <td>
                  <strong>{p.nguoiNhan}</strong>
                  <div className="pc-sub-text">{p.chucVu}</div>
                </td>
                <td className="pc-uppercase">{p.nhomDoiTuong}</td>
                <td>
                  <div className="pc-sub-text">{p.maLoai}</div>
                  <strong>{p.tenLoai}</strong>
                </td>
                <td className="pc-uppercase">{p.phuongThuc}</td>
                <td>
                  <div className="pc-sub-text">{p.nguoiTao}</div>
                </td>
                <td>
                  <strong className="pc-amount">{parseInt(p.soTien).toLocaleString('vi-VN')}đ</strong>
                </td>
                <td>
                  <div className="pc-sub-text">{p.ngayGhiNhan}</div>
                </td>
                <td className="pc-uppercase">{p.nguonTao}</td>
                <td>
                  <span className={`pc-badge ${p.trangThai === 'ĐÃ GHI NHẬN' ? 'pc-badge-success' : 'pc-badge-error'}`}>
                    {p.trangThai}
                  </span>
                </td>
                <td>
                  <button 
                    className="pc-btn-detail"
                    onClick={() => navigate(`/admin/so-quy-tien-mat/phieu-chi/chi-tiet/${p.id}`)}
                  >
                    XEM CHI TIẾT
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="11" className="pc-empty">
                  KHÔNG TÌM THẤY PHIẾU CHI NÀO
                  <br />
                  <button className="pc-btn-create-empty" onClick={() => navigate('/admin/so-quy-tien-mat/phieu-chi/tao-moi')} style={{ marginTop: '12px', padding: '8px 16px', background: '#ff0000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>TẠO PHIẾU CHI</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="phieu-chi-footer">
        <div className="pc-footer-text">
          HIỂN THỊ 1-{filteredList.length} TRÊN {filteredList.length} PHIẾU
        </div>
        <div className="pt-pagination">
          <button className="pt-page-btn" disabled>&lt;</button>
          <button className="pt-page-btn pt-page-btn-active">1</button>
          <button className="pt-page-btn">&gt;</button>
        </div>
      </div>
    </main>
  );
}
