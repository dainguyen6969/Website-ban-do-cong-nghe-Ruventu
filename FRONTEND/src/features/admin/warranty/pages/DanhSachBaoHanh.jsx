import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/warranty.css';
import { mockWarrantyData, statusColors } from '../data/mockData';

const parseDate = (dateStr) => {
  // dateStr format: "14/09/2026 14:00" or "14/09/2026"
  if (!dateStr) return null;
  const parts = dateStr.split(' ')[0].split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return null;
};

const DanhSachBaoHanh = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TẤT CẢ TRẠNG THÁI');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState([]);

  useEffect(() => {
    // Read from the shared mutable array
    setData([...mockWarrantyData]);
  }, []);

  const filteredData = data.filter(item => {
    if (search && !item.id.toLowerCase().includes(search.toLowerCase()) && !item.serial.toLowerCase().includes(search.toLowerCase()) && !item.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'TẤT CẢ TRẠNG THÁI' && item.status !== statusFilter) return false;
    
    const itemDate = parseDate(item.created);
    if (itemDate) {
      if (fromDate) {
        const fromD = new Date(fromDate);
        if (itemDate < fromD) return false;
      }
      if (toDate) {
        const toD = new Date(toDate);
        if (itemDate > toD) return false;
      }
    }
    
    return true;
  });

  return (
    <div className="warranty-page">
      <div className="w-breadcrumb">
        <span>ADMIN</span> <span>›</span> <strong>BẢO HÀNH</strong>
      </div>
      <div className="warranty-header-row">
        <div>
          <h1 className="warranty-page-title">DANH SÁCH PHIẾU BẢO HÀNH</h1>
          <p className="warranty-page-subtitle">THEO DÕI CÁC THIẾT BỊ ĐANG ĐƯỢC TIẾP NHẬN VÀ XỬ LÝ BẢO HÀNH</p>
        </div>
        <button className="btn-black-create" onClick={() => navigate('/admin/bao-hanh/tao-moi')}>+ LẬP PHIẾU BẢO HÀNH</button>
      </div>

      <div className="warranty-filters">
        <input 
          type="text" 
          placeholder="TÌM MÃ PHIẾU / SERIAL / TÊN KHÁCH HÀNG..." 
          className="w-filter-input search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select 
          className="w-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="TẤT CẢ TRẠNG THÁI">TẤT CẢ TRẠNG THÁI</option>
          <option value="TIẾP NHẬN">TIẾP NHẬN</option>
          <option value="ĐANG KIỂM TRA">ĐANG KIỂM TRA</option>
          <option value="ĐÃ GỬI BẢO HÀNH">ĐÃ GỬI BẢO HÀNH</option>
          <option value="ĐANG BẢO HÀNH">ĐANG BẢO HÀNH</option>
          <option value="ĐÃ NHẬN LẠI">ĐÃ NHẬN LẠI</option>
          <option value="HOÀN TẤT">HOÀN TẤT</option>
        </select>
        
        <div className="date-filter-group">
          <span className="date-label">TỪ NGÀY</span>
          <input type="date" className="w-filter-date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="date-filter-group">
          <span className="date-label">ĐẾN NGÀY</span>
          <input type="date" className="w-filter-date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="warranty-table-container">
        <table className="warranty-table">
          <thead>
            <tr>
              <th>MÃ PHIẾU</th>
              <th>ĐƠN HÀNG</th>
              <th>KHÁCH HÀNG</th>
              <th>SẢN PHẨM</th>
              <th>SERIAL NUMBER</th>
              <th>TRẠNG THÁI</th>
              <th>NGÀY TIẾP NHẬN</th>
              <th>CẬP NHẬT CUỐI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? filteredData.map(item => (
              <tr key={item.id}>
                <td className="fw-bold">{item.id}</td>
                <td>{item.orderId}</td>
                <td className="fw-bold">{item.customerName}</td>
                <td>
                  <div className="fw-bold">{item.productName}</div>
                  <div className="text-gray">{item.productVariant}</div>
                </td>
                <td className="fw-bold">{item.serial}</td>
                <td>
                  <span className="w-status-badge" style={{ color: statusColors[item.status]?.color, borderColor: statusColors[item.status]?.border }}>
                    {item.status}
                  </span>
                </td>
                <td className="text-gray">{item.created}</td>
                <td className="text-gray">{item.updated}</td>
                <td>
                  <button className="btn-view-detail" onClick={() => navigate(`/admin/bao-hanh/chi-tiet/${item.id}`)}>XEM CHI TIẾT</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="9" className="w-empty-state">
                  <div className="empty-text">KHÔNG TÌM THẤY PHIẾU BẢO HÀNH PHÙ HỢP</div>
                  <button className="btn-black-create mt-2" onClick={() => navigate('/admin/bao-hanh/tao-moi')}>LẬP PHIẾU BẢO HÀNH</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="w-pagination-footer">
        <div className="w-pagination-info">HIỂN THỊ {filteredData.length > 0 ? `1-${filteredData.length}` : '0'} TRÊN TỔNG SỐ {filteredData.length} PHIẾU</div>
        <div className="w-pagination-controls">
          <button disabled>← TRƯỚC</button>
          <button disabled>SAU →</button>
        </div>
      </div>
    </div>
  );
};

export default DanhSachBaoHanh;
