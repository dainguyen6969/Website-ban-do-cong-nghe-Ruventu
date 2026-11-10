import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPromotion, updatePromotion, deletePromotion, setPromotionStatus } from '../api/promotionApi.js';
import { normalizePromotion, editPromotionBody, computePromotionStatus } from '../promotionModel.js';
import { findDemoPromotion, updateStoredPromotion } from '../demoPromotions.js';
import './ChiTietKhuyenMai.css';
import { FormDropdown } from "../../../../shared/components/ui/FilterDropdown";

export default function ChiTietKhuyenMai() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [promo, setPromo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('TONG_QUAN'); // TONG_QUAN, CAU_HINH, DON_HANG, THONG_KE
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteBlockedModal, setDeleteBlockedModal] = useState(false);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [busy, setBusy] = useState(false);

    // Edit form states matching Image 1 & 2
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editMaxUsage, setEditMaxUsage] = useState('');
    const [editUnlimited, setEditUnlimited] = useState(false);
    const [editEndDate, setEditEndDate] = useState('');

    // Tab 3: Filter applied orders states
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
    const [orderFromDate, setOrderFromDate] = useState('');
    const [orderToDate, setOrderToDate] = useState('');

    // Tab 4: Statistics Report states
    const [statFromDate, setStatFromDate] = useState('2026-11-01');
    const [statToDate, setStatToDate] = useState('2026-11-02');
    const [hasCalculatedStats, setHasCalculatedStats] = useState(true);

    const resetEditForm = (item) => {
        if (!item) return;
        setEditName(item.name || '');
        setEditDescription(item.description || '');
        const isUnlim = item.maxUsage === null || item.maxUsage === undefined;
        setEditUnlimited(isUnlim);
        setEditMaxUsage(isUnlim ? '' : item.maxUsage);
        setEditEndDate(item.endDate?.slice(0, 16) || '');
    };

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');

        const demoFound = findDemoPromotion(id);
        if (demoFound) {
            setPromo(demoFound);
            resetEditForm(demoFound);
        }

        const fetchData = async () => {
            try {
                const apiData = await getPromotion(id, controller.signal);
                if (controller.signal.aborted) return;
                const normalized = normalizePromotion(apiData);
                setPromo(normalized);
                resetEditForm(normalized);
            } catch {
                if (!demoFound) {
                    if (!controller.signal.aborted) {
                        setError('Không tìm thấy chương trình khuyến mại.');
                    }
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [id]);

    const handleToggleStatus = async () => {
        if (!promo || busy) return;
        setBusy(true);
        setError('');
        const newStatus = promo.savedStatus === 0 ? 1 : 0;
        const newStatusText = computePromotionStatus({
            ...promo,
            savedStatus: newStatus,
        });
        try {
            if (promo.raw?.id) {
                const result = await setPromotionStatus(promo.id, newStatus);
                const updated = normalizePromotion({ ...promo.raw, ...result });
                setPromo(updated);
            } else {
                setPromo(prev => ({
                    ...prev,
                    savedStatus: newStatus,
                    status: newStatusText
                }));
            }
            updateStoredPromotion(promo.id, {
                savedStatus: newStatus,
                status: newStatusText
            });
            setSuccessMsg(`Đã ${newStatus === 0 ? 'tạm dừng' : 'khôi phục'} chương trình thành công!`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.message || 'Lỗi khi cập nhật trạng thái');
        } finally {
            setBusy(false);
        }
    };

    const handleStartEdit = () => {
        resetEditForm(promo);
        setActiveTab('CAU_HINH');
        setIsEditing(true);
        window.scrollTo({ top: 180, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        resetEditForm(promo);
        setIsEditing(false);
        setError('');
    };

    const handleSimulateNewVersion = () => {
        const nextVersion = (promo.configVersion || 1) + 1;
        setPromo(prev => ({
            ...prev,
            configVersion: nextVersion
        }));
        updateStoredPromotion(promo.id, { configVersion: nextVersion });
        setSuccessMsg(`Đã mô phỏng cập nhật phiên bản ${nextVersion}!`);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleSaveEdit = async () => {
        if (!promo || busy) return;
        setBusy(true);
        setError('');
        try {
            const finalLimit = editUnlimited ? null : (editMaxUsage === '' ? null : Number(editMaxUsage));
            const calculatedRemaining = finalLimit === null ? null : Math.max(0, finalLimit - (promo.usedUsage || 0));
            const nextEndDate = editEndDate ? (editEndDate.includes(':') && editEndDate.length === 16 ? `${editEndDate}:00` : editEndDate) : promo.endDate;
            const nextStatus = computePromotionStatus({
                ...promo,
                endDate: nextEndDate,
                maxUsage: finalLimit,
                remainingUsage: calculatedRemaining,
            });

            if (promo.raw?.id) {
                await updatePromotion(promo.id, editPromotionBody(promo.raw, {
                    name: editName,
                    description: editDescription,
                    limit: finalLimit,
                    endDate: editEndDate,
                }));
                const fresh = normalizePromotion(await getPromotion(promo.id));
                setPromo(fresh);
                resetEditForm(fresh);
            } else {
                setPromo(prev => ({
                    ...prev,
                    name: editName,
                    description: editDescription,
                    maxUsage: finalLimit,
                    remainingUsage: calculatedRemaining,
                    endDate: nextEndDate,
                    status: nextStatus,
                }));
            }

            // Sync with session storage so list page updates immediately
            updateStoredPromotion(promo.id, {
                name: editName,
                description: editDescription,
                maxUsage: finalLimit,
                remainingUsage: calculatedRemaining,
                endDate: nextEndDate,
                status: nextStatus,
            });

            setIsEditing(false);
            setSuccessMsg('Đã lưu thay đổi cấu hình thành công!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.message || 'Lỗi khi lưu thay đổi');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteClick = () => {
        setError('');
        const isProtected = promo.hasHistory || (promo.usedUsage && promo.usedUsage > 0) || promo.releasedCount > 0;
        if (isProtected) {
            setDeleteBlockedModal(true);
        } else {
            setShowDeleteModal(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (!promo || busy) return;
        setBusy(true);
        setError('');
        try {
            if (promo.raw?.id) {
                await deletePromotion(promo.id);
            }
            navigate('/admin/khuyen-mai/danh-sach-khuyen-mai', {
                state: { successMessage: `Đã xóa thành công chương trình ${promo.code}!` },
            });
        } catch (err) {
            setError(err.message);
            setShowDeleteModal(false);
        } finally {
            setBusy(false);
        }
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

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return 'Không cấu hình';
        return Number(amount).toLocaleString('vi-VN') + ' đ';
    };

    if (loading) {
        return (
            <div className="promo-detail-page-v2">
                <div className="detail-loading-state">Đang tải thông tin chương trình...</div>
            </div>
        );
    }

    if (!promo) {
        return (
            <div className="promo-detail-page-v2">
                <div className="detail-not-found">
                    <h2>{error || 'Không tìm thấy chương trình khuyến mại'}</h2>
                    <button
                        type="button"
                        className="btn-outline-back"
                        onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                    >
                        &larr; QUAY LẠI DANH SÁCH
                    </button>
                </div>
            </div>
        );
    }

    const hasUsage = Boolean(promo.hasHistory || (promo.usedUsage && promo.usedUsage > 0) || promo.releasedCount > 0);
    const isGiftMethod = promo.method === 'TẶNG SẢN PHẨM';

    // Parse buy and gift products
    const buyProducts = promo.buyProducts?.length > 0
        ? promo.buyProducts
        : (promo.appliedProducts?.filter(p => p.role === 'SẢN PHẨM MUA').map(p => ({
            name: p.name,
            version: p.version,
            sku: p.code,
            reqQuantity: p.quantity?.replace('SL: ', '') || 1,
        })) || []);

    const giftProducts = promo.giftProducts?.length > 0
        ? promo.giftProducts
        : (promo.appliedProducts?.filter(p => p.role === 'SẢN PHẨM TẶNG').map(p => ({
            name: p.name,
            version: p.version,
            sku: p.code,
            giftQuantity: p.quantity?.replace('SL: ', '') || 1,
        })) || []);

    // Filter applied orders for Tab 3
    const rawOrders = promo.orders || [];
    const filteredOrders = rawOrders.filter(order => {
        if (orderSearch.trim()) {
            const q = orderSearch.trim().toLowerCase();
            const matchCode = order.code?.toLowerCase().includes(q);
            const matchCust = order.customer?.toLowerCase().includes(q);
            const matchPhone = order.phone?.toLowerCase().includes(q);
            if (!matchCode && !matchCust && !matchPhone) return false;
        }
        if (orderStatusFilter !== 'ALL') {
            if (order.usageStatus !== orderStatusFilter && order.orderStatus !== orderStatusFilter) return false;
        }
        return true;
    });

    return (
        <div className="promo-detail-page-v2">
            {error && <div className="detail-error-banner">{error}</div>}
            {successMsg && <div className="detail-success-banner">{successMsg}</div>}

            {/* Top Navigation & Action Header (Image 3) */}
            <div className="detail-header-v2">
                <div className="detail-header-left">
                    <div className="detail-breadcrumb">KHUYẾN MẠI / DANH SÁCH / CHI TIẾT</div>
                    <div className="detail-title-row">
                        <h1 className="detail-code-title">{promo.code}</h1>
                        <span className={`detail-status-tag status-${promo.status === 'ĐANG ÁP DỤNG' ? 'active' : promo.status === 'TẠM DỪNG' ? 'paused' : promo.status === 'CHƯA BẮT ĐẦU' ? 'pending' : promo.status === 'HẾT HẠN' ? 'expired' : 'out'}`}>
                            {promo.status}
                        </span>
                        <span className="detail-version-tag">Phiên bản {promo.configVersion || 1}</span>
                    </div>
                    <div className="detail-name-subtitle">{promo.name}</div>
                </div>

                <div className="detail-header-right">
                    <button
                        type="button"
                        className="btn-detail-action"
                        onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                    >
                        QUAY LẠI
                    </button>
                    {/* Nút CHỈNH SỬA nền xám chữ trắng đúng theo ảnh */}
                    <button
                        type="button"
                        className="btn-detail-edit-gray"
                        onClick={handleStartEdit}
                    >
                        CHỈNH SỬA
                    </button>
                    <button
                        type="button"
                        className="btn-detail-action"
                        onClick={handleToggleStatus}
                        disabled={busy}
                    >
                        {promo.savedStatus === 0 ? 'KHÔI PHỤC' : 'TẠM DỪNG'}
                    </button>
                    <button
                        type="button"
                        className="btn-detail-delete"
                        onClick={handleDeleteClick}
                        disabled={busy}
                    >
                        XÓA
                    </button>
                </div>
            </div>

            {/* Prototype Banner */}
            <div className="detail-prototype-banner">
                <strong>PROTOTYPE KM04–KM09</strong> · Thao tác chỉ ghi dữ liệu cục bộ. Snapshot mẫu báo cáo không ghi thêm ưu đãi hoặc giao quà vào Order gốc. Các chương trình cũ chưa có đủ snapshot sẽ không có thống kê suy diễn.
            </div>

            {/* Tab Bar */}
            <div className="detail-tabs-bar">
                <button
                    type="button"
                    className={`detail-tab-btn ${activeTab === 'TONG_QUAN' ? 'active' : ''}`}
                    onClick={() => setActiveTab('TONG_QUAN')}
                >
                    TỔNG QUAN
                </button>
                <button
                    type="button"
                    className={`detail-tab-btn ${activeTab === 'CAU_HINH' ? 'active' : ''}`}
                    onClick={() => setActiveTab('CAU_HINH')}
                >
                    CẤU HÌNH ƯU ĐÃI
                </button>
                <button
                    type="button"
                    className={`detail-tab-btn ${activeTab === 'DON_HANG' ? 'active' : ''}`}
                    onClick={() => setActiveTab('DON_HANG')}
                >
                    ĐƠN HÀNG ÁP DỤNG
                </button>
                <button
                    type="button"
                    className={`detail-tab-btn ${activeTab === 'THONG_KE' ? 'active' : ''}`}
                    onClick={() => setActiveTab('THONG_KE')}
                >
                    THỐNG KÊ
                </button>
            </div>

            {/* Callout Notice */}
            <div className="detail-callout-notice">
                KM04 không cho phép xóa chương trình. Bất kỳ đơn liên kết, kể cả lượt đã giải phóng, đều phải được giữ để kiểm toán. Nên <strong>TẠM DỪNG CHƯƠNG TRÌNH</strong> thay vì xóa.
            </div>

            {/* TAB 1: TỔNG QUAN */}
            {activeTab === 'TONG_QUAN' && (
                <div className="detail-tab-content">
                    {/* Card 1: Tổng quan chương trình */}
                    <div className="detail-card">
                        <div className="detail-card-header">
                            <h3>TỔNG QUAN CHƯƠNG TRÌNH</h3>
                        </div>
                        <div className="detail-card-body">
                            <div className="info-grid-3">
                                <div className="info-cell">
                                    <label>MÃ CHƯƠNG TRÌNH</label>
                                    <div className="info-val bold">{promo.code}</div>
                                </div>
                                <div className="info-cell">
                                    <label>TÊN CHƯƠNG TRÌNH</label>
                                    <div className="info-val">{promo.name}</div>
                                </div>
                                <div className="info-cell">
                                    <label>PHIÊN BẢN CẤU HÌNH</label>
                                    <div className="info-val">{promo.configVersion || 1}</div>
                                </div>

                                <div className="info-cell">
                                    <label>PHƯƠNG THỨC</label>
                                    <div className="info-val bold">{promo.method}</div>
                                </div>
                                <div className="info-cell">
                                    <label>PHẠM VI</label>
                                    <div className="info-val bold">{promo.target}</div>
                                </div>
                                <div className="info-cell">
                                    <label>CỜ QUẢN LÝ</label>
                                    <div className="info-val">{promo.savedStatus === 0 ? 'Tạm dừng' : 'Đang bật'}</div>
                                </div>

                                <div className="info-cell">
                                    <label>BẮT ĐẦU</label>
                                    <div className="info-val">{formatDateTime(promo.startDate)}</div>
                                </div>
                                <div className="info-cell">
                                    <label>KẾT THÚC</label>
                                    <div className="info-val">{formatDateTime(promo.endDate)}</div>
                                </div>
                                <div className="info-cell">
                                    <label>MÔ TẢ</label>
                                    <div className="info-val">{promo.description || 'Không có mô tả'}</div>
                                </div>

                                <div className="info-cell">
                                    <label>QUYỀN SỬA CẤU HÌNH</label>
                                    <div className="info-val">
                                        {hasUsage ? 'Đã khóa; chỉ sửa thông tin an toàn' : 'Được phép sửa cấu hình'}
                                    </div>
                                </div>
                                <div className="info-cell">
                                    <label>QUYỀN XÓA</label>
                                    <div className="info-val">
                                        {hasUsage ? 'Không được phép' : 'Được phép'}
                                    </div>
                                </div>
                                <div className="info-cell">
                                    {/* Empty balance cell */}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Sử dụng & Trạng thái */}
                    <div className="detail-card">
                        <div className="detail-card-header">
                            <h3>SỬ DỤNG & TRẠNG THÁI - TOÀN CHƯƠNG TRÌNH</h3>
                        </div>
                        <div className="detail-card-body">
                            <div className="info-grid-5">
                                <div className="info-cell">
                                    <label>HẠN MỨC</label>
                                    <div className="info-stat-num">
                                        {promo.maxUsage === null || promo.maxUsage === undefined ? 'KHÔNG GIỚI HẠN' : promo.maxUsage}
                                    </div>
                                </div>
                                <div className="info-cell">
                                    <label>ĐÃ DÙNG</label>
                                    <div className="info-stat-num">{promo.usedUsage || 0}</div>
                                </div>
                                <div className="info-cell">
                                    <label>ĐANG GIỮ</label>
                                    <div className="info-stat-num">{promo.holdingCount || 0}</div>
                                </div>
                                <div className="info-cell">
                                    <label>ĐÃ GIẢI PHÓNG</label>
                                    <div className="info-stat-num">{promo.releasedCount || 0}</div>
                                </div>
                                <div className="info-cell">
                                    <label>CÒN LẠI</label>
                                    <div className="info-stat-num">
                                        {promo.remainingUsage === null || promo.remainingUsage === undefined ? 'KHÔNG GIỚI HẠN' : promo.remainingUsage}
                                    </div>
                                </div>
                            </div>
                            <div className="detail-card-footnote">
                                Không chỉnh bộ đếm bằng tay. Hạn mức hữu hạn tối thiểu phải đáp ứng đã dùng + đang giữ: {(promo.usedUsage || 0) + (promo.holdingCount || 0)}.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CẤU HÌNH ƯU ĐÃI (Ảnh 1 & 2) */}
            {activeTab === 'CAU_HINH' && (
                <div className="detail-tab-content">
                    {/* KHUNG CHỈNH SỬA - XÁC NHẬN PHIÊN BẢN (Ảnh 1 & 2) */}
                    {isEditing && (
                        <div className="detail-card edit-card-highlight">
                            <div className="detail-card-header">
                                <h3>CHỈNH SỬA - XÁC NHẬN PHIÊN BẢN {promo.configVersion || 1}</h3>
                            </div>
                            <div className="detail-card-body">
                                <div className="edit-card-sub-info">
                                    KM05 dùng PATCH. Lưu thay đổi không khôi phục chương trình đang tạm dừng.
                                </div>

                                <div className="edit-lock-quote">
                                    Cấu hình đã khóa theo quyền KM04. Không suy ra quyền từ số lượt đã dùng. Chỉ sửa tên, mô tả, gia hạn kết thúc và hạn mức hợp lệ.
                                </div>

                                <div className="edit-form-grid">
                                    {/* Hàng 1: Tên chương trình & Mô tả */}
                                    <div className="edit-form-field">
                                        <label>TÊN CHƯƠNG TRÌNH</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="edit-field-input"
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>MÔ TẢ</label>
                                        <textarea
                                            rows={2}
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className="edit-field-textarea"
                                        />
                                    </div>

                                    {/* Hàng 2: Ngày kết thúc / Gia hạn & Số lượt áp dụng */}
                                    <div className="edit-form-field">
                                        <label>NGÀY KẾT THÚC / GIA HẠN</label>
                                        <input
                                            type="datetime-local"
                                            value={editEndDate}
                                            onChange={(e) => setEditEndDate(e.target.value)}
                                            className="edit-field-input"
                                        />
                                    </div>
                                    <div className="edit-form-field">
                                        <label>SỐ LƯỢT ÁP DỤNG</label>
                                        <input
                                            type="number"
                                            value={editMaxUsage}
                                            disabled={editUnlimited}
                                            placeholder={editUnlimited ? 'Không giới hạn' : 'Nhập số lượt'}
                                            onChange={(e) => setEditMaxUsage(e.target.value)}
                                            className="edit-field-input"
                                        />
                                        <div className="edit-checkbox-row">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={editUnlimited}
                                                    onChange={(e) => {
                                                        setEditUnlimited(e.target.checked);
                                                        if (e.target.checked) setEditMaxUsage('');
                                                    }}
                                                />
                                                KHÔNG GIỚI HẠN
                                            </label>
                                        </div>
                                        <div className="edit-field-footnote">
                                            Tối thiểu 1 lượt nếu hữu hạn. Không sửa bộ đếm.
                                        </div>
                                    </div>
                                </div>

                                {/* Hàng nút hành động của Card Chỉnh sửa (Ảnh 1 & 2) */}
                                <div className="edit-card-actions-row">
                                    <button
                                        type="button"
                                        className="btn-edit-save-black"
                                        disabled={busy}
                                        onClick={handleSaveEdit}
                                    >
                                        LƯU THAY ĐỔI
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-edit-cancel-white"
                                        disabled={busy}
                                        onClick={handleCancelEdit}
                                    >
                                        HỦY
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-edit-simulate-prototype"
                                        onClick={handleSimulateNewVersion}
                                    >
                                        PROTOTYPE: MÔ PHỎNG PHIÊN KHÁC CẬP NHẬT
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Card 1: Cấu hình ưu đãi đang được lưu */}
                    <div className="detail-card">
                        <div className="detail-card-header">
                            <h3>CẤU HÌNH ƯU ĐÃI ĐANG ĐƯỢC LƯU</h3>
                        </div>
                        <div className="detail-card-body">
                            <div className="info-grid-3">
                                <div className="info-cell">
                                    <label>PHƯƠNG THỨC</label>
                                    <div className="info-val bold">{promo.method}</div>
                                </div>
                                <div className="info-cell">
                                    <label>LOẠI CHIẾT KHẤU</label>
                                    <div className="info-val">{isGiftMethod ? 'Không cấu hình' : (promo.discountType || 'Không cấu hình')}</div>
                                </div>
                                <div className="info-cell">
                                    <label>PHẠM VI</label>
                                    <div className="info-val bold">{promo.target}</div>
                                </div>

                                <div className="info-cell">
                                    <label>ƯU ĐÃI</label>
                                    <div className="info-val bold">
                                        {isGiftMethod ? 'TẶNG BỘ QUÀ' : (promo.discountValue != null ? (Number(promo.discountValue) <= 100 && promo.discountType?.includes('phần trăm') ? `GIẢM ${promo.discountValue}%` : `GIẢM ${Number(promo.discountValue).toLocaleString('vi-VN')} đ`) : 'GIẢM TIỀN')}
                                    </div>
                                </div>
                                <div className="info-cell">
                                    <label>MỨC GIẢM TỐI ĐA</label>
                                    <div className="info-val">{promo.maxDiscount ? formatMoney(promo.maxDiscount) : 'Không cấu hình'}</div>
                                </div>
                                <div className="info-cell">
                                    <label>GIÁ TRỊ HÀNG TỐI THIỂU</label>
                                    <div className="info-val">{promo.minOrderValue ? formatMoney(promo.minOrderValue) : 'Không cấu hình'}</div>
                                </div>

                                <div className="info-cell">
                                    <label>SỐ LƯỢNG MUA TỐI THIỂU</label>
                                    <div className="info-val">{promo.minQuantity ? promo.minQuantity : 'Không cấu hình'}</div>
                                </div>
                                <div className="info-cell">
                                    <label>BẮT ĐẦU</label>
                                    <div className="info-val">{formatDateTime(promo.startDate)}</div>
                                </div>
                                <div className="info-cell">
                                    <label>KẾT THÚC</label>
                                    <div className="info-val">{formatDateTime(promo.endDate)}</div>
                                </div>
                            </div>
                            <div className="detail-card-footnote">
                                {isGiftMethod
                                    ? 'Một đơn đủ điều kiện nhận một bộ quà gồm tất cả dòng tặng; mọi điều kiện mua theo phiên bản phải thỏa mãn. Lịch sử đơn dùng snapshot riêng, không tính lại theo cấu hình này.'
                                    : 'Áp dụng chiết khấu tự động cho đơn hàng thỏa mãn điều kiện mua; lịch sử đơn áp dụng snapshot riêng.'}
                            </div>
                        </div>
                    </div>

                 {/* Card 2: Phiên bản mua / áp dụng */}
                 <div className="detail-card">
                     <div className="detail-card-header">
                         <h3>PHIÊN BẢN MUA / ÁP DỤNG</h3>
                     </div>

                     <div className="detail-card-body table-body">
                         <div
                             className="admin-table-scroll admin-table-scroll--embedded"
                             tabIndex={0}
                             role="region"
                             aria-label="Phiên bản mua hoặc áp dụng"
                         >
                             <table className="detail-table-dark admin-data-table admin-data-table--records">
                                 <thead>
                                     <tr>
                                         <th>SẢN PHẨM / PHIÊN BẢN</th>
                                         <th>SKU / MÃ VẠCH</th>
                                         <th>SỐ LƯỢNG</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {buyProducts.length > 0 ? (
                                         buyProducts.map((p, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="item-name-bold">{p.name}</div>
                                                    <div className="item-sub-desc">{p.version}</div>
                                                </td>
                                                <td>{p.sku || p.code || '-'}</td>
                                                <td>{p.reqQuantity || p.quantity || 1}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="empty-table-text">
                                                Không có dòng mua theo phiên bản trong cấu hình trả về.
                                            </td>
                                        </tr>
                                     )}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 </div>

                 {/* Card 3: Bộ quà cấu hình */}
                 <div className="detail-card">
                     <div className="detail-card-header">
                         <h3>BỘ QUÀ CẤU HÌNH</h3>
                     </div>

                     <div className="detail-card-body table-body">
                         <div
                             className="admin-table-scroll admin-table-scroll--embedded"
                             tabIndex={0}
                             role="region"
                             aria-label="Bộ quà cấu hình"
                         >
                             <table className="detail-table-dark admin-data-table admin-data-table--records">
                                <thead>
                                    <tr>
                                        <th>SẢN PHẨM / PHIÊN BẢN</th>
                                        <th>SKU / MÃ VẠCH</th>
                                        <th>SỐ LƯỢNG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {giftProducts.length > 0 ? (
                                        giftProducts.map((p, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="item-name-bold">{p.name}</div>
                                                    <div className="item-sub-desc">{p.version}</div>
                                                </td>
                                                <td>{p.sku || p.code || '-'}</td>
                                                <td>{p.giftQuantity || p.quantity || 1}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="empty-table-text">
                                                Không có sản phẩm tặng trong cấu hình.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: ĐƠN HÀNG ÁP DỤNG */}
            {activeTab === 'DON_HANG' && (
                <div className="detail-tab-content">
                    {/* Filter container for Orders */}
                    <div className="order-filter-box">
                        <div className="order-filter-inputs">
                            <input
                                type="text"
                                placeholder="TÌM MÃ ĐƠN / KHÁCH / SĐT..."
                                value={orderSearch}
                                onChange={(e) => setOrderSearch(e.target.value)}
                                className="order-search-input"
                            />
                            <FormDropdown
                                value={orderStatusFilter}
                                onChange={(e) => setOrderStatusFilter(e.target.value)}
                                className="order-status-select"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="Đã sử dụng">Đã sử dụng</option>
                                <option value="Đang giữ">Đang giữ</option>
                                <option value="Đã giải phóng">Đã giải phóng</option>
                                <option value="HOÀN THÀNH">Hoàn thành</option>
                            </FormDropdown>
                            <div className="order-date-item">
                                <label>TỪ NGÀY</label>
                                <input
                                    type="date"
                                    value={orderFromDate}
                                    onChange={(e) => setOrderFromDate(e.target.value)}
                                />
                            </div>
                            <div className="order-date-item">
                                <label>ĐẾN NGÀY</label>
                                <input
                                    type="date"
                                    value={orderToDate}
                                    onChange={(e) => setOrderToDate(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn-order-clear-filter"
                                onClick={() => {
                                    setOrderSearch('');
                                    setOrderStatusFilter('ALL');
                                    setOrderFromDate('');
                                    setOrderToDate('');
                                }}
                            >
                                XÓA BỘ LỌC
                            </button>
                        </div>
                        <div className="order-filter-footnote">
                            Lọc theo ngày tạo đơn. Các snapshot mẫu giữ ngày tạo của Order gốc, không tự chuyển lịch sử vào kỳ hiện tại. Tiền giảm và quà đọc từ snapshot khi chốt ưu đãi.
                        </div>
                    </div>

                    {/* Table of Applied Orders */}
                    <div className="detail-card">
                        <div className="detail-card-body table-body">
                            <table className="detail-table-dark">
                                <thead>
                                    <tr>
                                        <th>MÃ ĐƠN HÀNG</th>
                                        <th>KÊNH BÁN</th>
                                        <th>KHÁCH / NGƯỜI NHẬN</th>
                                        <th>NGÀY TẠO</th>
                                        <th>TRẠNG THÁI ĐƠN</th>
                                        <th>TRẠNG THÁI LƯỢT</th>
                                        <th>TIỀN GIẢM</th>
                                        <th>QUÀ TẶNG</th>
                                        <th>THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length > 0 ? (
                                        filteredOrders.map((order, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="item-name-bold">{order.code}</div>
                                                    <div className="order-sub-gray">{order.snapshotText || `Snapshot: ${promo.code} v1`}</div>
                                                    <div className="order-sub-gray">{order.snapshotName || promo.name}</div>
                                                    <div className="order-sub-gray">{order.snapshotFinalized || `Chốt: ${order.createdAt || ''}`}</div>
                                                </td>
                                                <td>{order.channel || 'Tại quầy'}</td>
                                                <td>
                                                    <div className="item-name-bold">{order.customer || 'Khách vãng lai'}</div>
                                                    <div className="order-sub-gray">{order.phone || ''}</div>
                                                </td>
                                                <td>{order.createdAt || order.date}</td>
                                                <td>
                                                    <span className="order-status-bold">{order.orderStatus || order.status}</span>
                                                </td>
                                                <td>{order.usageStatus || 'Đã sử dụng'}</td>
                                                <td>{order.discountAmount || '0đ'}</td>
                                                <td>
                                                    <div className="order-gift-name">{order.giftName || '-'}</div>
                                                    <div className="order-sub-gray">{order.giftStatus || ''}</div>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn-order-view"
                                                        onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${encodeURIComponent(order.code)}`)}
                                                    >
                                                        XEM ĐƠN
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="empty-table-text">
                                                Không có đơn hàng nào khớp với bộ lọc hiện tại.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Order Pagination Bar */}
                    <div className="order-pagination-bar">
                        <div className="order-pagination-info">
                            {filteredOrders.length} đơn · Trang 1/1
                        </div>
                        <div className="order-pagination-btns">
                            <button type="button" className="btn-page-ctrl" disabled>TRƯỚC</button>
                            <button type="button" className="btn-page-ctrl" disabled>SAU</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: THỐNG KÊ */}
            {activeTab === 'THONG_KE' && (
                <div className="detail-tab-content">
                    {/* Card 1: Kỳ báo cáo */}
                    <div className="detail-card">
                        <div className="detail-card-header">
                            <h3>KỲ BÁO CÁO</h3>
                        </div>
                        <div className="detail-card-body">
                            <div className="stat-report-inputs">
                                <div className="stat-date-field">
                                    <label>TỪ NGÀY</label>
                                    <input
                                        type="date"
                                        value={statFromDate}
                                        onChange={(e) => setStatFromDate(e.target.value)}
                                    />
                                </div>
                                <div className="stat-date-field">
                                    <label>ĐẾN NGÀY</label>
                                    <input
                                        type="date"
                                        value={statToDate}
                                        onChange={(e) => setStatToDate(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn-stat-submit"
                                    onClick={() => setHasCalculatedStats(true)}
                                >
                                    XEM THỐNG KÊ
                                </button>
                            </div>
                            <div className="stat-report-subtext">
                                KM09 nhận kỳ YYYY-MM-DD. Nhóm đơn theo thời điểm chốt ưu đãi và trạng thái lượt hiện tại, không theo ngày quà thực giao vật lý.
                            </div>
                        </div>
                    </div>

                    {!hasCalculatedStats ? (
                        <>
                            <div className="stat-hint-box">
                                Chọn kỳ và bấm XEM THỐNG KÊ để đọc phản hồi KM09. Không tổng hợp từ trang đơn đang hiển thị.
                            </div>
                            <div className="stat-hint-box">
                                Tiền giảm không phải doanh thu thuần, lợi nhuận hoặc phiếu chi. Quà không tạo Cashbook CHI. Lượt đã giải phóng và snapshot tiền vẫn giữ để kiểm toán; trả hàng không tự khôi phục lượt dùng.
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Card A: Tổng lượt hiện tại - Toàn chương trình */}
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <h3>A. TỔNG LƯỢT HIỆN TẠI - TOÀN CHƯƠNG TRÌNH</h3>
                                </div>
                                <div className="detail-card-body">
                                    <div className="info-grid-3">
                                        <div className="info-cell">
                                            <label>ĐANG GIỮ</label>
                                            <div className="stat-huge-number">{promo.holdingCount || 0}</div>
                                        </div>
                                        <div className="info-cell">
                                            <label>ĐÃ SỬ DỤNG</label>
                                            <div className="stat-huge-number">{promo.usedUsage || 0}</div>
                                        </div>
                                        <div className="info-cell">
                                            <label>ĐÃ GIẢI PHÓNG</label>
                                            <div className="stat-huge-number">{promo.releasedCount || 0}</div>
                                        </div>
                                    </div>
                                    <div className="detail-card-footnote">
                                        Các số này không bị lọc theo kỳ báo cáo.
                                    </div>
                                </div>
                            </div>

                            {/* Card B: Đơn chốt ưu đãi trong kỳ */}
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <h3>B. ĐƠN CHỐT ƯU ĐÃI TRONG KỲ</h3>
                                </div>
                                <div className="detail-card-body">
                                    <div className="info-grid-3" style={{ marginBottom: '24px' }}>
                                        <div className="info-cell">
                                            <label>ĐANG GIỮ</label>
                                            <div className="stat-huge-number">0</div>
                                        </div>
                                        <div className="info-cell">
                                            <label>ĐÃ SỬ DỤNG</label>
                                            <div className="stat-huge-number">0</div>
                                        </div>
                                        <div className="info-cell">
                                            <label>ĐÃ GIẢI PHÓNG</label>
                                            <div className="stat-huge-number">0</div>
                                        </div>
                                    </div>

                                    <div className="info-grid-2-custom">
                                        <div className="info-cell">
                                            <label>TIỀN GIẢM LÚC GIAO · ĐƠN ĐÃ SỬ DỤNG</label>
                                            <div className="stat-huge-number">0đ</div>
                                        </div>
                                        <div className="info-cell">
                                            <label>SỐ QUÀ ĐÃ GIAO · ĐƠN ĐÃ SỬ DỤNG</label>
                                            <div className="stat-huge-number">0</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Quà đã giao theo chứng từ */}
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <h3>QUÀ ĐÃ GIAO THEO CHỨNG TỪ</h3>
                                </div>
                                <div className="detail-card-body">
                                    <div className="stat-empty-row">
                                        Không có dòng quà giao đã được ghi nhận trong nguồn báo cáo.
                                    </div>
                                </div>
                            </div>

                            {/* Footer Box 1 */}
                            <div className="stat-footer-box">
                                <div>Múi giờ: Asia/Ho_Chi_Minh</div>
                                <div>Mốc thời gian tháng/kỳ: Thời điểm chốt ưu đãi xong; nhóm theo trạng thái lượt hiện tại.</div>
                            </div>

                            {/* Footer Box 2 */}
                            <div className="stat-footer-box">
                                Tiền giảm không phải doanh thu thuần, lợi nhuận hoặc phiếu chi. Quà không tạo Cashbook CHI. Lượt đã giải phóng và snapshot tiền vẫn giữ để kiểm toán; trả hàng không tự khôi phục lượt dùng.
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Modal: Chặn xóa chương trình đã có lịch sử */}
            {deleteBlockedModal && (
                <div className="detail-modal-overlay" onClick={() => setDeleteBlockedModal(false)}>
                    <div className="detail-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-alert">
                            <h3>KHÔNG ĐƯỢC PHÉP XÓA CHƯƠNG TRÌNH</h3>
                        </div>
                        <div className="modal-body-content">
                            <p>
                                Chương trình <strong>{promo.code}</strong> đã phát sinh lịch sử kiểm toán hoặc lượt áp dụng ({promo.usedUsage || 0} đã dùng, {promo.releasedCount || 0} đã giải phóng).
                            </p>
                            <p className="modal-sub-alert">
                                Theo quy chuẩn KM04, để bảo toàn lịch sử đơn hàng và dữ liệu kiểm toán, vui lòng sử dụng chức năng <strong>TẠM DỪNG CHƯƠNG TRÌNH</strong> thay vì xóa.
                            </p>
                        </div>
                        <div className="modal-footer-row">
                            <button
                                type="button"
                                className="btn-modal-cancel"
                                onClick={() => setDeleteBlockedModal(false)}
                            >
                                ĐÃ HIỂU
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Xác nhận xóa chương trình an toàn */}
            {showDeleteModal && (
                <div className="detail-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="detail-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-alert">
                            <h3>XÓA CHƯƠNG TRÌNH KHUYẾN MẠI?</h3>
                        </div>
                        <div className="modal-body-content">
                            <p>
                                Bạn có chắc chắn muốn xóa chương trình <strong>{promo.code}</strong> - {promo.name}?
                            </p>
                            <p className="modal-sub-alert">
                                Thao tác này sẽ xóa vĩnh viễn chương trình khuyến mại khỏi hệ thống.
                            </p>
                        </div>
                        <div className="modal-footer-row">
                            <button
                                type="button"
                                className="btn-modal-cancel"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                HỦY
                            </button>
                            <button
                                type="button"
                                className="btn-modal-danger"
                                disabled={busy}
                                onClick={handleConfirmDelete}
                            >
                                XÁC NHẬN XÓA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
