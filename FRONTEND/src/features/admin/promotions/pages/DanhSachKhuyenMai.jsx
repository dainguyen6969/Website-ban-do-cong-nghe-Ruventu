import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import { getPromotions } from '../../../../data/mockPromotions';
import './DanhSachKhuyenMai.css';

export default function DanhSachKhuyenMai() {
    const navigate = useNavigate();
    const location = useLocation();
    const [promotions, setPromotions] = useState([]);
    const [toastMessage, setToastMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        if (location.state?.successMessage) {
            setToastMessage(location.state.successMessage);
            window.history.replaceState({}, document.title);
            setTimeout(() => setToastMessage(''), 3000);
        }

        const fetchData = async () => {
            const data = await getPromotions();
            setPromotions(data);
            setLoading(false);
        };
        fetchData();
    }, [location.state]);

    // Reset to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, methodFilter, statusFilter]);

    const filteredPromotions = useMemo(() => {
        return promotions.filter(promo => {
            const matchSearch = promo.code.toLowerCase().includes(searchQuery.toLowerCase()) || promo.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchMethod = methodFilter === 'ALL' || promo.method === methodFilter;
            const matchStatus = statusFilter === 'ALL' || promo.status === statusFilter;
            return matchSearch && matchMethod && matchStatus;
        });
    }, [promotions, searchQuery, methodFilter, statusFilter]);

    const totalItems = filteredPromotions.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

    const paginatedPromotions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPromotions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPromotions, currentPage]);

    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'ĐANG ÁP DỤNG': return 'status-badge status-active';
            case 'HẾT LƯỢT': return 'status-badge status-out';
            case 'CHƯA BẮT ĐẦU': return 'status-badge status-pending';
            case 'TẠM DỪNG': return 'status-badge status-paused';
            default: return 'status-badge';
        }
    };

    const getRemainingText = (promo) => {
        if (promo.maxUsage === null) return <span style={{color: '#16a34a', fontWeight: 'bold'}}>KHÔNG GIỚI HẠN</span>;
        if (promo.remainingUsage === 0) return <span style={{color: '#dc2626', fontWeight: 'bold'}}>0 LƯỢT</span>;
        return <span style={{fontWeight: 'bold'}}>{promo.remainingUsage} LƯỢT</span>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        let datePart = dateString;
        let timePart = '';
        if (dateString.includes('T')) {
            const [d, t] = dateString.split('T');
            datePart = d;
            timePart = t ? ` ${t.slice(0, 5)}` : '';
        } else if (dateString.includes(' ')) {
            const [d, t] = dateString.split(' ');
            datePart = d;
            timePart = t ? ` ${t.slice(0, 5)}` : '';
        }

        const parts = datePart.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}${timePart}`;
        }
        return dateString;
    };

    return (
        <div className="promo-list-page">
            {toastMessage && (
                <div className="promo-toast">
                    <div className="promo-toast-content">
                        <span className="toast-icon">✓</span>
                        {toastMessage}
                    </div>
                </div>
            )}
            
            <div className="promo-list-header">
                <div className="promo-list-title-area">
                    <div className="promo-breadcrumb">KHUYẾN MẠI / DANH SÁCH KHUYẾN MẠI</div>
                    <h1>DANH SÁCH KHUYẾN MẠI</h1>
                    <p>QUẢN LÝ CÁC CHƯƠNG TRÌNH ƯU ĐÃI ĐANG ĐƯỢC CẤU HÌNH</p>
                </div>
                <button className="btn-create-promo" onClick={() => navigate('/admin/khuyen-mai/tao-khuyen-mai')}>
                    + TẠO KHUYẾN MẠI
                </button>
            </div>

            <div className="promo-list-filters">
                <div className="search-box">
                    <HiOutlineSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="TÌM MÃ / TÊN CHƯƠNG TRÌNH..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-selects">
                    <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                        <option value="ALL">TẤT CẢ PHƯƠNG THỨC</option>
                        <option value="CHIẾT KHẤU">CHIẾT KHẤU</option>
                        <option value="TẶNG SẢN PHẨM">TẶNG SẢN PHẨM</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">TẤT CẢ TRẠNG THÁI</option>
                        <option value="ĐANG ÁP DỤNG">ĐANG ÁP DỤNG</option>
                        <option value="HẾT LƯỢT">HẾT LƯỢT</option>
                        <option value="CHƯA BẮT ĐẦU">CHƯA BẮT ĐẦU</option>
                        <option value="TẠM DỪNG">TẠM DỪNG</option>
                    </select>
                </div>
            </div>

            <div className="promo-list-content-area">
                <div className="promo-list-table-container">
                    <table className="promo-table">
                    <thead>
                        <tr>
                            <th>MÃ CHƯƠNG TRÌNH</th>
                            <th>TÊN CHƯƠNG TRÌNH</th>
                            <th>PHƯƠNG THỨC</th>
                            <th>ĐỐI TƯỢNG</th>
                            <th>CÒN LẠI</th>
                            <th>BẮT ĐẦU</th>
                            <th>KẾT THÚC</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{textAlign: 'center', padding: '20px'}}>Đang tải...</td></tr>
                        ) : paginatedPromotions.length > 0 ? (
                            paginatedPromotions.map(promo => (
                                <tr key={promo.id}>
                                    <td className="promo-code">{promo.code}</td>
                                    <td className="promo-name">{promo.name}</td>
                                    <td>{promo.method}</td>
                                    <td>{promo.target}</td>
                                    <td>{getRemainingText(promo)}</td>
                                    <td>{formatDate(promo.startDate)}</td>
                                    <td>{formatDate(promo.endDate)}</td>
                                    <td>
                                        <span className={getStatusStyle(promo.status)}>
                                            {promo.status}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/admin/khuyen-mai/chi-tiet-khuyen-mai/${promo.id}`} className="btn-view-detail">
                                            XEM CHI TIẾT
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9">
                                    <div className="promo-empty-state">
                                        <p>KHÔNG TÌM THẤY CHƯƠNG TRÌNH KHUYẾN MẠI PHÙ HỢP</p>
                                        <button className="btn-clear-filters" onClick={() => {
                                            setSearchQuery('');
                                            setMethodFilter('ALL');
                                            setStatusFilter('ALL');
                                        }}>XÓA BỘ LỌC</button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            </div>

            {!loading && totalItems > 0 && (
                <div className="promo-pagination">
                    <div className="promo-pagination-info">
                        HIỂN THỊ {startIndex}-{endIndex} TRÊN TỔNG SỐ {totalItems} CHƯƠNG TRÌNH
                    </div>
                    <div className="promo-pagination-controls">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        >
                            &larr;
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button 
                                key={p} 
                                className={currentPage === p ? 'active' : ''}
                                onClick={() => setCurrentPage(p)}
                            >
                                {p}
                            </button>
                        ))}

                        <button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        >
                            &rarr;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
