import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, ArrowUp, ArrowDown, DollarSign, BarChart2, FileText } from 'lucide-react';
import './SoQuy.css';

export default function SoQuy() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    tuNgay: '2024-09-01',
    denNgay: '2024-09-30',
    loaiPhieu: 'Tất cả',
    phuongThuc: 'Tất cả',
    nguoiNopNhan: '',
    nhanVien: 'Tất cả',
  });

  const allTransactions = useMemo(() => [
    { id: 1, type: 'Phiếu thu', date: '2024-09-10', code: 'PT-001', person: 'Nguyễn Thị Lan', method: 'Tiền mặt', employee: 'Admin Tổng', thu: 5200000, chi: 0 },
    { id: 2, type: 'Phiếu thu', date: '2024-09-10', code: 'PT-002', person: 'Hoàng Minh Khoa', method: 'Chuyển khoản', employee: 'Nguyễn Văn A', thu: 12800000, chi: 0 },
    { id: 3, type: 'Phiếu chi', date: '2024-09-10', code: 'PC-001', person: 'NCC Corsair VN', method: 'Chuyển khoản', employee: 'Admin Tổng', thu: 0, chi: 3500000 },
    { id: 4, type: 'Phiếu thu', date: '2024-09-11', code: 'PT-003', person: 'Phạm Quốc Hùng', method: 'Quẹt thẻ', employee: 'Nguyễn Văn A', thu: 8990000, chi: 0 },
    { id: 5, type: 'Phiếu chi', date: '2024-09-11', code: 'PC-002', person: 'Điện lực TP.HCM', method: 'Tiền mặt', employee: 'Admin Tổng', thu: 0, chi: 1200000 },
    { id: 6, type: 'Phiếu thu', date: '2024-09-12', code: 'PT-004', person: 'Công ty ABC Tech', method: 'Chuyển khoản', employee: 'Admin Tổng', thu: 22500000, chi: 0 },
    { id: 7, type: 'Phiếu chi', date: '2024-09-12', code: 'PC-003', person: 'Nhà vận chuyển GHN', method: 'Tiền mặt', employee: 'Nguyễn Văn A', thu: 0, chi: 500000 },
    { id: 8, type: 'Phiếu thu', date: '2024-09-13', code: 'PT-005', person: 'Vũ Thị Ngọc', method: 'Tiền mặt', employee: 'Admin Tổng', thu: 4490000, chi: 0 },
  ], []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredData = useMemo(() => {
    return allTransactions.filter(t => {
      if (t.date < filters.tuNgay || t.date > filters.denNgay) return false;
      if (filters.loaiPhieu !== 'Tất cả' && t.type !== filters.loaiPhieu) return false;
      if (filters.phuongThuc !== 'Tất cả' && t.method !== filters.phuongThuc) return false;
      if (filters.nhanVien !== 'Tất cả' && t.employee !== filters.nhanVien) return false;
      if (filters.nguoiNopNhan && !t.person.toLowerCase().includes(filters.nguoiNopNhan.toLowerCase())) return false;
      return true;
    });
  }, [filters, allTransactions]);

  const soDuDauKy = 125000000;
  const tongThu = filteredData.reduce((sum, t) => sum + t.thu, 0);
  const tongChi = filteredData.reduce((sum, t) => sum + t.chi, 0);
  const tonCuoiKy = soDuDauKy + tongThu - tongChi;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount).replace(/,/g, '.') + 'đ';
  };

  const formatThu = (amount) => amount > 0 ? '+' + formatMoney(amount) : '-';
  const formatChi = (amount) => amount > 0 ? '-' + formatMoney(amount) : '-';

  return (
    <main className="so-quy-page">
      <div className="so-quy-header">
        <button className="sq-btn-create" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu')}>+ TẠO PHIẾU THU / CHI</button>
      </div>

      <div className="sq-filters">
        <div className="sq-filter-group">
          <label>TỪ NGÀY</label>
          <input type="date" name="tuNgay" value={filters.tuNgay} onChange={handleFilterChange} />
        </div>
        <div className="sq-filter-group">
          <label>ĐẾN NGÀY</label>
          <input type="date" name="denNgay" value={filters.denNgay} onChange={handleFilterChange} />
        </div>
        <div className="sq-filter-group">
          <label>LOẠI PHIẾU</label>
          <select name="loaiPhieu" value={filters.loaiPhieu} onChange={handleFilterChange}>
            <option>Tất cả</option>
            <option>Phiếu thu</option>
            <option>Phiếu chi</option>
          </select>
        </div>
        <div className="sq-filter-group">
          <label>PHƯƠNG THỨC</label>
          <select name="phuongThuc" value={filters.phuongThuc} onChange={handleFilterChange}>
            <option>Tất cả</option>
            <option>Tiền mặt</option>
            <option>Chuyển khoản</option>
            <option>Quẹt thẻ</option>
          </select>
        </div>
        <div className="sq-filter-group">
          <label>NGƯỜI NỘP / NHẬN</label>
          <input type="text" name="nguoiNopNhan" placeholder="Tên khách / đơn vị..." value={filters.nguoiNopNhan} onChange={handleFilterChange} />
        </div>
        <div className="sq-filter-group">
          <label>NHÂN VIÊN</label>
          <select name="nhanVien" value={filters.nhanVien} onChange={handleFilterChange}>
            <option>Tất cả</option>
            <option>Admin Tổng</option>
            <option>Nguyễn Văn A</option>
          </select>
        </div>
        <div className="sq-filter-actions">
          <button className="sq-btn-report">
            <BarChart2 size={14} /> XEM BÁO CÁO
          </button>
          <button className="sq-btn-export">
            <FileText size={14} /> XUẤT FILE EXCEL
          </button>
        </div>
      </div>

      <div className="sq-summary">
        <div className="sq-card">
          <div className="sq-card-icon default-icon"><Monitor size={20} /></div>
          <div className="sq-card-content">
            <span className="sq-card-label">SỐ DƯ ĐẦU KỲ</span>
            <span className="sq-card-value text-black">{formatMoney(soDuDauKy)}</span>
          </div>
        </div>
        <div className="sq-card">
          <div className="sq-card-icon green-icon"><ArrowUp size={20} /></div>
          <div className="sq-card-content">
            <span className="sq-card-label">TỔNG THU</span>
            <span className="sq-card-value text-green">{formatThu(tongThu)}</span>
          </div>
        </div>
        <div className="sq-card">
          <div className="sq-card-icon red-icon"><ArrowDown size={20} /></div>
          <div className="sq-card-content">
            <span className="sq-card-label">TỔNG CHI</span>
            <span className="sq-card-value text-red">{formatChi(tongChi)}</span>
          </div>
        </div>
        <div className="sq-card bg-black">
          <div className="sq-card-icon black-red-icon"><DollarSign size={20} /></div>
          <div className="sq-card-content">
            <span className="sq-card-label text-white">TỒN CUỐI KỲ</span>
            <span className={`sq-card-value ${tonCuoiKy < 0 ? 'text-red' : 'text-green'}`}>{formatMoney(tonCuoiKy)}</span>
          </div>
        </div>
      </div>
      <div className="sq-note">
        ⓘ Tồn cuối kỳ = Số dư đầu kỳ + Tổng thu - Tổng chi
      </div>

      <div className="sq-table-container">
        <table className="sq-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>LOẠI PHIẾU</th>
              <th>NGÀY GHI NHẬN</th>
              <th>MÃ PHIẾU</th>
              <th>NGƯỜI NỘP / NHẬN</th>
              <th>PHƯƠNG THỨC THANH TOÁN</th>
              <th className="text-right">TIỀN THU</th>
              <th className="text-right">TIỀN CHI</th>
              <th>MÔ TẢ</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center" style={{ padding: '20px' }}>Không tìm thấy dữ liệu phù hợp</td>
              </tr>
            )}
            {filteredData.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>
                  <span className={`sq-type-badge ${row.type === 'Phiếu thu' ? 'bg-green' : 'bg-red'}`}>
                    {row.type}
                  </span>
                </td>
                <td>{row.date}</td>
                <td><strong>{row.code}</strong></td>
                <td>{row.person}</td>
                <td>
                  <span className={`sq-method-badge ${row.method === 'Tiền mặt' ? 'method-cash' : row.method === 'Chuyển khoản' ? 'method-transfer' : 'method-card'}`}>
                    {row.method}
                  </span>
                </td>
                <td className="text-right"><strong className="text-green">{formatThu(row.thu)}</strong></td>
                <td className="text-right"><strong className="text-red">{formatChi(row.chi)}</strong></td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="6" className="text-left"><strong>TỔNG ({filteredData.length} PHIẾU)</strong></td>
              <td className="text-right"><strong className="text-green">{formatThu(tongThu)}</strong></td>
              <td className="text-right"><strong className="text-red">{formatChi(tongChi)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}
