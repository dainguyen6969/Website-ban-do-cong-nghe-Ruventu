import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import '../styles/tongquat.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartDataByTab = {
  'DOANH THU THUẦN': {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        label: 'KỲ HIỆN TẠI',
        data: [120, 190, 150, 220, 180, 250, 240],
        borderColor: '#E31E24',
        backgroundColor: '#E31E24',
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E31E24',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'KỲ TRƯỚC',
        data: [100, 150, 120, 180, 140, 200, 180],
        borderColor: '#ccc',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  },
  'SỐ ĐƠN': {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        label: 'KỲ HIỆN TẠI',
        data: [15, 25, 20, 30, 28, 40, 35],
        borderColor: '#E31E24',
        backgroundColor: '#E31E24',
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E31E24',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'KỲ TRƯỚC',
        data: [12, 20, 18, 25, 22, 30, 28],
        borderColor: '#ccc',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  },
  'SỐ LƯỢNG BÁN': {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        label: 'KỲ HIỆN TẠI',
        data: [30, 45, 38, 55, 50, 70, 65],
        borderColor: '#E31E24',
        backgroundColor: '#E31E24',
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E31E24',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'KỲ TRƯỚC',
        data: [25, 35, 30, 45, 40, 55, 50],
        borderColor: '#ccc',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  },
  'LỢI NHUẬN GỘP': {
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        label: 'KỲ HIỆN TẠI',
        data: [25, 40, 30, 45, 35, 55, 50],
        borderColor: '#E31E24',
        backgroundColor: '#E31E24',
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#E31E24',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'KỲ TRƯỚC',
        data: [20, 30, 25, 35, 28, 40, 38],
        borderColor: '#ccc',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  }
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      display: false,
      beginAtZero: true
    },
    x: {
      grid: {
        display: false,
        drawBorder: false,
      },
      ticks: {
        display: false
      }
    }
  }
};

const topProductsData = [
  {
    id: 1,
    name: 'Samsung 990 Pro NVMe',
    variant: '2TB',
    sold: 41,
    revenue: 147559000,
    revenueStr: '147.559.000đ',
    stock: 18,
    status: 'BÌNH THƯỜNG',
    statusColor: '#888'
  },
  {
    id: 2,
    name: 'Corsair Vengeance DDR5',
    variant: '32GB 6000MHz',
    sold: 37,
    revenue: 125763000,
    revenueStr: '125.763.000đ',
    stock: 9,
    status: 'BÌNH THƯỜNG',
    statusColor: '#888'
  },
  {
    id: 3,
    name: 'ASUS ROG STRIX RTX 4090',
    variant: 'OC 24GB',
    sold: 28,
    revenue: 1119720000,
    revenueStr: '1.119.720.000đ',
    stock: 2,
    status: 'GẦN HẾT',
    statusColor: '#E31E24'
  },
  {
    id: 4,
    name: 'AMD Ryzen 9 7950X3D',
    variant: 'Box chính hãng',
    sold: 24,
    revenue: 525600000,
    revenueStr: '525.600.000đ',
    stock: 5,
    status: 'BÌNH THƯỜNG',
    statusColor: '#888'
  }
];

const MockBarChart = () => (
  <svg width="100%" height="80" viewBox="0 0 800 100" preserveAspectRatio="none">
    {/* T1 */}
    <rect x="50" y="20" width="12" height="80" fill="#000" />
    <rect x="65" y="50" width="12" height="50" fill="#E31E24" />
    <text x="85" y="95" fontSize="11" fill="#888" fontWeight="800">T1</text>
    {/* T2 */}
    <rect x="180" y="10" width="12" height="90" fill="#000" />
    <rect x="195" y="40" width="12" height="60" fill="#E31E24" />
    <text x="215" y="95" fontSize="11" fill="#888" fontWeight="800">T2</text>
    {/* T3 */}
    <rect x="310" y="30" width="12" height="70" fill="#000" />
    <rect x="325" y="45" width="12" height="55" fill="#E31E24" />
    <text x="345" y="95" fontSize="11" fill="#888" fontWeight="800">T3</text>
    {/* T4 */}
    <rect x="440" y="5" width="12" height="95" fill="#000" />
    <rect x="455" y="55" width="12" height="45" fill="#E31E24" />
    <text x="475" y="95" fontSize="11" fill="#888" fontWeight="800">T4</text>
    {/* T5 */}
    <rect x="570" y="15" width="12" height="85" fill="#000" />
    <rect x="585" y="35" width="12" height="65" fill="#E31E24" />
    <text x="605" y="95" fontSize="11" fill="#888" fontWeight="800">T5</text>
    {/* T6 */}
    <rect x="700" y="0" width="12" height="100" fill="#000" />
    <rect x="715" y="40" width="12" height="60" fill="#E31E24" />
    <text x="735" y="95" fontSize="11" fill="#888" fontWeight="800">T6</text>
  </svg>
);

const TongQuat = () => {
  const navigate = useNavigate();

  const [timeFilter, setTimeFilter] = useState('THÁNG NÀY');
  const [channelFilter, setChannelFilter] = useState('TẤT CẢ');
  
  const [tempTime, setTempTime] = useState('THÁNG NÀY');
  const [tempChannel, setTempChannel] = useState('TẤT CẢ');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [chartTab, setChartTab] = useState('DOANH THU THUẦN');
  const [topProductsTab, setTopProductsTab] = useState('SỐ LƯỢNG BÁN');

  const sortedTopProducts = [...topProductsData].sort((a, b) => {
    if (topProductsTab === 'SỐ LƯỢNG BÁN') {
      return b.sold - a.sold;
    } else {
      return b.revenue - a.revenue;
    }
  });

  const handleApply = () => {
    setTimeFilter(tempTime);
    setChannelFilter(tempChannel);
  };

  const handleClear = () => {
    setTempTime('THÁNG NÀY');
    setTempChannel('TẤT CẢ');
    setTimeFilter('THÁNG NÀY');
    setChannelFilter('TẤT CẢ');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="tq-page">
      <div className="tq-header-section">
        <div>
          <div className="tq-subtitle" style={{marginBottom: 5}}>TỔNG QUÁT</div>
          <h1 className="tq-title">TỔNG QUÁT</h1>
          <div className="tq-subtitle">TỔNG HỢP HOẠT ĐỘNG KINH DOANH<br/>VÀ VẬN HÀNH HỆ THỐNG</div>
        </div>
        <div className="tq-header-right">
          <div className="tq-update-time">CẬP NHẬT: 19/03/2026 14:30<br/><strong>{timeFilter} - KÊNH {channelFilter}</strong></div>
          <button className="btn-black-excel">XUẤT EXCEL</button>
        </div>
      </div>

      <div className="tq-card tq-filters-card">
        <div>
          <div className="tq-filter-row">
            <div className="tq-filter-label">KHOẢNG THỜI GIAN</div>
            <div className="tq-btn-group">
              {['HÔM NAY', 'HÔM QUA', 'TUẦN NÀY', 'THÁNG NÀY', 'NĂM NAY', 'TÙY CHỈNH'].map(t => (
                <button 
                  key={t}
                  className={`tq-btn-filter ${tempTime === t ? 'active-black' : ''}`}
                  onClick={() => setTempTime(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {tempTime === 'TÙY CHỈNH' && (
            <div className="tq-custom-date" style={{marginLeft: 135}}>
              <div>
                <div className="tq-sub-label">TỪ NGÀY</div>
                <input type="date" className="tq-date-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <div className="tq-sub-label">ĐẾN NGÀY</div>
                <input type="date" className="tq-date-input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="tq-filter-row">
          <div className="tq-filter-label">KÊNH BÁN</div>
          <div className="tq-btn-group">
            {['TẤT CẢ', 'ONLINE', 'TẠI QUẦY'].map(c => (
              <button 
                key={c}
                className={`tq-btn-filter ${tempChannel === c ? 'active-red' : ''}`}
                onClick={() => setTempChannel(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="tq-filter-actions">
            <button className="btn-black-excel" onClick={handleApply}>ÁP DỤNG</button>
            <button className="btn-black-outline" onClick={handleClear}>XÓA BỘ LỌC</button>
          </div>
        </div>
      </div>

      <div className="tq-card">
        <div className="tq-kpi-grid">
          <div className="tq-kpi-box">
            <div className="tq-kpi-label">DOANH THU THUẦN</div>
            <div className="tq-kpi-value">428.500.000 <span className="tq-kpi-currency">đ</span></div>
            <div className="tq-kpi-change"><span className="tq-text-green">↑ 12,8%</span> SO VỚI KỲ TRƯỚC (TRONG KỲ)</div>
          </div>
          <div className="tq-kpi-box">
            <div className="tq-kpi-label">SỐ ĐƠN</div>
            <div className="tq-kpi-value">186</div>
            <div className="tq-kpi-change"><span className="tq-text-green">↑ 8,1%</span> SO VỚI KỲ TRƯỚC (TRONG KỲ)</div>
          </div>
          <div className="tq-kpi-box">
            <div className="tq-kpi-label">SỐ LƯỢNG BÁN</div>
            <div className="tq-kpi-value">342</div>
            <div className="tq-kpi-change"><span className="tq-text-green">↑ 14,2%</span> SO VỚI KỲ TRƯỚC (TRONG KỲ)</div>
          </div>
          <div className="tq-kpi-box">
            <div className="tq-kpi-label">THỰC THU</div>
            <div className="tq-kpi-value">397.800.000 <span className="tq-kpi-currency">đ</span></div>
            <div className="tq-kpi-change"><span className="tq-text-red">↓ 5,4%</span> SO VỚI KỲ TRƯỚC (TRONG KỲ)</div>
          </div>
          <div className="tq-kpi-box">
            <div className="tq-kpi-label">SỐ DƯ QUỸ</div>
            <div className="tq-kpi-value">847.250.000 <span className="tq-kpi-currency">đ</span></div>
            <div className="tq-kpi-change"><span className="tq-text-green">↑ 3,7%</span> SO VỚI KỲ TRƯỚC (HIỆN TẠI)</div>
          </div>
        </div>
        <div className="tq-kpi-sub-grid">
          <div className="tq-sub-box">
            <div className="tq-sub-label">DOANH THU BÁN HÀNG</div>
            <div className="tq-sub-val">472.800.000 đ</div>
            <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>TRONG KỲ</div>
          </div>
          <div className="tq-sub-box">
            <div className="tq-sub-label">TRẢ HÀNG / HOÀN TIỀN</div>
            <div className="tq-sub-val">18.600.000 đ</div>
            <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>TRONG KỲ</div>
          </div>
          <div className="tq-sub-box">
            <div className="tq-sub-label">TỔNG GIẢM GIÁ</div>
            <div className="tq-sub-val">25.700.000 đ</div>
            <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>TRONG KỲ</div>
          </div>
          <div className="tq-sub-box">
            <div className="tq-sub-label">GIÁ TRỊ TB / ĐƠN</div>
            <div className="tq-sub-val">2.303.763 đ</div>
            <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>TRONG KỲ</div>
          </div>
          <div className="tq-sub-box">
            <div className="tq-sub-label">LỢI NHUẬN GỘP</div>
            <div className="tq-sub-val">93.400.000 đ</div>
            <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>TRONG KỲ</div>
          </div>
        </div>
      </div>

      <div className="tq-2col">
        <div className="tq-card">
          <div className="tq-card-header" style={{display: 'block'}}>
            <h3 className="tq-card-title">VIỆC CẦN XỬ LÝ</h3>
            <div className="tq-sub-label" style={{marginLeft: 14, textTransform: 'none'}}>64 công việc đang chờ</div>
          </div>
          <div className="tq-todo-grid">
            <div className="tq-todo-box">
              <div className="tq-todo-num">6</div>
              <div className="tq-todo-label">CHỜ DUYỆT</div>
              <div className="tq-todo-alert">2 ĐƠN CHỜ &gt; 2 GIỜ</div>
            </div>
            <div className="tq-todo-box">
              <div className="tq-todo-num">9</div>
              <div className="tq-todo-label">CHỜ THANH TOÁN</div>
            </div>
            <div className="tq-todo-box">
              <div className="tq-todo-num">12</div>
              <div className="tq-todo-label">CHỜ ĐÓNG GÓI</div>
              <div className="tq-todo-alert">3 ĐƠN CHỜ &gt; 2 GIỜ</div>
            </div>
            <div className="tq-todo-box">
              <div className="tq-todo-num">8</div>
              <div className="tq-todo-label">CHỜ GIAO / CHỜ LẤY HÀNG</div>
            </div>
            <div className="tq-todo-box" style={{borderBottom: 'none'}}>
              <div className="tq-todo-num">17</div>
              <div className="tq-todo-label">ĐANG GIAO</div>
            </div>
            <div className="tq-todo-box" style={{borderBottom: 'none'}}>
              <div className="tq-todo-num">3</div>
              <div className="tq-todo-label">GIAO THẤT BẠI</div>
            </div>
            <div className="tq-todo-box" style={{borderBottom: 'none'}}>
              <div className="tq-todo-num">4</div>
              <div className="tq-todo-label">YÊU CẦU HỦY</div>
            </div>
            <div className="tq-todo-box" style={{borderBottom: 'none'}}>
              <div className="tq-todo-num">5</div>
              <div className="tq-todo-label">TRẢ HÀNG / HOÀN TIỀN</div>
            </div>
          </div>
          <div className="tq-priority-list" style={{borderTop: '1px solid #ddd'}}>
            <div className="tq-priority-label">CẦN ƯU TIÊN</div>
            <div className="tq-priority-row">
              <div className="tq-priority-id">RUV-1042</div>
              <div className="tq-priority-type">CHỜ DUYỆT</div>
              <div className="tq-priority-time">3 GIỜ 20 PHÚT</div>
            </div>
            <div className="tq-priority-row">
              <div className="tq-priority-id">RUV-1031</div>
              <div className="tq-priority-type">CHỜ ĐÓNG GÓI</div>
              <div className="tq-priority-time">2 GIỜ 45 PHÚT</div>
            </div>
            <div className="tq-priority-row">
              <div className="tq-priority-id">RUV-1027</div>
              <div className="tq-priority-type">GIAO THẤT BẠI</div>
              <div className="tq-priority-time">1 NGÀY</div>
            </div>
          </div>
        </div>

        <div className="tq-card tq-alert-card">
          <div className="tq-card-header">
            <h3 className="tq-card-title">CẢNH BÁO QUAN TRỌNG</h3>
          </div>
          <div className="tq-alert-list">
            <div className="tq-alert-row">
              <div>
                <div className="tq-alert-name">HẾT HÀNG</div>
                <div className="tq-alert-val">4 SKU</div>
              </div>
              <a className="tq-alert-btn" onClick={() => navigate('/kho-hang/quan-ly-phien-ban')}>XEM</a>
            </div>
            <div className="tq-alert-row">
              <div>
                <div className="tq-alert-name">DƯỚI TỒN TỐI THIỂU</div>
                <div className="tq-alert-val">11 SKU</div>
              </div>
              <a className="tq-alert-btn" onClick={() => navigate('/kho-hang/quan-ly-phien-ban')}>XEM</a>
            </div>
            <div className="tq-alert-row">
              <div>
                <div className="tq-alert-name">ĐƠN CHỜ QUÁ LÂU</div>
                <div className="tq-alert-val">5 ĐƠN</div>
              </div>
              <a className="tq-alert-btn" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}>XEM</a>
            </div>
            <div className="tq-alert-row">
              <div>
                <div className="tq-alert-name">GIAO HÀNG THẤT BẠI</div>
                <div className="tq-alert-val">3 ĐƠN</div>
              </div>
              <a className="tq-alert-btn" onClick={() => navigate('/admin/don-hang/danh-sach-don-hang')}>XEM</a>
            </div>
            <div className="tq-alert-row">
              <div>
                <div className="tq-alert-name">NỢ NHÀ CUNG CẤP</div>
                <div className="tq-alert-val">286,5 TR đ</div>
              </div>
              <a className="tq-alert-btn" onClick={() => navigate('/admin/khach-hang-doi-tac/nha-cung-cap')}>XEM</a>
            </div>
            <div className="tq-alert-row">
              <div>
                <div className="tq-alert-name">YÊU CẦU HOÀN TIỀN</div>
                <div className="tq-alert-val">4 YÊU CẦU</div>
              </div>
              <a className="tq-alert-btn" onClick={() => navigate('/admin/don-hang/khach-tra-hang')}>XEM</a>
            </div>
          </div>
        </div>
      </div>

      <div className="tq-card">
        <div className="tq-card-header" style={{display: 'block'}}>
          <h3 className="tq-card-title">KINH DOANH</h3>
          <div className="tq-sub-label" style={{marginLeft: 14, textTransform: 'none'}}>{timeFilter} - so sánh kỳ trước</div>
        </div>
        <div className="tq-business-cols">
          <div className="tq-chart-area">
            <div className="tq-chart-tabs">
              {['DOANH THU THUẦN', 'SỐ ĐƠN', 'SỐ LƯỢNG BÁN', 'LỢI NHUẬN GỘP'].map(tab => (
                <div 
                  key={tab}
                  className={`tq-chart-tab ${chartTab === tab ? 'active' : ''}`}
                  onClick={() => setChartTab(tab)}
                >
                  {tab}
                </div>
              ))}
            </div>
            <div className="tq-chart-legend">
              <div style={{display: 'flex', gap: 20}}>
                <div className="tq-legend-item"><div className="tq-legend-line-red"></div> KỲ HIỆN TẠI</div>
                <div className="tq-legend-item"><div className="tq-legend-line-dash"></div> KỲ TRƯỚC</div>
              </div>
              <div>ĐƠN VỊ: {chartTab === 'DOANH THU THUẦN' || chartTab === 'LỢI NHUẬN GỘP' ? 'TRIỆU ĐỒNG' : (chartTab === 'SỐ ĐƠN' ? 'ĐƠN' : 'SẢN PHẨM')}</div>
            </div>
            <div className="tq-mock-chart" style={{height: 250}}>
              <Line data={chartDataByTab[chartTab]} options={chartOptions} />
            </div>
          </div>
          <div className="tq-channel-area">
            <div className="tq-channel-title">CƠ CẤU KÊNH BÁN</div>
            <div className="tq-progress-bar">
              <div className="tq-progress-red" style={{width: '64%'}}>ONLINE 64%</div>
              <div className="tq-progress-black">36%</div>
            </div>
            <div className="tq-channel-stats">
              <div>
                <div className="tq-cs-label">DOANH THU ONLINE</div>
                <div className="tq-cs-val">274.240.000 đ</div>
              </div>
              <div>
                <div className="tq-cs-label">DOANH THU TẠI QUẦY</div>
                <div className="tq-cs-val">154.260.000 đ</div>
              </div>
              <div>
                <div className="tq-cs-label">SỐ ĐƠN ONLINE</div>
                <div className="tq-cs-val">119</div>
              </div>
              <div>
                <div className="tq-cs-label">SỐ ĐƠN TẠI QUẦY</div>
                <div className="tq-cs-val">67</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tq-2col">
        <div className="tq-card">
          <div className="tq-card-header">
            <h3 className="tq-card-title">SẢN PHẨM BÁN CHẠY</h3>
            <div className="tq-header-tabs">
              <span className="tq-tab-label">XẾP HẠNG THEO:</span>
              <div style={{display: 'flex'}}>
                <button 
                  className={`tq-tab-btn ${topProductsTab === 'SỐ LƯỢNG BÁN' ? 'active' : ''}`}
                  onClick={() => setTopProductsTab('SỐ LƯỢNG BÁN')}
                >
                  SỐ LƯỢNG BÁN
                </button>
                <button 
                  className={`tq-tab-btn ${topProductsTab === 'DOANH THU' ? 'active' : ''}`}
                  onClick={() => setTopProductsTab('DOANH THU')}
                >
                  DOANH THU
                </button>
              </div>
            </div>
          </div>
          <table className="tq-table">
            <thead>
              <tr>
                <th style={{width: 40}}>#</th>
                <th>SẢN PHẨM / PHIÊN BẢN</th>
                <th style={{textAlign: 'center'}}>ĐÃ BÁN</th>
                <th style={{textAlign: 'center'}}>DOANH THU</th>
                <th style={{textAlign: 'center'}}>TỒN HIỆN TẠI</th>
                <th>CẢNH BÁO</th>
              </tr>
            </thead>
            <tbody>
              {sortedTopProducts.map((product, index) => {
                const isLast = index === sortedTopProducts.length - 1;
                return (
                  <tr key={product.id}>
                    <td className="tq-rank" style={isLast ? {borderBottom: 'none'} : {}}>{index + 1}</td>
                    <td style={isLast ? {borderBottom: 'none'} : {}}>
                      <div className="tq-prod-name">{product.name}</div>
                      <div className="tq-prod-var">{product.variant}</div>
                    </td>
                    <td style={{textAlign: 'center', fontWeight: 800, ...(isLast ? {borderBottom: 'none'} : {})}}>{product.sold}</td>
                    <td style={{textAlign: 'center', fontWeight: 800, ...(isLast ? {borderBottom: 'none'} : {})}}>{product.revenueStr}</td>
                    <td style={{textAlign: 'center', fontWeight: 800, ...(isLast ? {borderBottom: 'none'} : {})}}>{product.stock}</td>
                    <td style={{color: product.statusColor, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', textAlign: 'right', ...(isLast ? {borderBottom: 'none'} : {})}}>{product.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="tq-card">
          <div className="tq-card-header">
            <h3 className="tq-card-title">TỒN KHO & CẢNH BÁO</h3>
            <a className="tq-card-header-link" onClick={() => navigate('/kho-hang/quan-ly-phien-ban')}>XEM CHI TIẾT →</a>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '15px 20px', gap: '20px 0', borderBottom: '1px solid #ddd'}}>
            <div>
              <div className="tq-sub-label">TỔNG SỐ LƯỢNG TỒN</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>1.842</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>HIỆN TẠI</div>
            </div>
            <div>
              <div className="tq-sub-label">CÓ THỂ BÁN</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>1.694</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>HIỆN TẠI</div>
            </div>
            <div>
              <div className="tq-sub-label">HẾT HÀNG</div>
              <div className="tq-sub-val tq-text-red" style={{fontSize: 16}}>4 SKU</div>
            </div>
            <div>
              <div className="tq-sub-label">DƯỚI MỨC TỒN TỐI THIỂU</div>
              <div className="tq-sub-val tq-text-red" style={{fontSize: 16}}>11 SKU</div>
            </div>
            <div>
              <div className="tq-sub-label">GIÁ TRỊ TỒN KHO THEO GIÁ VỐN</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>3.286.400.000 đ</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>MẶT KHO HÀNG</div>
            </div>
            <div>
              <div className="tq-sub-label">SẢN PHẨM ĐANG KINH DOANH</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>286</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>HIỆN TẠI</div>
            </div>
            <div>
              <div className="tq-sub-label">SỐ PHIÊN BẢN</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>742</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>HIỆN TẠI</div>
            </div>
            <div>
              <div className="tq-sub-label">SỐ LƯỢNG ĐÃ BÁN TRONG KỲ</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>342</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>TRONG KỲ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tq-2col-equal">
        <div className="tq-card">
          <div className="tq-card-header" style={{borderBottom: '1px solid #ddd'}}>
            <h3 className="tq-card-title">CẢNH BÁO TỒN KHO</h3>
          </div>
          <table className="tq-table" style={{marginBottom: 10}}>
            <thead>
              <tr>
                <th>SẢN PHẨM / PHIÊN BẢN</th>
                <th style={{textAlign: 'center'}}>TỒN THỰC TẾ</th>
                <th style={{textAlign: 'center'}}>CÓ THỂ BÁN</th>
                <th style={{textAlign: 'center'}}>MỨC TỐI THIỂU</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding: '10px 15px'}}><div className="tq-prod-name">ASUS ROG STRIX RTX 4090</div><div className="tq-prod-var">OC 24GB</div></td>
                <td style={{textAlign: 'center', fontWeight: 800}}>2</td>
                <td style={{textAlign: 'center', fontWeight: 800}}>1</td>
                <td style={{textAlign: 'center', fontWeight: 800}}>4</td>
                <td style={{color: '#E31E24', fontWeight: 800, fontSize: 9, textTransform: 'uppercase', textAlign: 'right'}}>DƯỚI MỨC TỒN TỐI THIỂU</td>
              </tr>
              <tr>
                <td style={{padding: '10px 15px'}}><div className="tq-prod-name">Corsair H150i Elite LCD</div><div className="tq-prod-var">360mm</div></td>
                <td style={{textAlign: 'center', fontWeight: 800}}>0</td>
                <td style={{textAlign: 'center', fontWeight: 800}}>0</td>
                <td style={{textAlign: 'center', fontWeight: 800}}>3</td>
                <td style={{color: '#E31E24', fontWeight: 800, fontSize: 9, textTransform: 'uppercase', textAlign: 'right'}}>HẾT HÀNG</td>
              </tr>
              <tr>
                <td style={{padding: '10px 15px', borderBottom: 'none'}}><div className="tq-prod-name">EVGA SuperNOVA G6</div><div className="tq-prod-var">1000W</div></td>
                <td style={{textAlign: 'center', fontWeight: 800, borderBottom: 'none'}}>3</td>
                <td style={{textAlign: 'center', fontWeight: 800, borderBottom: 'none'}}>2</td>
                <td style={{textAlign: 'center', fontWeight: 800, borderBottom: 'none'}}>5</td>
                <td style={{color: '#E31E24', fontWeight: 800, fontSize: 9, textTransform: 'uppercase', textAlign: 'right', borderBottom: 'none'}}>DƯỚI MỨC TỒN TỐI THIỂU</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="tq-card">
          <div className="tq-card-header" style={{borderBottom: '1px solid #ddd'}}>
            <h3 className="tq-card-title">TỒN LÂU / CHƯA PHÁT SINH BÁN</h3>
          </div>
          <table className="tq-table">
            <thead>
              <tr>
                <th>SẢN PHẨM / PHIÊN BẢN</th>
                <th style={{textAlign: 'center'}}>TỒN HIỆN TẠI</th>
                <th style={{textAlign: 'center'}}>LẦN BÁN GẦN NHẤT</th>
                <th>SỐ NGÀY KHÔNG BÁN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding: '10px 15px'}}><div className="tq-prod-name">Lian Li O11D EVO</div><div className="tq-prod-var">Trắng</div></td>
                <td style={{textAlign: 'center', fontWeight: 800}}>11</td>
                <td style={{textAlign: 'center', fontWeight: 800, color: '#666'}}>18/02/2026</td>
                <td style={{color: '#E31E24', fontWeight: 800, fontSize: 11, textAlign: 'right'}}>28 NGÀY</td>
              </tr>
              <tr>
                <td style={{padding: '10px 15px'}}><div className="tq-prod-name">Noctua NH-D15</div><div className="tq-prod-var">Chromax Black</div></td>
                <td style={{textAlign: 'center', fontWeight: 800}}>8</td>
                <td style={{textAlign: 'center', fontWeight: 800, color: '#666'}}>25/02/2026</td>
                <td style={{color: '#E31E24', fontWeight: 800, fontSize: 11, textAlign: 'right'}}>21 NGÀY</td>
              </tr>
              <tr>
                <td style={{padding: '10px 15px', borderBottom: 'none'}}><div className="tq-prod-name">ASUS ROG Thor</div><div className="tq-prod-var">1200W Platinum</div></td>
                <td style={{textAlign: 'center', fontWeight: 800, borderBottom: 'none'}}>5</td>
                <td style={{textAlign: 'center', fontWeight: 800, color: '#666', borderBottom: 'none'}}>01/03/2026</td>
                <td style={{color: '#E31E24', fontWeight: 800, fontSize: 11, textAlign: 'right', borderBottom: 'none'}}>17 NGÀY</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="tq-bottom-grid">
        <div className="tq-b-card">
          <div className="tq-card-header" style={{padding: '0 0 15px 0'}}>
            <h3 className="tq-card-title">NHẬP HÀNG & NHÀ CUNG CẤP</h3>
            <a className="tq-card-header-link" onClick={() => navigate('/kho-hang/nhap-hang')}>XEM CHI TIẾT →</a>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, paddingTop: 15}}>
            <div>
              <div className="tq-sub-label">ĐƠN NHẬP CHỜ DUYỆT</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>6</div>
            </div>
            <div>
              <div className="tq-sub-label">CHỜ NHẬP KHO</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>4</div>
            </div>
            <div>
              <div className="tq-sub-label">NHẬP CHƯA ĐỦ</div>
              <div className="tq-sub-val tq-text-red" style={{fontSize: 16}}>3</div>
            </div>
            <div>
              <div className="tq-sub-label">CÒN PHẢI TRẢ NCC</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>286.500.000 đ</div>
            </div>
          </div>
        </div>

        <div className="tq-b-card">
          <div className="tq-card-header" style={{padding: '0 0 15px 0'}}>
            <h3 className="tq-card-title">KHÁCH HÀNG</h3>
            <a className="tq-card-header-link" onClick={() => navigate('/admin/khach-hang-doi-tac/khach-hang')}>XEM CHI TIẾT →</a>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, paddingTop: 15}}>
            <div>
              <div className="tq-sub-label">TỔNG KHÁCH HÀNG</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>3.842</div>
            </div>
            <div>
              <div className="tq-sub-label">KHÁCH MỚI TRONG KỲ</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>126</div>
            </div>
            <div>
              <div className="tq-sub-label">CÓ MUA HÀNG TRONG KỲ</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>164</div>
            </div>
            <div>
              <div className="tq-sub-label">KHÁCH QUAY LẠI</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>58</div>
            </div>
            <div style={{gridColumn: '1 / span 2', borderTop: '1px solid #eee', paddingTop: 10}}>
              <div className="tq-sub-label">KHÁCH HÀNG GIÁ TRỊ CAO NHẤT</div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div className="tq-sub-val">NGUYỄN VĂN AN</div>
                <div style={{fontSize: 10, fontWeight: 800}}>86.500.000 đ - 6 ĐƠN</div>
              </div>
            </div>
          </div>
        </div>

        <div className="tq-b-card">
          <div className="tq-card-header" style={{padding: '0 0 15px 0'}}>
            <h3 className="tq-card-title">NHÂN VIÊN</h3>
            <a className="tq-card-header-link" onClick={() => navigate('/admin/nhan-vien/danh-sach')}>XEM CHI TIẾT →</a>
          </div>
          <div style={{paddingTop: 15}}>
            <div className="tq-sub-label">NHÂN VIÊN ĐANG LÀM VIỆC</div>
            <div className="tq-sub-val" style={{fontSize: 24}}>12</div>
            <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 5}}>TÀI KHOẢN HOẠT ĐỘNG - HIỆN TẠI</div>
          </div>
        </div>

        <div className="tq-b-card" style={{gridColumn: '1 / span 2', padding: 0, overflow: 'hidden'}}>
          <div className="tq-card-header">
            <h3 className="tq-card-title">SỔ QUỸ & THANH TOÁN</h3>
            <a className="tq-card-header-link" onClick={() => navigate('/admin/so-quy-tien-mat/tong-quan')}>XEM CHI TIẾT →</a>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '15px 0', borderBottom: '1px solid #eee'}}>
            <div style={{padding: '0 20px', borderRight: '1px solid #eee'}}>
              <div className="tq-sub-label">SỐ DƯ QUỸ</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>847.250.000 đ</div>
              <div className="tq-sub-label" style={{textTransform: 'none', marginTop: 3}}>HIỆN TẠI</div>
            </div>
            <div style={{padding: '0 20px', borderRight: '1px solid #eee'}}>
              <div className="tq-sub-label">TỔNG THU TRONG KỲ</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>397.800.000 đ</div>
            </div>
            <div style={{padding: '0 20px', borderRight: '1px solid #eee'}}>
              <div className="tq-sub-label">TỔNG CHI TRONG KỲ</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>241.600.000 đ</div>
            </div>
            <div style={{padding: '0 20px'}}>
              <div className="tq-sub-label">CHÊNH LỆCH THU - CHI</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>156.200.000 đ</div>
            </div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '15px 0', borderBottom: '1px solid #eee'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', borderRight: '1px solid #eee'}}>
              <span className="tq-sub-label">TIỀN MẶT</span>
              <span className="tq-sub-val">128.400.000 đ</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px'}}>
              <span className="tq-sub-label">CHUYỂN KHOẢN</span>
              <span className="tq-sub-val">269.400.000 đ</span>
            </div>
          </div>
          <div style={{padding: '20px', height: 120}}>
             <MockBarChart />
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f5f5f5', padding: '15px 0'}}>
            <div style={{padding: '0 20px', borderRight: '1px solid #ddd'}}>
               <div className="tq-sub-label" style={{color: '#111', fontWeight: 900}}>CHƯA THU TỪ ĐƠN HÀNG</div>
               <div className="tq-sub-val" style={{fontSize: 16}}>74.200.000 đ</div>
            </div>
            <div style={{padding: '0 20px'}}>
               <div className="tq-sub-label" style={{color: '#111', fontWeight: 900}}>COD CHỜ ĐỐI SOÁT</div>
               <div className="tq-sub-val" style={{fontSize: 16}}>51.800.000 đ</div>
            </div>
          </div>
        </div>

        <div className="tq-b-card">
          <div className="tq-card-header" style={{padding: '0 0 15px 0'}}>
            <h3 className="tq-card-title">BẢO HÀNH & TRẢ HÀNG</h3>
          </div>
          <div style={{paddingTop: 15}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
              <span className="tq-sub-label">CHỜ TIẾP NHẬN</span>
              <span className="tq-sub-val">5</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
              <span className="tq-sub-label">ĐANG XỬ LÝ</span>
              <span className="tq-sub-val">12</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 15}}>
              <span className="tq-sub-label">HOÀN TẤT</span>
              <span className="tq-sub-val">38</span>
            </div>
            <div style={{borderTop: '1px solid #eee', paddingTop: 15}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                <span className="tq-sub-label">YÊU CẦU TRẢ HÀNG</span>
                <span className="tq-sub-val">5</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                <span className="tq-sub-label">CHỜ NHẬN HÀNG TRẢ</span>
                <span className="tq-sub-val">3</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span className="tq-sub-label">CHỜ HOÀN TIỀN</span>
                <span className="tq-sub-val">4</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tq-b-card" style={{display: 'flex', flexDirection: 'column'}}>
          <div className="tq-card-header" style={{padding: '0 0 15px 0'}}>
            <h3 className="tq-card-title">KHUYẾN MẠI</h3>
            <a className="tq-card-header-link" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>XEM CHI TIẾT →</a>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, paddingTop: 15, flex: 1}}>
            <div>
              <div className="tq-sub-label">ĐANG ÁP DỤNG</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>8</div>
            </div>
            <div>
              <div className="tq-sub-label">SẮP BẮT ĐẦU</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>3</div>
            </div>
            <div>
              <div className="tq-sub-label">SẮP KẾT THÚC</div>
              <div className="tq-sub-val tq-text-red" style={{fontSize: 16}}>2</div>
            </div>
            <div>
              <div className="tq-sub-label">ĐƠN SỬ DỤNG KM</div>
              <div className="tq-sub-val" style={{fontSize: 16}}>64</div>
            </div>
          </div>
          <div style={{background: '#000', color: '#fff', padding: '15px 20px', margin: '0 -20px -15px -20px'}}>
            <div className="tq-sub-label" style={{color: '#aaa'}}>TỔNG GIÁ TRỊ GIẢM GIÁ</div>
            <div className="tq-sub-val" style={{color: '#fff', fontSize: 18}}>25.700.000 đ</div>
          </div>
        </div>
      </div>

      <div className="tq-quick-access">
        <h3 className="tq-qa-title">TRUY CẬP NHANH</h3>
        <div className="tq-qa-links">
          <a className="tq-qa-link" onClick={() => navigate('/admin/don-hang/tao-don-hang')}>TẠO ĐƠN ONLINE</a>
          <a className="tq-qa-link" onClick={() => navigate('/kho-hang/nhap-hang/tao-moi')}>TẠO ĐƠN NHẬP</a>
          <a className="tq-qa-link" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-thu')}>TẠO PHIẾU THU</a>
          <a className="tq-qa-link" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-chi')}>TẠO PHIẾU CHI</a>
        </div>
      </div>

    </div>
  );
};

export default TongQuat;
