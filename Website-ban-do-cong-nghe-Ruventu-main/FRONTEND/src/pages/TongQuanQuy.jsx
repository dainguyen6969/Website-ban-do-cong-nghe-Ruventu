import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import './TongQuanQuy.css';

export default function TongQuanQuy() {
  const navigate = useNavigate();
  
  // States cho bộ lọc
  // States cho bộ lọc đang nhập
  const [filters, setFilters] = useState({
    tuNgay: '2024-08-01',
    denNgay: '2024-08-31',
    loaiPhieu: 'TẤT CẢ',
    phuongThuc: 'TẤT CẢ',
    nguoiNopNhan: '',
    nhomDoiTuong: 'TẤT CẢ NHÓM',
  });

  // State cho bộ lọc đã áp dụng
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  
  const [timeRange, setTimeRange] = useState('THEO NGÀY');

  // Mock data (thực tế sẽ gọi từ API)
  const allTransactions = useMemo(() => [
    { id: 1, date: '2024-08-10', type: 'THU', amount: 18000000, person: 'Nguyễn Văn A', method: 'TIỀN MẶT' },
    { id: 2, date: '2024-08-10', type: 'CHI', amount: 2000000, person: 'Công ty ABC', method: 'CHUYỂN KHOẢN' },
    { id: 3, date: '2024-08-12', type: 'THU', amount: 2000000, person: 'Trần Thị B', method: 'CHUYỂN KHOẢN' },
    { id: 4, date: '2024-08-12', type: 'CHI', amount: 48000000, person: 'Nhà cung cấp X', method: 'TIỀN MẶT' },
    { id: 5, date: '2024-08-13', type: 'THU', amount: 10000000, person: 'Lê Văn C', method: 'TIỀN MẶT' },
    { id: 6, date: '2024-08-13', type: 'CHI', amount: 5000000, person: 'Điện lực', method: 'CHUYỂN KHOẢN' },
    { id: 7, date: '2024-08-14', type: 'THU', amount: 2000000, person: 'Phạm Thị D', method: 'TIỀN MẶT' },
    { id: 8, date: '2024-08-14', type: 'CHI', amount: 2000000, person: 'Nước sạch', method: 'TIỀN MẶT' },
    { id: 9, date: '2024-08-15', type: 'THU', amount: 5000000, person: 'Hoàng Văn E', method: 'CHUYỂN KHOẢN' },
    { id: 10, date: '2024-08-15', type: 'CHI', amount: 2000000, person: 'Internet', method: 'CHUYỂN KHOẢN' },
    { id: 11, date: '2024-08-16', type: 'THU', amount: 2000000, person: 'Ngô Thị F', method: 'TIỀN MẶT' },
    { id: 12, date: '2024-08-16', type: 'CHI', amount: 12000000, person: 'Công ty Y', method: 'CHUYỂN KHOẢN' },
  ], []);

  // Hàm xử lý thay đổi bộ lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Hàm xử lý Áp dụng
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  // Hàm xử lý Xóa bộ lọc
  const handleClearFilters = () => {
    const defaultFilters = {
      tuNgay: '2024-08-01',
      denNgay: '2024-08-31',
      loaiPhieu: 'TẤT CẢ',
      phuongThuc: 'TẤT CẢ',
      nguoiNopNhan: '',
      nhomDoiTuong: 'TẤT CẢ NHÓM',
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  // Tính toán dữ liệu lọc
  const filteredData = useMemo(() => {
    return allTransactions.filter(t => {
      // Lọc theo người nộp/nhận
      if (appliedFilters.nguoiNopNhan && !t.person.toLowerCase().includes(appliedFilters.nguoiNopNhan.toLowerCase())) {
        return false;
      }
      // Lọc theo ngày
      if (t.date < appliedFilters.tuNgay || t.date > appliedFilters.denNgay) {
        return false;
      }
      // Lọc theo loại phiếu
      if (appliedFilters.loaiPhieu === 'PHIẾU THU' && t.type !== 'THU') return false;
      if (appliedFilters.loaiPhieu === 'PHIẾU CHI' && t.type !== 'CHI') return false;
      
      // Lọc theo phương thức
      if (appliedFilters.phuongThuc !== 'TẤT CẢ' && t.method !== appliedFilters.phuongThuc) {
        return false;
      }
      
      return true;
    });
  }, [appliedFilters, allTransactions]);

  // Tính tổng
  const soDuDauKy = 5000000;
  const tongThu = filteredData.filter(t => t.type === 'THU').reduce((sum, t) => sum + t.amount, 0);
  const tongChi = filteredData.filter(t => t.type === 'CHI').reduce((sum, t) => sum + t.amount, 0);
  const tonQuy = soDuDauKy + tongThu - tongChi;

  // Xử lý dữ liệu biểu đồ
  const chartData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(t => {
      let key = t.date; // Mặc định THEO NGÀY
      if (timeRange === 'THEO TUẦN') {
        // Mock group theo tuần (ví dụ đơn giản)
        key = 'Tuần ' + Math.ceil(new Date(t.date).getDate() / 7);
      } else if (timeRange === 'THEO THÁNG') {
        key = 'Tháng ' + (new Date(t.date).getMonth() + 1);
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: key, thu: 0, chi: 0 };
      }
      if (t.type === 'THU') grouped[key].thu += t.amount;
      if (t.type === 'CHI') grouped[key].chi += t.amount;
    });

    // Chuyển object thành array và sort
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, timeRange]);

  const dates = chartData.map(d => d.date);
  const thuData = chartData.map(d => d.thu);
  const chiData = chartData.map(d => d.chi);

  // ECharts Option
  const getOption = () => {
    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['TỔNG THU', 'TỔNG CHI'],
        bottom: 0,
        icon: 'circle'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#ccc' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            if (value >= 1000000) return (value / 1000000) + 'M';
            return value;
          }
        },
        splitLine: { lineStyle: { color: '#eee' } }
      },
      series: [
        {
          name: 'TỔNG THU',
          type: 'line',
          data: thuData,
          itemStyle: { color: '#111' },
          lineStyle: { width: 2 },
          symbolSize: 8
        },
        {
          name: 'TỔNG CHI',
          type: 'line',
          data: chiData,
          itemStyle: { color: '#dc2626' },
          lineStyle: { width: 2, type: 'dashed' },
          symbol: 'rect',
          symbolSize: 8
        }
      ]
    };
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <main className="fund-overview-page">
      <div className="fund-overview-header">
        <div className="fund-breadcrumb">SỔ QUỸ TIỀN MẶT / <strong>TỔNG QUAN</strong></div>
        <div className="fund-header-row">
          <div className="fund-header-title">
            <h1>TỔNG QUAN QUỸ</h1>
            <p>THEO DÕI NHANH TÌNH HÌNH THU CHI VÀ TỒN QUỸ CỦA HÀNG</p>
          </div>
          <button className="fund-btn-view" onClick={() => navigate('/admin/so-quy-tien-mat/so-quy')}>
            XEM SỔ QUỸ →
          </button>
        </div>
      </div>

      <div className="fund-filter-bar">
        <div className="fund-filter-group">
          <label>TỪ NGÀY</label>
          <input type="date" name="tuNgay" className="fund-filter-input" value={filters.tuNgay} onChange={handleFilterChange} />
        </div>
        <div className="fund-filter-group">
          <label>ĐẾN NGÀY</label>
          <input type="date" name="denNgay" className="fund-filter-input" value={filters.denNgay} onChange={handleFilterChange} />
        </div>
        <div className="fund-filter-group">
          <label>LOẠI PHIẾU</label>
          <select name="loaiPhieu" className="fund-filter-select" value={filters.loaiPhieu} onChange={handleFilterChange}>
            <option>TẤT CẢ</option>
            <option>PHIẾU THU</option>
            <option>PHIẾU CHI</option>
          </select>
        </div>
        <div className="fund-filter-group">
          <label>PHƯƠNG THỨC</label>
          <select name="phuongThuc" className="fund-filter-select" value={filters.phuongThuc} onChange={handleFilterChange}>
            <option>TẤT CẢ</option>
            <option>TIỀN MẶT</option>
            <option>CHUYỂN KHOẢN</option>
          </select>
        </div>
        <div className="fund-filter-group">
          <label>NGƯỜI NỘP / NHẬN</label>
          <input 
            type="text" 
            name="nguoiNopNhan"
            className="fund-filter-input" 
            placeholder="TÌM TÊN..." 
            value={filters.nguoiNopNhan}
            onChange={handleFilterChange}
          />
        </div>
        <div className="fund-filter-group">
          <label>NHÓM ĐỐI TƯỢNG</label>
          <select name="nhomDoiTuong" className="fund-filter-select" value={filters.nhomDoiTuong} onChange={handleFilterChange}>
            <option>TẤT CẢ NHÓM</option>
            <option>KHÁCH HÀNG</option>
            <option>NHÂN VIÊN</option>
            <option>NHÀ CUNG CẤP</option>
            <option>ĐỐI TÁC GIAO HÀNG</option>
            <option>KHÁC</option>
          </select>
        </div>
        <div className="fund-filter-actions">
          <button className="fund-btn-clear" onClick={handleClearFilters}>XÓA BỘ LỌC</button>
          <button className="fund-btn-apply" onClick={handleApplyFilters}>ÁP DỤNG</button>
        </div>
      </div>

      <div className="fund-summary-cards">
        <div className="fund-summary-card">
          <label>SỐ DƯ ĐẦU KỲ</label>
          <div className="fund-value text-black">{formatMoney(soDuDauKy)}</div>
        </div>
        <div className="fund-summary-card">
          <label>TỔNG THU</label>
          <div className="fund-value text-green">{formatMoney(tongThu)}</div>
        </div>
        <div className="fund-summary-card">
          <label>TỔNG CHI</label>
          <div className="fund-value text-red">{formatMoney(tongChi)}</div>
        </div>
        <div className="fund-summary-card bg-black">
          <label>TỒN QUỸ</label>
          <div className={`fund-value ${tonQuy < 0 ? 'text-red' : 'text-green'}`}>{formatMoney(tonQuy)}</div>
          <div className="fund-sub-label">{tonQuy < 0 ? 'TỒN QUỸ ÂM' : 'TỒN QUỸ DƯ'}</div>
        </div>
      </div>
      <div className="fund-formula">
        {formatMoney(soDuDauKy)} <span className="fund-op">+</span> {formatMoney(tongThu)} <span className="fund-op">-</span> {formatMoney(tongChi)} <span className="fund-op">=</span> <strong className={tonQuy < 0 ? 'text-red' : 'text-green'}>{formatMoney(tonQuy)}</strong>
      </div>

      <div className="fund-chart-section">
        <div className="fund-chart-header">
          <div className="fund-chart-title">
            <h2>DÒNG TIỀN THEO THỜI GIAN</h2>
            <p>SO SÁNH TIỀN THU VÀ TIỀN CHI TRONG PHẠM VI ĐANG XEM</p>
          </div>
          <div className="fund-chart-toggles">
            {['THEO NGÀY', 'THEO TUẦN', 'THEO THÁNG'].map(mode => (
              <button 
                key={mode} 
                className={`fund-toggle-btn ${timeRange === mode ? 'active' : ''}`}
                onClick={() => setTimeRange(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        
        <div className="fund-chart-container" style={{ height: '350px', width: '100%' }}>
          <ReactECharts 
            option={getOption()} 
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }} 
          />
        </div>
      </div>
    </main>
  );
}
