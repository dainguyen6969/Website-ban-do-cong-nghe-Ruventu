import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { receiptService } from '../../../../shared/services/receiptService';
import DetailTablePagination from '../../../../shared/components/ui/DetailTablePagination';
import './DanhSachPhieuThu.css';

export default function DanhSachPhieuThu() {
    const navigate = useNavigate();
    const location = useLocation();

    const [receipts, setReceipts] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    
    const [toastMessage, setToastMessage] = useState('');
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (location.state?.successMessage) {
            setToastMessage(location.state.successMessage);
            window.history.replaceState({}, document.title);
            setTimeout(() => setToastMessage(''), 3000);
        }
    }, [location]);

    const fetchReceipts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                keyword: debouncedSearch.trim() || undefined,
                trang_thai: filterStatus !== 'ALL' ? filterStatus : undefined,
                tu_ngay: fromDate || undefined,
                den_ngay: toDate || undefined,
                page: Math.max(0, page - 1),
                limit: pageSize
            };
            const response = await receiptService.getReceipts(params);
            if (response.data?.data) {
                setReceipts(response.data.data.items || []);
                setTotalElements(response.data.data.pagination?.total_elements || 0);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách phiếu thu:', error);
            setReceipts([]);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, filterStatus, fromDate, toDate, page]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 500);
    };

    const formatMoney = (amount) => {
        return (amount || 0).toLocaleString('vi-VN') + 'đ';
    };

    const mapStatusToText = (status) => {
        switch (status) {
            case 'DA_GHI_NHAN': return 'ĐÃ GHI NHẬN';
            case 'HUY': return 'ĐÃ HỦY';
            default: return status;
        }
    };
    
    const mapSourceToText = (source) => {
        switch (source) {
            case 'THU_CONG': return 'THỦ CÔNG';
            case 'TU_DONG': return 'TỰ ĐỘNG';
            default: return source;
        }
    };

    const mapGroupToText = (group) => {
        switch (group) {
            case 'KHACH_HANG': return 'KHÁCH HÀNG';
            case 'NHAN_VIEN': return 'NHÂN VIÊN';
            case 'NHA_CUNG_CAP': return 'NHÀ CUNG CẤP';
            case 'DOI_TAC_GIAO_HANG': return 'ĐỐI TÁC GIAO HÀNG';
            case 'KHAC': return 'KHÁC';
            default: return group;
        }
    };

    const mapPaymentMethodToText = (method) => {
        switch (method) {
            case 'TIEN_MAT': return 'TIỀN MẶT';
            case 'CHUYEN_KHOAN': return 'CHUYỂN KHOẢN';
            case 'THE': return 'QUẸT THẺ';
            default: return method;
        }
    };

    return (
        <div className="pt-page">
            {toastMessage && (
                <div className="pt-toast">
                    <div className="pt-toast-content">
                        <div className="toast-icon">
                            <Check size={20} color="#fff" strokeWidth={3} />
                        </div>
                        <div className="toast-text">
                            {toastMessage}
                        </div>
                        <button className="toast-close" onClick={() => setToastMessage('')}>
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}

            <div className="pt-header-top">
                <div className="pt-breadcrumb">SỔ QUỸ TIỀN MẶT / PHIẾU THU</div>
                <button className="pt-btn-create" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-thu')}>
                    + TẠO PHIẾU THU
                </button>
            </div>
            
            <div className="pt-header-main">
                <h1>PHIẾU THU</h1>
                <p>QUẢN LÝ CÁC KHOẢN TIỀN ĐÃ GHI NHẬN VÀO QUỸ</p>
            </div>

            <div className="pt-filter-bar">
                <input 
                    type="text" 
                    placeholder="TÌM MÃ PHIẾU / NGƯỜI NỘP / CHỨNG TỪ..." 
                    className="pt-search-input"
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                    <option value="ALL">TẤT CẢ TRẠNG THÁI</option>
                    <option value="DA_GHI_NHAN">ĐÃ GHI NHẬN</option>
                    <option value="HUY">ĐÃ HỦY</option>
                </select>
                <div className="pt-date-filter">
                    <label>TỪ NGÀY</label>
                    <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
                </div>
                <div className="pt-date-filter">
                    <label>ĐẾN NGÀY</label>
                    <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
                </div>
            </div>

            <div className="pt-table-container">
                <table className="promo-table pt-table">
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
                        {isLoading ? (
                            <tr><td colSpan="11" style={{textAlign: 'center', padding: '20px'}}>Đang tải dữ liệu...</td></tr>
                        ) : receipts.length > 0 ? (
                            receipts.map(row => (
                                <tr key={row.id}>
                                    <td><strong>{row.ma_phieu}</strong></td>
                                    <td>
                                        <div className="person-col">
                                            <strong>{row.ten_nguoi_nop_nhan}</strong>
                                            <span>{mapGroupToText(row.nhom_nguoi_nop_nhan)}</span>
                                        </div>
                                    </td>
                                    <td className="text-muted">{mapGroupToText(row.nhom_nguoi_nop_nhan)}</td>
                                    <td>
                                        <div className="type-col">
                                            <span className="type-code">{row.ma_loai}</span>
                                            <strong>{row.ten_loai}</strong>
                                        </div>
                                    </td>
                                    <td><span className="method-text">{mapPaymentMethodToText(row.phuong_thuc_thanh_toan)}</span></td>
                                    <td className="text-muted">{row.ten_nguoi_tao}</td>
                                    <td><strong>{formatMoney(row.so_tien)}</strong></td>
                                    <td className="text-muted">{new Date(row.ngay_ghi_nhan).toLocaleString()}</td>
                                    <td className="text-muted">{mapSourceToText(row.nguon_tao)}</td>
                                    <td>
                                        <span className={`status-outline ${row.trang_thai === 'HUY' ? 'status-danger' : 'status-success'}`}>
                                            {mapStatusToText(row.trang_thai)}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="pt-btn-detail" onClick={() => navigate(`/admin/so-quy-tien-mat/phieu-thu/${row.id}`)}>
                                            XEM CHI TIẾT
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="11">
                                    <div className="pt-empty-state">
                                        <p>KHÔNG TÌM THẤY PHIẾU THU PHÙ HỢP</p>
                                        <button className="pt-btn-dark" onClick={() => navigate('/admin/so-quy-tien-mat/tao-phieu-thu')}>
                                            TẠO PHIẾU THU
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {receipts.length > 0 && (
                <DetailTablePagination 
                    totalItems={totalElements} 
                    currentPage={page} 
                    onPageChange={setPage} 
                    pageSize={pageSize} 
                    idPrefix="receipts" 
                />
            )}
        </div>
    );
}
