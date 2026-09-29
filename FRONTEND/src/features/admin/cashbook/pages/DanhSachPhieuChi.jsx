import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './DanhSachPhieuThu.css'; // Reuse CSS

const mockDataFallback = [
    { id: 1, code: 'PC0002005', person: 'Nguyễn Thị Lan', role: 'NHÂN VIÊN', group: 'NHÂN VIÊN', typeCode: 'LPC004', typeName: 'Chi lương nhân viên', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 12000000, date: '16/09/2026 09:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 2, code: 'PC0002004', person: 'GHN Express', role: 'ĐỐI TÁC GIAO HÀNG', group: 'ĐỐI TÁC GIAO HÀNG', typeCode: 'LPC003', typeName: 'Chi phí vận chuyển', method: 'CHUYỂN KHOẢN', creator: 'Nguyễn Thị Lan', amount: 1250000, date: '15/09/2026 08:00', source: 'THỦ CÔNG', status: 'ĐÃ HỦY' },
    { id: 3, code: 'PC0002001', person: 'Trần Văn Bình', role: 'NHÂN VIÊN', group: 'NHÂN VIÊN', typeCode: 'LPC015', typeName: 'Chi tạm ứng nhân viên', method: 'TIỀN MẶT', creator: 'Trần Minh Quân', amount: 500000, date: '14/09/2026 09:00', source: 'THỦ CÔNG', status: 'ĐÃ GHI NHẬN' },
    { id: 4, code: 'PC0002003', person: 'Hoàng Minh Khoa', role: 'KHÁCH HÀNG', group: 'KHÁCH HÀNG', typeCode: 'LPC002', typeName: 'Chi hoàn tiền khách hàng', method: 'CHUYỂN KHOẢN', creator: 'HỆ THỐNG', amount: 2800000, date: '13/09/2026 10:30', source: 'TỰ ĐỘNG', status: 'ĐÃ GHI NHẬN' },
    { id: 5, code: 'PC0002002', person: 'ASUS Vietnam Co.', role: 'NHÀ CUNG CẤP', group: 'NHÀ CUNG CẤP', typeCode: 'LPC001', typeName: 'Chi nhập hàng', method: 'CHUYỂN KHOẢN', creator: 'HỆ THỐNG', amount: 48500000, date: '12/09/2026 14:00', source: 'TỰ ĐỘNG', status: 'ĐÃ GHI NHẬN' }
];

export default function DanhSachPhieuChi() {
    const navigate = useNavigate();
    const location = useLocation();
    const { phieuChiList } = useCashbook();
    const dataToUse = phieuChiList && phieuChiList.length > 0 ? phieuChiList : mockDataFallback;

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('TẤT CẢ TRẠNG THÁI');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(true);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        if (location.state?.successMessage) {
            setToastMessage(location.state.successMessage);
            window.history.replaceState({}, document.title);
            setTimeout(() => setToastMessage(''), 3000);
        }
    }, [location]);

    const formatMoney = (amount) => {
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const filteredData = dataToUse.filter(item => {
        if (searchQuery && !item.code.toLowerCase().includes(searchQuery.toLowerCase()) && !item.person.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterStatus !== 'TẤT CẢ TRẠNG THÁI' && item.status !== filterStatus) return false;
        return true;
    });


    return (
        <div className="pt-page">
            {toastMessage && (
                <div className="pt-toast">
                    <div className="pt-toast-content">
                        <span className="toast-icon">✓</span>
                        {toastMessage}
                    </div>
                </div>
            )}

            <div className="pt-header-top">
                <div className="pt-breadcrumb">SỔ QUỸ TIỀN MẶT / PHIẾU CHI</div>
                <button className="pt-btn-create" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-chi')}>
                    + TẠO PHIẾU CHI
                </button>
            </div>
            
            <div className="pt-header-main">
                <h1>PHIẾU CHI</h1>
                <p>QUẢN LÝ CÁC KHOẢN TIỀN ĐÃ CHI RA KHỎI QUỸ</p>
            </div>

            <div className="pt-filter-bar" style={{borderBottom: 'none'}}>
                <input 
                    type="text" 
                    placeholder="TÌM MÃ PHIẾU / NGƯỜI NHẬN / CHỨNG TỪ..." 
                    className="pt-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="TẤT CẢ TRẠNG THÁI">TẤT CẢ TRẠNG THÁI</option>
                    <option value="ĐÃ GHI NHẬN">ĐÃ GHI NHẬN</option>
                    <option value="ĐÃ HỦY">ĐÃ HỦY</option>
                </select>
                <div className="pt-date-filter">
                    <label>TỪ NGÀY</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div className="pt-date-filter">
                    <label>ĐẾN NGÀY</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
                <button className="pt-btn-dark" onClick={() => setShowAdvanced(!showAdvanced)} style={{minHeight: '38px', padding: '0 12px'}}>
                    BỘ LỌC NÂNG CAO {showAdvanced ? '▲' : '▼'}
                </button>
            </div>

            {showAdvanced && (
                <div className="pt-filter-bar" style={{paddingTop: 0, paddingBottom: '16px'}}>
                    <select>
                        <option>TẤT CẢ NHÓM</option>
                    </select>
                    <select>
                        <option>TẤT CẢ PHƯƠNG THỨC</option>
                    </select>
                    <select>
                        <option>TẤT CẢ NGUỒN</option>
                    </select>
                </div>
            )}

            <div className="pt-table-container">
                <table className="promo-table pt-table">
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
                        {filteredData.length > 0 ? (
                            filteredData.map(row => (
                                <tr key={row.id}>
                                    <td><strong>{row.code}</strong></td>
                                    <td>
                                        <div className="person-col">
                                            <strong>{row.person}</strong>
                                            <span>{row.role}</span>
                                        </div>
                                    </td>
                                    <td className="text-muted">{row.group}</td>
                                    <td>
                                        <div className="type-col">
                                            <span className="type-code">{row.typeCode}</span>
                                            <strong>{row.typeName}</strong>
                                        </div>
                                    </td>
                                    <td><span className="method-text">{row.method}</span></td>
                                    <td className="text-muted">{row.creator}</td>
                                    <td><strong style={{color: '#dc2626'}}>{formatMoney(row.amount)}</strong></td>
                                    <td className="text-muted">{row.date}</td>
                                    <td className="text-muted">{row.source}</td>
                                    <td>
                                        <span className={`status-outline ${row.status === 'ĐÃ HỦY' ? 'status-danger' : 'status-success'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="pt-btn-detail" onClick={() => navigate(`/admin/so-quy-tien-mat/phieu-chi/${row.code}`)}>
                                            XEM CHI TIẾT
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="11">
                                    <div className="pt-empty-state">
                                        <p>KHÔNG TÌM THẤY PHIẾU CHI PHÙ HỢP</p>
                                        <button className="pt-btn-dark" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-chi')}>
                                            TẠO PHIẾU CHI
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {filteredData.length > 0 && (
                <div className="pt-pagination">
                    <div className="pt-pagination-info">
                        HIỂN THỊ 1-{filteredData.length} TRÊN {filteredData.length} PHIẾU
                    </div>
                    <div className="pt-pagination-controls">
                        <button disabled>TRƯỚC</button>
                        <button disabled>SAU</button>
                    </div>
                </div>
            )}
        </div>
    );
}
