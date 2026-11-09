import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPromotions, getPromotion } from '../api/promotionApi.js';
import { normalizePromotion, computePromotionStatus } from '../promotionModel.js';
import { getDemoPromotions } from '../demoPromotions.js';
import TablePagination from '../../../../shared/components/ui/TablePagination';
import './DanhSachKhuyenMai.css';

function getPromoStatusVariant(status) {
    switch (status) {
        case 'ĐANG ÁP DỤNG':
            return 'green';
        case 'TẠM DỪNG':
            return 'amber';
        case 'HẾT LƯỢT':
            return 'red';
        case 'HẾT HẠN':
            return 'neutral';
        case 'CHƯA BẮT ĐẦU':
            return 'blue';
        default:
            return 'neutral';
    }
}

export default function DanhSachKhuyenMai() {
    const navigate = useNavigate();
    const location = useLocation();

    const [promotions, setPromotions] = useState([]);
    const [toastMessage, setToastMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states matching wireframe (Image 1)
    const [searchQuery, setSearchQuery] = useState('');
    const previousSearch = useRef(searchQuery);
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [scopeFilter, setScopeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [fromDateFilter, setFromDateFilter] = useState('');
    const [toDateFilter, setToDateFilter] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (location.state?.successMessage) {
            setToastMessage(location.state.successMessage);
            window.history.replaceState({}, document.title);
            const timer = setTimeout(() => setToastMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    useEffect(() => {
        const controller = new AbortController();
        const delay = previousSearch.current === searchQuery ? 0 : 250;
        previousSearch.current = searchQuery;
        setLoading(true);
        setError('');

        const fetchData = async () => {
            try {
                let beItems = [];
                try {
                    const data = await getPromotions(
                        { keyword: searchQuery, method: methodFilter, status: statusFilter, page: 0, limit: 100 },
                        controller.signal
                    );
                    if (data?.items) {
                        beItems = data.items.map(normalizePromotion);
                    }
                } catch {
                    // Fallback to empty if BE fails/unreachable
                    beItems = [];
                }

                if (controller.signal.aborted) return;

                // Merge backend items with demo items (ensuring DEMO items from the prototype design are available)
                const currentDemoList = getDemoPromotions();
                const existingCodes = new Set(beItems.map(p => (p.code || '').toUpperCase()));
                const missingDemos = currentDemoList.filter(d => !existingCodes.has(d.code.toUpperCase()));
                const combined = [...beItems, ...missingDemos];

                // Fetch extra details for BE items if missing offer / details
                const enriched = await Promise.all(
                    combined.map(async (promo) => {
                        if (promo.offer || promo.raw?.chi_tiet_khuyen_mai) return promo;
                        try {
                            const detail = await getPromotion(promo.id, controller.signal);
                            if (detail) {
                                return normalizePromotion({ ...promo.raw, ...detail });
                            }
                        } catch {
                            // Ignore detail fetch errors
                        }
                        return promo;
                    })
                );

                if (!controller.signal.aborted) {
                    setPromotions(enriched.map(p => ({
                        ...p,
                        status: computePromotionStatus(p)
                    })));
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(err.message || 'Lỗi khi tải danh sách');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        const timer = setTimeout(fetchData, delay);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery, methodFilter, statusFilter]);

    // Apply Client-Side Filtering for scope, fromDate, toDate & search query
    const filteredPromotions = useMemo(() => {
        return promotions.filter(promo => {
            // Text search
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const codeMatch = promo.code?.toLowerCase().includes(q);
                const nameMatch = promo.name?.toLowerCase().includes(q);
                if (!codeMatch && !nameMatch) return false;
            }

            // Method filter
            if (methodFilter !== 'ALL') {
                if (methodFilter === 'CHIET_KHAU' && promo.method !== 'CHIẾT KHẤU') return false;
                if (methodFilter === 'TANG_SAN_PHAM' && promo.method !== 'TẶNG SẢN PHẨM') return false;
            }

            // Scope filter
            if (scopeFilter !== 'ALL') {
                if (scopeFilter === 'TONG_DON' && promo.target !== 'TỔNG ĐƠN HÀNG') return false;
                if (scopeFilter === 'TUNG_SAN_PHAM' && promo.target !== 'PHIÊN BẢN SẢN PHẨM') return false;
                if (scopeFilter === 'DANH_MUC' && promo.target !== 'DANH MỤC') return false;
            }

            // Status filter
            if (statusFilter !== 'ALL') {
                const statusMap = {
                    DANG_AP_DUNG: 'ĐANG ÁP DỤNG',
                    TAM_DUNG: 'TẠM DỪNG',
                    CHUA_BAT_DAU: 'CHƯA BẮT ĐẦU',
                    HET_LUOT: 'HẾT LƯỢT',
                    HET_HAN: 'HẾT HẠN',
                };
                if (statusMap[statusFilter] && promo.status !== statusMap[statusFilter]) return false;
            }

            // Date filters
            if (fromDateFilter) {
                const start = promo.startDate?.slice(0, 10);
                if (start && start < fromDateFilter) return false;
            }
            if (toDateFilter) {
                const end = promo.endDate?.slice(0, 10);
                if (end && end > toDateFilter) return false;
            }

            return true;
        });
    }, [promotions, searchQuery, methodFilter, scopeFilter, statusFilter, fromDateFilter, toDateFilter]);

    const totalItems = filteredPromotions.length;
    const paginatedPromotions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPromotions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPromotions, currentPage]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setMethodFilter('ALL');
        setScopeFilter('ALL');
        setStatusFilter('ALL');
        setFromDateFilter('');
        setToDateFilter('');
        setCurrentPage(1);
    };

    const formatDateTime = (dateString, defaultTime = '00:00') => {
        if (!dateString) return '--:-- --/--/----';
        let datePart = dateString;
        let timePart = defaultTime;

        if (dateString.includes('T')) {
            const [d, t] = dateString.split('T');
            datePart = d;
            timePart = t ? t.slice(0, 5) : defaultTime;
        } else if (dateString.includes(' ')) {
            const [d, t] = dateString.split(' ');
            datePart = d;
            timePart = t ? t.slice(0, 5) : defaultTime;
        }

        const parts = datePart.split('-');
        if (parts.length === 3) {
            return `${timePart} ${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return `${timePart} ${dateString}`;
    };

    const getOfferText = (promo) => {
        if (promo.offer) return promo.offer;
        if (promo.method === 'TẶNG SẢN PHẨM') return 'TẶNG BỘ QUÀ';
        if (promo.discountValue != null) {
            if (Number(promo.discountValue) <= 100 && (promo.discountType?.includes('phần trăm') || promo.offer?.includes('%'))) {
                return `GIẢM ${promo.discountValue}%`;
            }
            return `GIẢM ${Number(promo.discountValue).toLocaleString('vi-VN')} đ`;
        }
        return promo.target === 'TỔNG ĐƠN HÀNG' ? 'GIẢM TỔNG ĐƠN' : 'CHIẾT KHẤU';
    };

    const getRemainingText = (promo) => {
        if (promo.maxUsage === null || promo.maxUsage === undefined) {
            return 'KHÔNG GIỚI HẠN';
        }
        if (promo.remainingUsage === 0) {
            return '0 lượt';
        }
        const count = promo.remainingUsage ?? (promo.maxUsage - (promo.usedUsage || 0));
        return `${count} lượt`;
    };

    return (
        <div className="promo-list-page admin-list-page">
            {toastMessage && (
                <div className="promo-toast">
                    <div className="promo-toast-content">
                        <span className="toast-icon">✓</span>
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="promo-list-header">
                <div className="promo-list-title-area">
                    <div className="promo-breadcrumb">KHUYẾN MẠI / DANH SÁCH KHUYẾN MẠI</div>
                    <h1>DANH SÁCH KHUYẾN MẠI</h1>
                    <p>QUẢN LÝ CÁC CHƯƠNG TRÌNH ƯU ĐÃI ĐANG ĐƯỢC CẤU HÌNH</p>
                </div>
                <button
                    type="button"
                    className="btn-create-promo"
                    onClick={() => navigate('/admin/khuyen-mai/tao-khuyen-mai')}
                >
                    + TẠO KHUYẾN MẠI
                </button>
            </div>

            {/* Filter Bar (Image 1) */}
            <div className="promo-filter-bar-container">
                <div className="promo-filter-field promo-field-search">
                    <label>TÌM CHƯƠNG TRÌNH</label>
                    <input
                        type="text"
                        placeholder="TÌM MÃ / TÊN..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                <div className="promo-filter-field promo-field-select">
                    <label>PHƯƠNG THỨC</label>
                    <select
                        value={methodFilter}
                        onChange={(e) => {
                            setMethodFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="ALL">Tất cả phương thức</option>
                        <option value="CHIET_KHAU">Chiết khấu</option>
                        <option value="TANG_SAN_PHAM">Tặng sản phẩm</option>
                    </select>
                </div>

                <div className="promo-filter-field promo-field-select">
                    <label>PHẠM VI</label>
                    <select
                        value={scopeFilter}
                        onChange={(e) => {
                            setScopeFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="ALL">Tất cả phạm vi</option>
                        <option value="TONG_DON">Tổng đơn hàng</option>
                        <option value="TUNG_SAN_PHAM">Phiên bản sản phẩm</option>
                        <option value="DANH_MUC">Danh mục</option>
                    </select>
                </div>

                <div className="promo-filter-field promo-field-select">
                    <label>TRẠNG THÁI HIỂN THỊ</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="DANG_AP_DUNG">Đang áp dụng</option>
                        <option value="TAM_DUNG">Tạm dừng</option>
                        <option value="CHUA_BAT_DAU">Chưa bắt đầu</option>
                        <option value="HET_LUOT">Hết lượt</option>
                        <option value="HET_HAN">Hết hạn</option>
                    </select>
                </div>

                <div className="promo-filter-field promo-field-date">
                    <label>TỪ NGÀY</label>
                    <input
                        type="date"
                        value={fromDateFilter}
                        onChange={(e) => {
                            setFromDateFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                <div className="promo-filter-field promo-field-date">
                    <label>ĐẾN NGÀY</label>
                    <input
                        type="date"
                        value={toDateFilter}
                        onChange={(e) => {
                            setToDateFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                <div className="promo-filter-action">
                    <button type="button" className="btn-clear-filter-btn" onClick={handleClearFilters}>
                        XÓA BỘ LỌC
                    </button>
                </div>
            </div>

            {/* Table Area (Image 2) */}
            <div className="promo-list-content-area admin-list-body">
                <div
                    className="promo-list-table-container admin-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Danh sách khuyến mại"
                >
                    <table
                        className="promo-table-v2 admin-data-table"
                        aria-busy={loading}
                    >
                        <thead>
                            <tr>
                                <th>MÃ / TÊN CHƯƠNG TRÌNH</th>
                                <th>PHƯƠNG THỨC</th>
                                <th>PHẠM VI ÁP DỤNG</th>
                                <th>ƯU ĐÃI</th>
                                <th>THỜI GIAN</th>
                                <th>LƯỢT CÒN LẠI</th>
                                <th>TRẠNG THÁI</th>
                                <th>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !promotions.length ? (
                                <tr>
                                    <td colSpan="8" className="promo-table-notice">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="promo-table-notice error-notice"
                                    >
                                        {error}
                                    </td>
                                </tr>
                            ) : paginatedPromotions.length > 0 ? (
                                paginatedPromotions.map((promo) => (
                                    <tr key={promo.id}>
                                        <td className="promo-col-name">
                                            <div className="promo-code-bold">
                                                {promo.code}
                                            </div>
                                            <div className="promo-name-sub">
                                                {promo.name}
                                            </div>
                                        </td>

                                        <td className="promo-col-method">
                                            <div className="promo-cell-bold">
                                                {promo.method}
                                            </div>
                                        </td>

                                        <td className="promo-col-scope">
                                            <div className="promo-cell-bold">
                                                {promo.target}
                                            </div>
                                        </td>

                                        <td className="promo-col-offer">
                                            <div className="promo-cell-bold">
                                                {getOfferText(promo)}
                                            </div>
                                        </td>

                                        <td className="promo-col-time">
                                            <div className="promo-time-row">
                                                Từ {formatDateTime(promo.startDate)}
                                            </div>
                                            <div className="promo-time-row">
                                                Đến {formatDateTime(promo.endDate)}
                                            </div>
                                        </td>

                                        <td className="promo-col-usage">
                                            <div className="promo-remain-main">
                                                {getRemainingText(promo)}
                                            </div>
                                            <div className="promo-remain-sub">
                                                Đã dùng {promo.usedUsage ?? 0}
                                                {' · '}
                                                Đang giữ {promo.holdingCount ?? 0}
                                            </div>
                                        </td>

                                        <td className="promo-col-status">
                                            <span className={`promo-status-badge promo-status-badge--${getPromoStatusVariant(promo.status)}`}>
                                                {promo.status}
                                            </span>
                                            <div className="promo-flag-sub">
                                                Cờ quản lý:{' '}
                                                {promo.savedStatus === 0
                                                    ? 'Tạm dừng'
                                                    : 'Đang bật'}
                                            </div>
                                        </td>

                                        <td className="promo-col-action">
                                            <button
                                                type="button"
                                                className="btn-detail-outline"
                                                onClick={() =>
                                                    navigate(
                                                        `/admin/khuyen-mai/chi-tiet-khuyen-mai/${encodeURIComponent(promo.id)}`
                                                    )
                                                }
                                            >
                                                XEM CHI TIẾT
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8">
                                        <div className="promo-empty-state">
                                            <p>
                                                KHÔNG TÌM THẤY CHƯƠNG TRÌNH KHUYẾN MẠI PHÙ HỢP
                                            </p>
                                            <button
                                                type="button"
                                                className="btn-clear-filters"
                                                onClick={handleClearFilters}
                                            >
                                                XÓA BỘ LỌC
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!error && (
                    <TablePagination
                        className="admin-table-footer"
                        totalItems={totalItems}
                        pageSize={ITEMS_PER_PAGE}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        idPrefix="promotion"
                    />
                )}
            </div>
        </div>
    );
}
