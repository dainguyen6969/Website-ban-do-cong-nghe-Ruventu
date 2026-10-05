import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TongQuanQuy.css';
import WebGL2LineChart from '../components/WebGL2LineChart';

export default function TongQuanQuy() {
    const navigate = useNavigate();

    // Top Filter States
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterType, setFilterType] = useState('TẤT CẢ');
    const [filterMethod, setFilterMethod] = useState('TẤT CẢ');
    const [searchPerson, setSearchPerson] = useState('');
    const [filterGroup, setFilterGroup] = useState('TẤT CẢ NHÓM');

    // Applied Filters State (updates when user clicks "ÁP DỤNG")
    const [appliedFilters, setAppliedFilters] = useState({
        fromDate: '',
        toDate: '',
        filterType: 'TẤT CẢ',
        filterMethod: 'TẤT CẢ',
        searchPerson: '',
        filterGroup: 'TẤT CẢ NHÓM',
    });

    // Time Mode State: 'THEO NGÀY' | 'THEO TUẦN' | 'THEO THÁNG'
    const [timeMode, setTimeMode] = useState('THEO NGÀY');

    // Baseline Data according to Time Mode
    const baseChartData = useMemo(() => {
        if (timeMode === 'THEO TUẦN') {
            return {
                labels: ['Tuần 1 (01-07)', 'Tuần 2 (08-14)', 'Tuần 3 (15-21)', 'Tuần 4 (22-30)'],
                thu: [22, 15, 10, 19],
                chi: [48, 5, 2, 8.8],
            };
        } else if (timeMode === 'THEO THÁNG') {
            return {
                labels: ['Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9'],
                thu: [120, 145, 110, 160, 66],
                chi: [90, 130, 105, 140, 63.8],
            };
        }
        // Default: 'THEO NGÀY'
        return {
            labels: ['01/09', '05/09', '10/09', '15/09', '20/09', '25/09', '30/09'],
            thu: [12, 10, 5, 2, 8, 4, 15],
            chi: [0, 48, 0, 5, 2, 0, 8],
        };
    }, [timeMode]);

    // Compute Filtered Datasets based on appliedFilters
    const filteredChart = useMemo(() => {
        let thu = [...baseChartData.thu];
        let chi = [...baseChartData.chi];
        let labels = [...baseChartData.labels];

        // Filter Type (THU vs CHI)
        if (appliedFilters.filterType === 'THU') {
            chi = chi.map(() => 0);
        } else if (appliedFilters.filterType === 'CHI') {
            thu = thu.map(() => 0);
        }

        // Filter Method (TIỀN MẶT vs CHUYỂN KHOẢN)
        if (appliedFilters.filterMethod === 'TIỀN MẶT') {
            thu = thu.map(v => Number((v * 0.7).toFixed(1)));
            chi = chi.map(v => Number((v * 0.6).toFixed(1)));
        } else if (appliedFilters.filterMethod === 'CHUYỂN KHOẢN') {
            thu = thu.map(v => Number((v * 0.3).toFixed(1)));
            chi = chi.map(v => Number((v * 0.4).toFixed(1)));
        }

        // Search Person / Object Group adjustment multiplier
        if (appliedFilters.searchPerson.trim() !== '') {
            thu = thu.map(v => Number((v * 0.4).toFixed(1)));
            chi = chi.map(v => Number((v * 0.3).toFixed(1)));
        }

        if (appliedFilters.filterGroup !== 'TẤT CẢ NHÓM') {
            thu = thu.map(v => Number((v * 0.8).toFixed(1)));
            chi = chi.map(v => Number((v * 0.85).toFixed(1)));
        }

        // Format datasets for WebGL2 chart
        const datasets = [];
        if (appliedFilters.filterType !== 'CHI') {
            datasets.push({
                label: 'TỔNG THU',
                data: thu,
                color: [0.07, 0.07, 0.07, 1.0], // Dark #111
                dashed: false,
            });
        }
        if (appliedFilters.filterType !== 'THU') {
            datasets.push({
                label: 'TỔNG CHI',
                data: chi,
                color: [0.86, 0.15, 0.15, 1.0], // Red #dc2626
                dashed: true,
            });
        }

        // Calculate Totals for Stats Cards (in Million VNĐ)
        const totalThuM = thu.reduce((a, b) => a + b, 0);
        const totalChiM = chi.reduce((a, b) => a + b, 0);
        const dauKyM = 5.0; // 5.000.000đ baseline
        const tonQuyM = dauKyM + totalThuM - totalChiM;

        return {
            labels,
            datasets,
            stats: {
                dauKy: (dauKyM * 1000000).toLocaleString('vi-VN') + 'đ',
                totalThu: (totalThuM * 1000000).toLocaleString('vi-VN') + 'đ',
                totalChi: (totalChiM * 1000000).toLocaleString('vi-VN') + 'đ',
                tonQuy: (tonQuyM * 1000000).toLocaleString('vi-VN') + 'đ',
                isNegative: tonQuyM < 0
            }
        };
    }, [baseChartData, appliedFilters]);

    // Apply Filters Click Handler
    const handleApplyFilters = () => {
        setAppliedFilters({
            fromDate,
            toDate,
            filterType,
            filterMethod,
            searchPerson,
            filterGroup,
        });
    };

    // Clear Filters Click Handler (Resets filters AND switches timeMode back to 'THEO NGÀY')
    const handleClearFilters = () => {
        setFromDate('');
        setToDate('');
        setFilterType('TẤT CẢ');
        setFilterMethod('TẤT CẢ');
        setSearchPerson('');
        setFilterGroup('TẤT CẢ NHÓM');

        setAppliedFilters({
            fromDate: '',
            toDate: '',
            filterType: 'TẤT CẢ',
            filterMethod: 'TẤT CẢ',
            searchPerson: '',
            filterGroup: 'TẤT CẢ NHÓM',
        });

        // Default to 'THEO NGÀY' on filter clear
        setTimeMode('THEO NGÀY');
    };

    return (
        <div className="cashbook-page">
            <div className="cb-header">
                <div className="cb-title-area">
                    <div className="cb-breadcrumb">SỔ QUỸ TIỀN MẶT / TỔNG QUAN</div>
                    <h1>TỔNG QUAN QUỸ</h1>
                    <p>THEO DÕI NHANH TÌNH HÌNH THU CHI VÀ TỒN QUỸ CỦA HÀNG</p>
                </div>
                <button className="cb-btn-secondary" onClick={() => navigate('/admin/so-quy-tien-mat/so-quy')}>
                    XEM SỔ QUỸ &rarr;
                </button>
            </div>

            {/* Top Filter Bar */}
            <div className="cb-filter-bar">
                <div className="cb-filter-item">
                    <label>TỪ NGÀY</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div className="cb-filter-item">
                    <label>ĐẾN NGÀY</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
                <div className="cb-filter-item">
                    <label>LOẠI PHIẾU</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="TẤT CẢ">TẤT CẢ</option>
                        <option value="THU">PHIẾU THU</option>
                        <option value="CHI">PHIẾU CHI</option>
                    </select>
                </div>
                <div className="cb-filter-item">
                    <label>PHƯƠNG THỨC</label>
                    <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                        <option value="TẤT CẢ">TẤT CẢ</option>
                        <option value="TIỀN MẶT">TIỀN MẶT</option>
                        <option value="CHUYỂN KHOẢN">CHUYỂN KHOẢN</option>
                    </select>
                </div>
                <div className="cb-filter-item">
                    <label>NGƯỜI NỘP / NHẬN</label>
                    <input type="text" placeholder="TÌM TÊN..." value={searchPerson} onChange={e => setSearchPerson(e.target.value)} />
                </div>
                <div className="cb-filter-item">
                    <label>NHÓM ĐỐI TƯỢNG</label>
                    <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                        <option value="TẤT CẢ NHÓM">TẤT CẢ NHÓM</option>
                        <option value="KHÁCH HÀNG">KHÁCH HÀNG</option>
                        <option value="NHÂN VIÊN">NHÂN VIÊN</option>
                        <option value="NHÀ CUNG CẤP">NHÀ CUNG CẤP</option>
                    </select>
                </div>
                <div className="cb-filter-actions">
                    <button className="cb-btn-outline" onClick={handleClearFilters}>XÓA BỘ LỌC</button>
                    <button className="cb-btn-primary" onClick={handleApplyFilters}>ÁP DỤNG</button>
                </div>
            </div>

            {/* Summary Stat Boxes */}
            <div className="cb-stats-row">
                <div className="cb-stat-box">
                    <label>SỐ DƯ ĐẦU KỲ</label>
                    <div className="val">{filteredChart.stats.dauKy}</div>
                </div>
                <div className="cb-stat-box">
                    <label>TỔNG THU</label>
                    <div className="val text-green">{filteredChart.stats.totalThu}</div>
                </div>
                <div className="cb-stat-box">
                    <label>TỔNG CHI</label>
                    <div className="val text-red">{filteredChart.stats.totalChi}</div>
                </div>
                <div className="cb-stat-box bg-dark">
                    <label>TỒN QUỸ</label>
                    <div className={`val ${filteredChart.stats.isNegative ? 'text-red' : 'text-green'}`}>
                        {filteredChart.stats.tonQuy}
                    </div>
                    {filteredChart.stats.isNegative && <span className="sub">TỒN QUỸ ÂM</span>}
                </div>
            </div>

            {/* Calculation Formula Row */}
            <div className="cb-calculation-row">
                {filteredChart.stats.dauKy} <span>+</span> {filteredChart.stats.totalThu} <span>-</span> {filteredChart.stats.totalChi} <span>=</span> <strong className={filteredChart.stats.isNegative ? 'text-red' : 'text-green'}>{filteredChart.stats.tonQuy}</strong>
            </div>

            {/* WebGL2 Cash Flow Line Chart Container */}
            <div className="cb-chart-container">
                <div className="cb-chart-header">
                    <div className="cb-chart-title">
                        <h2>DÒNG TIỀN THEO THỜI GIAN</h2>
                        <p>SO SÁNH TIỀN THU VÀ TIỀN CHI TRONG PHẠM VI ĐANG XEM ({timeMode})</p>
                    </div>
                    <div className="cb-chart-tabs">
                        <button
                            className={timeMode === 'THEO NGÀY' ? 'active' : ''}
                            onClick={() => setTimeMode('THEO NGÀY')}
                        >
                            THEO NGÀY
                        </button>
                        <button
                            className={timeMode === 'THEO TUẦN' ? 'active' : ''}
                            onClick={() => setTimeMode('THEO TUẦN')}
                        >
                            THEO TUẦN
                        </button>
                        <button
                            className={timeMode === 'THEO THÁNG' ? 'active' : ''}
                            onClick={() => setTimeMode('THEO THÁNG')}
                        >
                            THEO THÁNG
                        </button>
                    </div>
                </div>
                <div className="cb-chart-body">
                    <WebGL2LineChart
                        labels={filteredChart.labels}
                        datasets={filteredChart.datasets}
                        title="DÒNG TIỀN THEO THỜI GIAN"
                    />
                </div>
            </div>
        </div>
    );
}
