import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhieuThuList } from '../utils/phieuThuStore';
import './PhieuThu.css';

export default function PhieuThu() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TẤT CẢ TRẠNG THÁI');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const phieuList = getPhieuThuList();

  const filteredList = phieuList.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = searchTerm === '' || 
           p.id.toLowerCase().includes(searchLower) || 
           p.nguoiNop.toLowerCase().includes(searchLower) ||
           (p.chungTu && p.chungTu.toLowerCase().includes(searchLower));

    const matchStatus = statusFilter === 'TẤT CẢ TRẠNG THÁI' || p.trangThai === statusFilter;

    let matchDate = true;
    if (fromDate || toDate) {
      let pDateStr = "";
      if (p.ngayGhiNhan) {
         const dateParts = p.ngayGhiNhan.split(' ')[0].split('/');
         if (dateParts.length === 3) {
            const [d, m, y] = dateParts;
            pDateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
         }
      }
      
      if (pDateStr) {
        if (fromDate && pDateStr < fromDate) matchDate = false;
        if (toDate && pDateStr > toDate) matchDate = false;
      } else {
        matchDate = false;
      }
    }

    return matchSearch && matchStatus && matchDate;
  });

  return (
    <main className="phieu-thu-page">
      <div className="phieu-thu-header">
        <div className="phieu-thu-breadcrumb">SỔ QUỸ TIỀN MẶT / <strong>PHIẾU THU</strong></div>
        <div className="phieu-thu-title-row">
          <div className="phieu-thu-title">
            <h1>PHIẾU THU</h1>
            <p>QUẢN LÝ CÁC KHOẢN TIỀN ĐÃ GHI NHẬN VÀO QUỸ</p>
          </div>
          <button className="phieu-thu-btn-create" onClick={() => navigate('/admin/so-quy-tien-mat/phieu-thu/tao-moi')}>
            + TẠO PHIẾU THU
          </button>
        </div>
      </div>

      <div className="phieu-thu-filters">
        <input 
          type="text" 
          className="phieu-thu-search" 
          placeholder="TÌM MÃ PHIẾU / NGƯỜI NỘP / CHỨNG TỪ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="phieu-thu-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>TẤT CẢ TRẠNG THÁI</option>
          <option>ĐÃ GHI NHẬN</option>
          <option>ĐÃ HỦY</option>
        </select>
        <div className="phieu-thu-date-group">
          <label>TỪ NGÀY</label>
          <input 
            type="date" 
            className="phieu-thu-date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="phieu-thu-date-group">
          <label>ĐẾN NGÀY</label>
          <input 
            type="date" 
            className="phieu-thu-date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      <div className="phieu-thu-table-container">
        <table className="phieu-thu-table">
          <thead>
            <tr>
              <th>MÃ PHIẾU</th>
              <th>NGƯỜI NỘP</th>
              <th>NHÓM ĐỐI TƯỢNG</th>
              <th>LOẠI THU</th>
              <th>PHƯƠNG THỨC</th>
              <th>NGƯỜI TẠO</th>
              <th>SỐ TIỀN THU</th>
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
                  <div className="pt-primary">{p.nguoiNop}</div>
                  <div className="pt-secondary">{p.nhom}</div>
                </td>
                <td className="pt-uppercase">{p.nhom}</td>
                <td>
                  <div className="pt-secondary">{p.maLoai}</div>
                  <div className="pt-primary">{p.tenLoai}</div>
                </td>
                <td className="pt-uppercase">{p.phuongThuc}</td>
                <td>{p.nguoiTao}</td>
                <td><strong>{Number(p.soTien).toLocaleString('vi-VN')}đ</strong></td>
                <td className="pt-secondary">{p.ngayGhiNhan}</td>
                <td className="pt-uppercase">{p.nguonTao}</td>
                <td>
                  <span className={`pt-badge ${p.trangThai === 'ĐÃ GHI NHẬN' ? 'pt-badge-success' : 'pt-badge-danger'}`}>
                    {p.trangThai}
                  </span>
                </td>
                <td>
                  <button 
                    className="pt-btn-detail"
                    onClick={() => navigate(`/admin/so-quy-tien-mat/phieu-thu/chi-tiet/${p.id}`)}
                  >
                    XEM CHI TIẾT
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="11" className="pt-empty">
                  KHÔNG TÌM THẤY PHIẾU THU PHÙ HỢP
                  <br />
                  <button className="pt-btn-create-empty" onClick={() => navigate('/admin/so-quy-tien-mat/phieu-thu/tao-moi')}>TẠO PHIẾU THU</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="phieu-thu-footer">
        <div className="pt-footer-text">
          HIỂN THỊ 1-{filteredList.length} TRÊN {filteredList.length} PHIẾU
        </div>
        <div className="pt-pagination">
          <button className="pt-page-btn" disabled>&lt;</button>
          <button className="pt-page-btn pt-page-btn-active">1</button>
          <button className="pt-page-btn">2</button>
          <button className="pt-page-btn">&gt;</button>
        </div>
      </div>
    </main>
  );
}
