import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './SoQuy.css';

export default function SoQuy() {
    const navigate = useNavigate();
    const { cashbookList = [] } = useCashbook() || {};

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterType, setFilterType] = useState('Tất cả');
    const [filterMethod, setFilterMethod] = useState('Tất cả');
    const [searchPerson, setSearchPerson] = useState('');
    const [filterStaff, setFilterStaff] = useState('Tất cả');

    const initialBalance = 125000000;

    const hasActiveFilter = Boolean(
        fromDate ||
        toDate ||
        (filterType && filterType !== 'Tất cả') ||
        (filterMethod && filterMethod !== 'Tất cả') ||
        searchPerson.trim() !== '' ||
        (filterStaff && filterStaff !== 'Tất cả')
    );

    const handleClearFilters = () => {
        setFromDate('');
        setToDate('');
        setFilterType('Tất cả');
        setFilterMethod('Tất cả');
        setSearchPerson('');
        setFilterStaff('Tất cả');
    };

    const filteredData = useMemo(() => {
        return cashbookList.filter(item => {
            if (fromDate && item.date < fromDate) return false;
            if (toDate && item.date > toDate) return false;

            if (filterType && filterType !== 'Tất cả') {
                if (item.type.toLowerCase() !== filterType.toLowerCase()) return false;
            }

            if (filterMethod && filterMethod !== 'Tất cả') {
                if (item.method.toLowerCase() !== filterMethod.toLowerCase()) return false;
            }

            if (searchPerson.trim()) {
                const query = searchPerson.toLowerCase().trim();
                const personMatch = item.person.toLowerCase().includes(query);
                const codeMatch = item.code.toLowerCase().includes(query);
                if (!personMatch && !codeMatch) return false;
            }

            if (filterStaff && filterStaff !== 'Tất cả') {
                if (item.staff && item.staff.toLowerCase() !== filterStaff.toLowerCase()) return false;
            }

            return true;
        });
    }, [cashbookList, fromDate, toDate, filterType, filterMethod, searchPerson, filterStaff]);

    const totalThu = useMemo(() => {
        return filteredData.reduce((acc, row) => acc + (row.amountIn || 0), 0);
    }, [filteredData]);

    const totalChi = useMemo(() => {
        return filteredData.reduce((acc, row) => acc + (row.amountOut || 0), 0);
    }, [filteredData]);

    const tonCuoiKy = initialBalance + totalThu - totalChi;

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-';
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const getMethodStyle = (method) => {
        switch (method) {
            case 'TIỀN MẶT': return 'method-badge method-cash';
            case 'CHUYỂN KHOẢN': return 'method-badge method-transfer';
            case 'QUẸT THẺ': return 'method-badge method-card';
            default: return 'method-badge';
        }
    };

    return (
        <div className="sq-page">
            <div className="sq-header">
                <div className="sq-breadcrumb">ADMIN <span>&rsaquo;</span> SỔ QUỸ</div>
                <button className="cb-btn-primary bg-red" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-thu-chi')}>
                    + TẠO PHIẾU THU / CHI
                </button>

            </div>

            <div className="cb-filter-bar">
                <div className="cb-filter-item">
                    <label>TỪ NGÀY</label>
                    <input
                        type="date"
                        value={fromDate}
                        className={fromDate ? 'active-filter' : ''}
                        onChange={e => setFromDate(e.target.value)}
                    />
                </div>
                <div className="cb-filter-item">
                    <label>ĐẾN NGÀY</label>
                    <input
                        type="date"
                        value={toDate}
                        className={toDate ? 'active-filter' : ''}
                        onChange={e => setToDate(e.target.value)}
                    />
                </div>
                <div className="cb-filter-item">
                    <label>LOẠI PHIẾU</label>
                    <select
                        value={filterType}
                        className={filterType !== 'Tất cả' ? 'active-filter' : ''}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="Tất cả">Tất cả</option>
                        <option value="Phiếu thu">Phiếu thu</option>
                        <option value="Phiếu chi">Phiếu chi</option>
                    </select>
                </div>
                <div className="cb-filter-item">
                    <label>PHƯƠNG THỨC</label>
                    <select
                        value={filterMethod}
                        className={filterMethod !== 'Tất cả' ? 'active-filter' : ''}
                        onChange={e => setFilterMethod(e.target.value)}
                    >
                        <option value="Tất cả">Tất cả</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                        <option value="Chuyển khoản">Chuyển khoản</option>
                    </select>
                </div>
                <div className="cb-filter-item">
                    <label>NGƯỜI NỘP / NHẬN</label>
                    <input
                        type="text"
                        placeholder="Tên khách / đơn vị..."
                        value={searchPerson}
                        className={searchPerson.trim() ? 'active-filter' : ''}
                        onChange={e => setSearchPerson(e.target.value)}
                    />
                </div>
                <div className="cb-filter-item">
                    <label>NHÂN VIÊN</label>
                    <select
                        value={filterStaff}
                        className={filterStaff !== 'Tất cả' ? 'active-filter' : ''}
                        onChange={e => setFilterStaff(e.target.value)}
                    >
                        <option value="Tất cả">Tất cả</option>
                        <option value="Trần Thị B">Trần Thị B</option>
                    </select>
                </div>
                <div className="cb-filter-actions">
                    {hasActiveFilter && (
                        <button className="cb-btn-outline icon-btn btn-clear-filter" onClick={handleClearFilters}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            XÓA BỘ LỌC
                        </button>
                    )}
                    <button className="cb-btn-outline icon-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                            <line x1="18" y1="20" x2="18" y2="10"/>
                            <line x1="12" y1="20" x2="12" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                        XEM BÁO CÁO
                    </button>
                    <button className="cb-btn-dark icon-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        XUẤT FILE EXCEL
                    </button>
                </div>
            </div>

            <div className="sq-stats-row">
                <div className="sq-stat-box">
                    <div className="icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="12" rx="1" />
                            <line x1="8" y1="20" x2="16" y2="20" />
                            <line x1="12" y1="16" x2="12" y2="20" />
                        </svg>
                    </div>
                    <div className="info">
                        <label>SỐ DƯ ĐẦU KỲ</label>
                        <div className="val">{formatMoney(initialBalance)}</div>
                    </div>
                </div>
                <div className="sq-stat-box">
                    <div className="icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                        </svg>
                    </div>
                    <div className="info">
                        <label>TỔNG THU</label>
                        <div className="val text-green">+{formatMoney(totalThu)}</div>
                    </div>
                </div>
                <div className="sq-stat-box">
                    <div className="icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <polyline points="19 12 12 19 5 12" />
                        </svg>
                    </div>
                    <div className="info">
                        <label>TỔNG CHI</label>
                        <div className="val text-red">-{formatMoney(totalChi)}</div>
                    </div>
                </div>
                <div className="sq-stat-box bg-dark">
                    <div className="icon icon-red-dollar">$</div>
                    <div className="info">
                        <label>TỒN CUỐI KỲ</label>
                        <div className="val text-red">{formatMoney(tonCuoiKy)}</div>
                    </div>
                </div>
            </div>

            <div className="sq-subtext-row">
                <span>(i) Tồn cuối kỳ = Số dư đầu kỳ + Tổng thu - Tổng chi - Số liệu đang lọc theo điều kiện đã chọn</span>
                <span className="count-badge">{filteredData.length}/{cashbookList.length} phiếu</span>
            </div>

            <div className="sq-table-container">
                <table className="promo-table sq-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>LOẠI PHIẾU</th>
                            <th>NGÀY GHI NHẬN</th>
                            <th>MÃ PHIẾU</th>
                            <th>NGƯỜI NỘP / NHẬN</th>
                            <th>PHƯƠNG THỨC THANH TOÁN</th>
                            <th>TIỀN THU</th>
                            <th>TIỀN CHI</th>
                            <th>MÔ TẢ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((row, index) => (
                                <tr key={row.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <span className={`type-badge ${row.type === 'PHIẾU THU' ? 'type-thu' : 'type-chi'}`}>
                                            {row.type}
                                        </span>
                                    </td>
                                    <td>{row.date}</td>
                                    <td><strong>{row.code}</strong></td>
                                    <td>{row.person}</td>
                                    <td>
                                        <span className={getMethodStyle(row.method)}>{row.method}</span>
                                    </td>
                                    <td>
                                        {row.amountIn > 0 ? <strong className="text-green">+{formatMoney(row.amountIn)}</strong> : '-'}
                                    </td>
                                    <td>
                                        {row.amountOut > 0 ? <strong className="text-red">-{formatMoney(row.amountOut)}</strong> : '-'}
                                    </td>
                                    <td className="text-muted">{row.desc}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#858c95', fontWeight: 600 }}>
                                    Không tìm thấy phiếu nào phù hợp với bộ lọc đã chọn
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="6" style={{textAlign: 'left'}}>
                                <strong>TỔNG ({filteredData.length} PHIẾU)</strong>
                            </td>
                            <td><strong className="text-green">+{formatMoney(totalThu)}</strong></td>
                            <td><strong className="text-red">-{formatMoney(totalChi)}</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

