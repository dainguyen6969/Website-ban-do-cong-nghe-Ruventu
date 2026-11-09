import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    ChevronRight,
    FileText,
    Sliders,
    ShoppingBag,
    BarChart2,
    RefreshCw,
    Edit3,
    Pause,
    Play,
    Trash2,
    SquareCheck as CheckCircle2,
    MessageSquareText as Info,
    AlertTriangle,
    Layers,
    Tag,
    Clock,
    Lock,
    Unlock,
    Gift
} from 'lucide-react';
import { getPromotion, updatePromotion, deletePromotion, setPromotionStatus } from '../api/promotionApi.js';
import { normalizePromotion, editPromotionBody, computePromotionStatus } from '../promotionModel.js';
import { findDemoPromotion, updateStoredPromotion } from '../demoPromotions.js';
import { WarrantyBadge, WarrantyFields, WarrantyPanel, WarrantyTable } from '../../warranty/components/WarrantyShell';
import '../../warranty/styles/warrantyShell.css';
import './ChiTietKhuyenMai.css';

const TABS = [
    { key: 'TONG_QUAN', label: 'TỔNG QUAN', icon: FileText },
    { key: 'CAU_HINH', label: 'CẤU HÌNH ƯU ĐÃI', icon: Sliders },
    { key: 'DON_HANG', label: 'ĐƠN HÀNG ÁP DỤNG', icon: ShoppingBag },
    { key: 'THONG_KE', label: 'THỐNG KÊ', icon: BarChart2 }
];

const PROMO_STAGES = [
    'Khởi tạo',
    'Thiết lập',
    'Đang áp dụng',
    'Tạm dừng / Giữ lượt',
    'Kết thúc'
];

export default function ChiTietKhuyenMai() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [promo, setPromo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('TONG_QUAN');
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteBlockedModal, setDeleteBlockedModal] = useState(false);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);

    // Edit form states
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

    const fetchPromoData = async (signal) => {
        setLoading(true);
        setError('');

        const demoFound = findDemoPromotion(id);
        if (demoFound) {
            setPromo(demoFound);
            resetEditForm(demoFound);
        }

        try {
            const apiData = await getPromotion(id, signal);
            if (signal?.aborted) return;
            const normalized = normalizePromotion(apiData);
            setPromo(normalized);
            resetEditForm(normalized);
        } catch {
            if (!demoFound) {
                if (!signal?.aborted) {
                    setError('Không tìm thấy chương trình khuyến mại.');
                }
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchPromoData(controller.signal);
        return () => controller.abort();
    }, [id, reloadTick]);

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

    if (loading && !promo) {
        return (
            <div className="w-shell">
                <div className="w-shell-content">
                    <div className="w-empty-state">
                        <Tag size={36} />
                        <h1>Đang tải thông tin chương trình khuyến mại…</h1>
                        <p role="status">Vui lòng chờ trong giây lát.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!promo) {
        return (
            <div className="w-shell">
                <div className="w-shell-content">
                    <div className="w-empty-state">
                        <Tag size={36} />
                        <h1>{error || 'Không tìm thấy chương trình khuyến mại'}</h1>
                        <p role="alert">Mã hoặc định danh chương trình không tồn tại hoặc đã bị xóa.</p>
                        <div className="w-shell-actions">
                            <button
                                type="button"
                                className="w-shell-button"
                                onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                            >
                                <ArrowLeft size={15} /> Quay lại danh sách
                            </button>
                        </div>
                    </div>
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

    // Determine current lifecycle stage index (0 to 4)
    let currentStageIndex = 2; // Default to 'Đang áp dụng'
    if (promo.status === 'CHƯA BẮT ĐẦU') currentStageIndex = 1;
    else if (promo.status === 'TẠM DỪNG') currentStageIndex = 3;
    else if (promo.status === 'HẾT HẠN' || promo.status === 'HẾT LƯỢT') currentStageIndex = 4;
    else if (promo.status === 'ĐANG ÁP DỤNG') currentStageIndex = 2;

    // Status badge tone
    const statusTone = promo.status === 'ĐANG ÁP DỤNG' ? 'green' : promo.status === 'TẠM DỪNG' ? 'amber' : promo.status === 'CHƯA BẮT ĐẦU' ? 'blue' : 'red';

    // Next step guidance based on promo status
    const getNextStepGuide = () => {
        if (promo.status === 'TẠM DỪNG') {
            return {
                eyebrow: 'Trạng thái & việc tiếp theo',
                title: 'CHƯƠNG TRÌNH ĐANG TẠM DỪNG ÁP DỤNG',
                text: 'Chương trình đang bị tạm dừng thủ công bởi quản trị viên. Đơn hàng mới sẽ không được áp dụng ưu đãi này; các đơn hàng đang giữ lượt trước đó vẫn được bảo toàn dữ liệu.',
                btnLabel: 'KHÔI PHỤC ÁP DỤNG',
                action: handleToggleStatus
            };
        }
        if (promo.status === 'CHƯA BẮT ĐẦU') {
            return {
                eyebrow: 'Trạng thái & việc tiếp theo',
                title: 'CHƯA ĐẾN THỜI ĐIỂM HIỆU LỰC',
                text: `Chương trình sẽ tự động kích hoạt khi đến thời điểm bắt đầu (${formatDateTime(promo.startDate)}). Bạn vẫn có thể xem lại hoặc chỉnh sửa cấu hình ưu đãi an toàn.`,
                btnLabel: 'XEM CẤU HÌNH ƯU ĐÃI',
                action: () => setActiveTab('CAU_HINH')
            };
        }
        if (promo.status === 'HẾT HẠN' || promo.status === 'HẾT LƯỢT') {
            return {
                eyebrow: 'Trạng thái & việc tiếp theo',
                title: 'CHƯƠNG TRÌNH ĐÃ KẾT THÚC / HẾT HẠN MỨC',
                text: 'Chương trình đã chạm mốc thời gian kết thúc hoặc hết số lượt áp dụng quy định. Nếu muốn tiếp tục chạy, bạn có thể gia hạn ngày kết thúc hoặc nâng hạn mức áp dụng.',
                btnLabel: 'GIA HẠN / SỬA CẤU HÌNH',
                action: handleStartEdit
            };
        }
        return {
            eyebrow: 'Trạng thái & việc tiếp theo',
            title: 'CHƯƠNG TRÌNH ĐANG ÁP DỤNG TỰ ĐỘNG',
            text: 'Ưu đãi đang hoạt động bình thường trên toàn hệ thống. Mọi đơn hàng thỏa mãn điều kiện mua sẽ được áp dụng tự động và giữ lượt theo quy trình kiểm toán.',
            btnLabel: 'QUẢN LÝ CẤU HÌNH ƯU ĐÃI',
            action: () => setActiveTab('CAU_HINH')
        };
    };

    const guide = getNextStepGuide();

    return (
        <div className="w-shell promo-detail-shell">
            {/* HERO HEADER (Exactly like ChiTietBaoHanh) */}
            <header className="w-shell-hero">
                <div>
                    <p className="w-shell-breadcrumb">
                        KHUYẾN MẠI <ChevronRight size={12} /> CHI TIẾT CHƯƠNG TRÌNH
                    </p>
                    <div className="w-shell-title-row">
                        <h1>{promo.code}</h1>
                        <WarrantyBadge tone={statusTone}>
                            {promo.status}
                        </WarrantyBadge>
                        <span className="promo-version-pill">
                            Phiên bản {promo.configVersion || 1}
                        </span>
                    </div>
                    <p>
                        {promo.name} <span className="w-text-divider">/</span> {promo.method} · {promo.target}
                    </p>
                </div>

                <div className="w-shell-actions">
                    <button
                        type="button"
                        className="w-shell-button"
                        onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                    >
                        <ArrowLeft size={15} /> Danh sách
                    </button>
                    <button
                        type="button"
                        className="w-shell-button"
                        disabled={busy}
                        onClick={() => setReloadTick(v => v + 1)}
                    >
                        <RefreshCw size={15} /> Tải lại
                    </button>
                    <button
                        type="button"
                        className="w-shell-button w-shell-button--black"
                        onClick={handleStartEdit}
                    >
                        <Edit3 size={15} /> Chỉnh sửa
                    </button>
                    <button
                        type="button"
                        className="w-shell-button"
                        disabled={busy}
                        onClick={handleToggleStatus}
                    >
                        {promo.savedStatus === 0 ? <><Play size={15} /> Khôi phục</> : <><Pause size={15} /> Tạm dừng</>}
                    </button>
                    <button
                        type="button"
                        className="w-shell-button w-button-danger"
                        disabled={busy}
                        onClick={handleDeleteClick}
                    >
                        <Trash2 size={15} /> Xóa
                    </button>
                </div>
            </header>

            {/* Banners for feedback */}
            {messageOrAlert(error, successMsg, loading)}

            {/* DETAIL OVERVIEW (Process timeline + Next Step card + Summary strip) */}
            <div className="w-detail-overview">
                {/* 5-Stage Process Line */}
                <div className="w-process" aria-label="Vị trí hiện tại trong vòng đời khuyến mại">
                    {PROMO_STAGES.map((label, index) => (
                        <div
                            key={label}
                            className={currentStageIndex === index ? 'is-current' : ''}
                            aria-current={currentStageIndex === index ? 'step' : undefined}
                        >
                            <span>{index + 1}</span>
                            <strong>{label}</strong>
                            {index < PROMO_STAGES.length - 1 && <ChevronRight size={16} />}
                        </div>
                    ))}
                </div>

                {/* Next Step Guidance Box */}
                <div className="w-next-step">
                    <div>
                        <span className="w-eyebrow">{guide.eyebrow}</span>
                        <h2>{guide.title}</h2>
                        <p>{guide.text}</p>
                    </div>
                    {guide.btnLabel && (
                        <button
                            type="button"
                            className="w-shell-button w-shell-button--black"
                            disabled={busy}
                            onClick={guide.action}
                        >
                            {guide.btnLabel} <ArrowRight size={17} />
                        </button>
                    )}
                </div>

                {/* 3-Column Summary Strip */}
                <div className="w-summary-strip promo-summary-strip">
                    <div className="promo-strip-cell">
                        <span>PHƯƠNG THỨC & PHẠM VI</span>
                        <div className="promo-scope-tags">
                            <span className={`promo-method-tag promo-method-tag--${promo.method === 'TẶNG SẢN PHẨM' ? 'gift' : 'discount'}`}>
                                {promo.method}
                            </span>
                            <span className="w-text-divider">·</span>
                            <span className="promo-target-tag">{promo.target}</span>
                        </div>
                    </div>
                    <div className="promo-strip-cell">
                        <span>THỜI HẠN ÁP DỤNG</span>
                        <strong className="promo-date-highlight">
                            <Clock size={13} /> {formatDateTime(promo.startDate)} — {formatDateTime(promo.endDate)}
                        </strong>
                    </div>
                    <div className="promo-strip-cell">
                        <span>TÌNH HÌNH LƯỢT</span>
                        <div className="promo-usage-strip-val">
                            <span>Đã dùng <strong className="val-used">{promo.usedUsage || 0}</strong></span>
                            <span className="w-text-divider">/</span>
                            <span>Còn lại <strong className="val-remaining">{promo.remainingUsage === null || promo.remainingUsage === undefined ? 'Không giới hạn' : promo.remainingUsage}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION (Black themed tabs with icons like Image 2) */}
            <nav className="w-shell-tabs" aria-label="Các nhóm thông tin chương trình khuyến mại">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        type="button"
                        key={key}
                        aria-current={activeTab === key ? 'page' : undefined}
                        onClick={() => setActiveTab(key)}
                    >
                        <Icon size={17} />
                        {label}
                    </button>
                ))}
            </nav>

            {/* MAIN CONTENT GRID (Main column on left + Aside sidebar on right) */}
            <div className="w-shell-content">
                <div className="w-shell-detail-grid">
                    {/* LEFT COLUMN: Main tab details */}
                    <main>
                        {/* TAB 1: TỔNG QUAN */}
                        {activeTab === 'TONG_QUAN' && (
                            <>
                                <WarrantyPanel
                                    title="TỔNG QUAN CHƯƠNG TRÌNH"
                                    note="Thông tin pháp lý, định danh và phạm vi hiệu lực của chương trình khuyến mại."
                                >
                                    <WarrantyFields
                                        fields={[
                                            ['Mã chương trình', <span className="promo-code-badge">{promo.code}</span>],
                                            ['Tên chương trình', <strong className="promo-name-text">{promo.name}</strong>],
                                            ['Phiên bản cấu hình', <span className="promo-version-pill">Phiên bản {promo.configVersion || 1}</span>],
                                            ['Phương thức', (
                                                <span className={`promo-method-tag promo-method-tag--${promo.method === 'TẶNG SẢN PHẨM' ? 'gift' : 'discount'}`}>
                                                    {promo.method}
                                                </span>
                                            )],
                                            ['Phạm vi áp dụng', <span className="promo-target-tag">{promo.target}</span>],
                                            ['Cờ quản lý', (
                                                <span className={`status-pill status-pill--${promo.savedStatus === 0 ? 'paused' : 'active'}`}>
                                                    {promo.savedStatus === 0 ? '⏸ Tạm dừng (0)' : '● Đang bật (1)'}
                                                </span>
                                            )],
                                            ['Bắt đầu', formatDateTime(promo.startDate)],
                                            ['Kết thúc', formatDateTime(promo.endDate)],
                                            ['Mô tả', promo.description || 'Không có mô tả'],
                                            ['Quyền sửa cấu hình', hasUsage ? <span className="perm-locked">Đã khóa; chỉ sửa thông tin an toàn</span> : <span className="perm-allowed">Được phép sửa cấu hình</span>],
                                            ['Quyền xóa', hasUsage ? <span className="perm-forbidden">Không được phép (đã có lượt áp dụng)</span> : <span className="perm-allowed">Được phép xóa</span>],
                                        ]}
                                    />
                                </WarrantyPanel>

                                <WarrantyPanel
                                    title="SỬ DỤNG & TRẠNG THÁI - TOÀN CHƯƠNG TRÌNH"
                                    note="Thống kê tổng hợp toàn bộ các lượt áp dụng của chương trình qua các đơn hàng."
                                >
                                    <div className="promo-stat-strip-grid">
                                        <div className="promo-stat-box">
                                            <span className="promo-stat-label">HẠN MỨC</span>
                                            <strong className="promo-stat-value">
                                                {promo.maxUsage === null || promo.maxUsage === undefined ? 'KHÔNG GIỚI HẠN' : promo.maxUsage}
                                            </strong>
                                        </div>
                                        <div className="promo-stat-box">
                                            <span className="promo-stat-label">ĐÃ DÙNG</span>
                                            <strong className="promo-stat-value promo-stat-value--active">
                                                {promo.usedUsage || 0}
                                            </strong>
                                        </div>
                                        <div className="promo-stat-box">
                                            <span className="promo-stat-label">ĐANG GIỮ</span>
                                            <strong className="promo-stat-value promo-stat-value--holding">
                                                {promo.holdingCount || 0}
                                            </strong>
                                        </div>
                                        <div className="promo-stat-box">
                                            <span className="promo-stat-label">ĐÃ GIẢI PHÓNG</span>
                                            <strong className="promo-stat-value">
                                                {promo.releasedCount || 0}
                                            </strong>
                                        </div>
                                        <div className="promo-stat-box">
                                            <span className="promo-stat-label">CÒN LẠI</span>
                                            <strong className="promo-stat-value promo-stat-value--remaining">
                                                {promo.remainingUsage === null || promo.remainingUsage === undefined ? 'KHÔNG GIỚI HẠN' : promo.remainingUsage}
                                            </strong>
                                        </div>
                                    </div>
                                    <p className="w-shell-note" style={{ marginTop: '16px' }}>
                                        Không chỉnh bộ đếm bằng tay. Hạn mức hữu hạn tối thiểu phải đáp ứng đã dùng + đang giữ: {(promo.usedUsage || 0) + (promo.holdingCount || 0)}.
                                    </p>
                                </WarrantyPanel>
                            </>
                        )}

                        {/* TAB 2: CẤU HÌNH ƯU ĐÃI */}
                        {activeTab === 'CAU_HINH' && (
                            <>
                                {/* Khung chỉnh sửa an toàn khi isEditing = true */}
                                {isEditing && (
                                    <div className="promo-edit-workbench">
                                        <WarrantyPanel
                                            title={`CHỈNH SỬA - XÁC NHẬN PHIÊN BẢN ${promo.configVersion || 1}`}
                                            note="Lưu thay đổi không khôi phục chương trình đang tạm dừng. Chỉ sửa tên, mô tả, gia hạn kết thúc và hạn mức hợp lệ."
                                        >
                                            <div className="promo-edit-fields-grid">
                                                <label className="w-intake-field">
                                                    TÊN CHƯƠNG TRÌNH *
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                    />
                                                </label>

                                                <label className="w-intake-field">
                                                    MÔ TẢ
                                                    <textarea
                                                        rows={2}
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                    />
                                                </label>

                                                <label className="w-intake-field">
                                                    NGÀY KẾT THÚC / GIA HẠN
                                                    <input
                                                        type="datetime-local"
                                                        value={editEndDate}
                                                        onChange={(e) => setEditEndDate(e.target.value)}
                                                    />
                                                </label>

                                                <div className="w-intake-field">
                                                    <label>SỐ LƯỢT ÁP DỤNG</label>
                                                    <input
                                                        type="number"
                                                        value={editMaxUsage}
                                                        disabled={editUnlimited}
                                                        placeholder={editUnlimited ? 'Không giới hạn' : 'Nhập số lượt'}
                                                        onChange={(e) => setEditMaxUsage(e.target.value)}
                                                    />
                                                    <div className="promo-unlimited-checkbox">
                                                        <label>
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
                                                    <small className="w-shell-note">
                                                        Tối thiểu 1 lượt nếu hữu hạn. Không sửa bộ đếm bằng tay.
                                                    </small>
                                                </div>
                                            </div>

                                            <div className="w-shell-actions" style={{ marginTop: '16px' }}>
                                                <button
                                                    type="button"
                                                    className="w-shell-button w-shell-button--black"
                                                    disabled={busy}
                                                    onClick={handleSaveEdit}
                                                >
                                                    LƯU THAY ĐỔI
                                                </button>
                                                <button
                                                    type="button"
                                                    className="w-shell-button"
                                                    disabled={busy}
                                                    onClick={handleCancelEdit}
                                                >
                                                    HỦY
                                                </button>
                                            </div>
                                        </WarrantyPanel>
                                    </div>
                                )}

                                {/* Cấu hình ưu đãi đang lưu */}
                                <WarrantyPanel
                                    title="CẤU HÌNH ƯU ĐÃI ĐANG ĐƯỢC LƯU"
                                    note={isGiftMethod
                                        ? 'Một đơn đủ điều kiện nhận một bộ quà gồm tất cả dòng tặng; mọi điều kiện mua theo phiên bản phải thỏa mãn. Lịch sử đơn dùng snapshot riêng, không tính lại theo cấu hình này.'
                                        : 'Áp dụng chiết khấu tự động cho đơn hàng thỏa mãn điều kiện mua; lịch sử đơn áp dụng snapshot riêng.'}
                                >
                                    <WarrantyFields
                                        fields={[
                                            ['Phương thức', promo.method],
                                            ['Loại chiết khấu', isGiftMethod ? 'Không cấu hình' : (promo.discountType || 'Không cấu hình')],
                                            ['Phạm vi', promo.target],
                                            ['Ưu đãi', isGiftMethod ? 'TẶNG BỘ QUÀ' : (promo.discountValue != null ? (Number(promo.discountValue) <= 100 && promo.discountType?.includes('phần trăm') ? `GIẢM ${promo.discountValue}%` : `GIẢM ${Number(promo.discountValue).toLocaleString('vi-VN')} đ`) : 'GIẢM TIỀN')],
                                            ['Mức giảm tối đa', promo.maxDiscount ? formatMoney(promo.maxDiscount) : 'Không cấu hình'],
                                            ['Giá trị hàng tối thiểu', promo.minOrderValue ? formatMoney(promo.minOrderValue) : 'Không cấu hình'],
                                            ['Số lượng mua tối thiểu', promo.minQuantity ? promo.minQuantity : 'Không cấu hình'],
                                            ['Bắt đầu', formatDateTime(promo.startDate)],
                                            ['Kết thúc', formatDateTime(promo.endDate)],
                                        ]}
                                    />
                                </WarrantyPanel>

                                {/* Bảng phiên bản mua / áp dụng */}
                                <WarrantyPanel
                                    title="PHIÊN BẢN MUA / ÁP DỤNG"
                                    note="Danh sách phiên bản sản phẩm khách hàng cần mua để kích hoạt ưu đãi."
                                >
                                    <WarrantyTable
                                        columns={['SẢN PHẨM / PHIÊN BẢN', 'SKU / MÃ VẠCH', 'SỐ LƯỢNG MUA']}
                                        rows={buyProducts.map(p => [
                                            <div key={p.sku || p.name}>
                                                <strong>{p.name}</strong>
                                                <div className="w-reference-tag">{p.version}</div>
                                            </div>,
                                            p.sku || p.code || '—',
                                            p.reqQuantity || p.quantity || 1
                                        ])}
                                        empty="Không có dòng mua theo phiên bản trong cấu hình trả về."
                                    />
                                </WarrantyPanel>

                                {/* Bảng quà tặng nếu có */}
                                <WarrantyPanel
                                    title="BỘ QUÀ CẤU HÌNH"
                                    note="Danh sách sản phẩm quà tặng được tặng kèm khi đơn thỏa mãn điều kiện."
                                >
                                    <WarrantyTable
                                        columns={['SẢN PHẨM / PHIÊN BẢN', 'SKU / MÃ VẠCH', 'SỐ LƯỢNG TẶNG']}
                                        rows={giftProducts.map(p => [
                                            <div key={p.sku || p.name}>
                                                <strong>{p.name}</strong>
                                                <div className="w-reference-tag">{p.version}</div>
                                            </div>,
                                            p.sku || p.code || '—',
                                            p.giftQuantity || p.quantity || 1
                                        ])}
                                        empty="Không có sản phẩm tặng trong cấu hình."
                                    />
                                </WarrantyPanel>
                            </>
                        )}

                        {/* TAB 3: ĐƠN HÀNG ÁP DỤNG */}
                        {activeTab === 'DON_HANG' && (
                            <>
                                <WarrantyPanel
                                    title="BỘ LỌC ĐƠN HÀNG ÁP DỤNG"
                                    note="Tra cứu đơn hàng theo mã đơn, thông tin khách hàng hoặc khoảng thời gian."
                                >
                                    <div className="promo-order-filter-grid">
                                        <input
                                            type="text"
                                            placeholder="TÌM MÃ ĐƠN / KHÁCH / SĐT..."
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            className="promo-filter-input"
                                        />
                                        <select
                                            value={orderStatusFilter}
                                            onChange={(e) => setOrderStatusFilter(e.target.value)}
                                            className="promo-filter-select"
                                        >
                                            <option value="ALL">Tất cả trạng thái</option>
                                            <option value="Đã sử dụng">Đã sử dụng</option>
                                            <option value="Đang giữ">Đang giữ</option>
                                            <option value="Đã giải phóng">Đã giải phóng</option>
                                            <option value="HOÀN THÀNH">Hoàn thành</option>
                                        </select>
                                        <div className="promo-filter-date-item">
                                            <label>TỪ NGÀY</label>
                                            <input
                                                type="date"
                                                value={orderFromDate}
                                                onChange={(e) => setOrderFromDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="promo-filter-date-item">
                                            <label>ĐẾN NGÀY</label>
                                            <input
                                                type="date"
                                                value={orderToDate}
                                                onChange={(e) => setOrderToDate(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="w-shell-button"
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
                                </WarrantyPanel>

                                <WarrantyPanel
                                    title="DANH SÁCH ĐƠN HÀNG ÁP DỤNG"
                                    note={`Tìm thấy ${filteredOrders.length} đơn hàng khớp với bộ lọc hiện tại.`}
                                >
                                    <WarrantyTable
                                        columns={['MÃ ĐƠN HÀNG', 'KÊNH BÁN', 'KHÁCH / NGƯỜI NHẬN', 'NGÀY TẠO', 'TRẠNG THÁI ĐƠN', 'TRẠNG THÁI LƯỢT', 'TIỀN GIẢM', 'QUÀ TẶNG', 'THAO TÁC']}
                                        rows={filteredOrders.map(order => [
                                            <div key={order.code}>
                                                <strong>{order.code}</strong>
                                                <div className="w-reference-tag">{order.snapshotText || `Snapshot: ${promo.code} v1`}</div>
                                            </div>,
                                            order.channel || 'Tại quầy',
                                            <div>
                                                <strong>{order.customer || 'Khách vãng lai'}</strong>
                                                <div className="w-reference-tag">{order.phone || ''}</div>
                                            </div>,
                                            order.createdAt || order.date || '—',
                                            <WarrantyBadge key="orderStatus" tone={order.orderStatus === 'HOÀN THÀNH' ? 'green' : 'neutral'}>
                                                {order.orderStatus || order.status}
                                            </WarrantyBadge>,
                                            <WarrantyBadge key="usageStatus" tone={order.usageStatus === 'Đã sử dụng' ? 'green' : order.usageStatus === 'Đang giữ' ? 'amber' : 'neutral'}>
                                                {order.usageStatus || 'Đã sử dụng'}
                                            </WarrantyBadge>,
                                            order.discountAmount || '0 đ',
                                            order.giftName || '—',
                                            <button
                                                type="button"
                                                key="viewBtn"
                                                className="w-shell-button"
                                                style={{ minHeight: '30px', padding: '4px 10px' }}
                                                onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${encodeURIComponent(order.code)}`)}
                                            >
                                                Xem đơn
                                            </button>
                                        ])}
                                        empty="Không có đơn hàng nào khớp với bộ lọc hiện tại."
                                    />
                                </WarrantyPanel>
                            </>
                        )}

                        {/* TAB 4: THỐNG KÊ */}
                        {activeTab === 'THONG_KE' && (
                            <>
                                <WarrantyPanel
                                    title="KỲ BÁO CÁO"
                                    note="Chọn khoảng thời gian chốt ưu đãi để tính toán báo cáo áp dụng."
                                >
                                    <div className="promo-stat-filter-row">
                                        <div className="promo-filter-date-item">
                                            <label>TỪ NGÀY</label>
                                            <input
                                                type="date"
                                                value={statFromDate}
                                                onChange={(e) => setStatFromDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="promo-filter-date-item">
                                            <label>ĐẾN NGÀY</label>
                                            <input
                                                type="date"
                                                value={statToDate}
                                                onChange={(e) => setStatToDate(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="w-shell-button w-shell-button--black"
                                            onClick={() => setHasCalculatedStats(true)}
                                        >
                                            XEM THỐNG KÊ
                                        </button>
                                    </div>
                                </WarrantyPanel>

                                {!hasCalculatedStats ? (
                                    <div className="w-empty-inline">
                                        <BarChart2 size={24} />
                                        <p>Vui lòng chọn khoảng thời gian và bấm XEM THỐNG KÊ để xem báo cáo áp dụng ưu đãi.</p>
                                    </div>
                                ) : (
                                    <>
                                        <WarrantyPanel
                                            title="A. TỔNG LƯỢT HIỆN TẠI - TOÀN CHƯƠNG TRÌNH"
                                            note="Các số này phản ánh tổng thể luồng lượt dùng, không bị lọc theo kỳ báo cáo."
                                        >
                                            <div className="promo-stat-grid-3">
                                                <div className="promo-stat-card-highlight">
                                                    <span>ĐANG GIỮ</span>
                                                    <strong>{promo.holdingCount || 0}</strong>
                                                </div>
                                                <div className="promo-stat-card-highlight">
                                                    <span>ĐÃ SỬ DỤNG</span>
                                                    <strong>{promo.usedUsage || 0}</strong>
                                                </div>
                                                <div className="promo-stat-card-highlight">
                                                    <span>ĐÃ GIẢI PHÓNG</span>
                                                    <strong>{promo.releasedCount || 0}</strong>
                                                </div>
                                            </div>
                                        </WarrantyPanel>

                                        <WarrantyPanel
                                            title="B. ĐƠN CHỐT ƯU ĐÃI TRONG KỲ"
                                            note="Tổng hợp tiền giảm và số lượng quà tặng thực tế đã giao trong kỳ được chọn."
                                        >
                                            <div className="promo-stat-grid-3" style={{ marginBottom: '16px' }}>
                                                <div className="promo-stat-card-highlight">
                                                    <span>ĐANG GIỮ</span>
                                                    <strong>0</strong>
                                                </div>
                                                <div className="promo-stat-card-highlight">
                                                    <span>ĐÃ SỬ DỤNG</span>
                                                    <strong>0</strong>
                                                </div>
                                                <div className="promo-stat-card-highlight">
                                                    <span>ĐÃ GIẢI PHÓNG</span>
                                                    <strong>0</strong>
                                                </div>
                                            </div>

                                            <div className="promo-stat-grid-2">
                                                <div className="promo-stat-card-highlight">
                                                    <span>TIỀN GIẢM LÚC GIAO · ĐƠN ĐÃ SỬ DỤNG</span>
                                                    <strong>0 đ</strong>
                                                </div>
                                                <div className="promo-stat-card-highlight">
                                                    <span>SỐ QUÀ ĐÃ GIAO · ĐƠN ĐÃ SỬ DỤNG</span>
                                                    <strong>0</strong>
                                                </div>
                                            </div>
                                        </WarrantyPanel>

                                        <WarrantyPanel
                                            title="QUÀ ĐÃ GIAO THEO CHỨNG TỪ"
                                            note="Chi tiết các chứng từ xuất kho quà tặng phát sinh từ chương trình."
                                        >
                                            <p className="w-shell-note" style={{ textAlign: 'center', padding: '20px 0' }}>
                                                Không có dòng quà giao đã được ghi nhận trong nguồn báo cáo.
                                            </p>
                                        </WarrantyPanel>

                                        {/* Audit Footnotes */}
                                        <div className="promo-audit-footnote">
                                            <p><strong>Múi giờ:</strong> Asia/Ho_Chi_Minh · <strong>Mốc thời gian tháng/kỳ:</strong> Thời điểm chốt ưu đãi xong; nhóm theo trạng thái lượt hiện tại.</p>
                                            <p>Tiền giảm không phải doanh thu thuần, lợi nhuận hoặc phiếu chi. Quà không tạo Cashbook CHI. Lượt đã giải phóng và snapshot tiền vẫn giữ để kiểm toán; trả hàng không tự khôi phục lượt dùng.</p>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </main>

                    {/* RIGHT COLUMN: Sidebar matching Image 2 */}
                    <aside>
                        {/* Card 1: Sử dụng & Hạn mức */}
                        <WarrantyPanel title="SỬ DỤNG & HẠN MỨC">
                            <div className="promo-aside-stat promo-aside-stat--enhanced">
                                <div className="promo-aside-stat-row">
                                    <span>HẠN MỨC TỐI ĐA</span>
                                    {promo.maxUsage === null || promo.maxUsage === undefined ? (
                                        <div className="promo-highlight-pill promo-highlight-pill--unlimited">
                                            KHÔNG GIỚI HẠN
                                        </div>
                                    ) : (
                                        <div className="promo-highlight-pill promo-highlight-pill--limit">
                                            {promo.maxUsage} lượt
                                        </div>
                                    )}
                                </div>
                                <div className="promo-aside-stat-row">
                                    <span>ĐÃ SỬ DỤNG</span>
                                    <div className="promo-highlight-pill promo-highlight-pill--used">
                                        {promo.usedUsage || 0} lượt
                                    </div>
                                </div>
                                <div className="promo-aside-stat-row">
                                    <span>ĐANG GIỮ</span>
                                    <div className="promo-highlight-pill promo-highlight-pill--holding">
                                        {promo.holdingCount || 0} lượt
                                    </div>
                                </div>
                                <div className="promo-aside-stat-row">
                                    <span>CÒN LẠI</span>
                                    {promo.remainingUsage === null || promo.remainingUsage === undefined ? (
                                        <div className="promo-highlight-pill promo-highlight-pill--remaining-unlimited">
                                            KHÔNG GIỚI HẠN
                                        </div>
                                    ) : (
                                        <div className="promo-highlight-pill promo-highlight-pill--remaining-count">
                                            {promo.remainingUsage} lượt
                                        </div>
                                    )}
                                </div>
                            </div>
                        </WarrantyPanel>

                        {/* Card 2: Quyền hạn & Bảo toàn dữ liệu */}
                        <WarrantyPanel title="QUYỀN HẠN & BẢO TOÀN">
                            <WarrantyFields
                                fields={[
                                    ['Phiên bản', `Phiên bản ${promo.configVersion || 1}`],
                                    ['Sửa cấu hình', hasUsage ? 'Đã khóa; chỉ sửa an toàn' : 'Được phép'],
                                    ['Xóa chương trình', hasUsage ? 'Không được phép' : 'Được phép'],
                                    ['Cờ quản lý', promo.savedStatus === 0 ? 'Tạm dừng (0)' : 'Đang bật (1)'],
                                ]}
                            />
                            <div className="promo-aside-actions">
                                <button
                                    type="button"
                                    className="w-shell-button w-full-width"
                                    onClick={handleStartEdit}
                                >
                                    <Edit3 size={14} /> Chỉnh sửa cấu hình
                                </button>
                                <button
                                    type="button"
                                    className="w-shell-button w-full-width"
                                    disabled={busy}
                                    onClick={handleToggleStatus}
                                >
                                    {promo.savedStatus === 0 ? <><Play size={14} /> Khôi phục</> : <><Pause size={14} /> Tạm dừng</>}
                                </button>
                                <button
                                    type="button"
                                    className="w-shell-button w-full-width"
                                    onClick={handleSimulateNewVersion}
                                >
                                    Mô phỏng phiên bản mới
                                </button>
                            </div>
                        </WarrantyPanel>

                        {/* Card 3: Thao tác & Điều hướng nhanh */}
                        <WarrantyPanel title="ĐIỀU HƯỚNG NHANH">
                            <button
                                type="button"
                                className="w-shell-button w-full-width"
                                onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}
                            >
                                Xem danh sách khuyến mại <ChevronRight size={15} />
                            </button>
                            <button
                                type="button"
                                className="w-shell-button w-full-width"
                                onClick={() => navigate('/admin/khuyen-mai/tao-khuyen-mai')}
                            >
                                Tạo khuyến mại mới <ChevronRight size={15} />
                            </button>
                        </WarrantyPanel>
                    </aside>
                </div>
            </div>

            {/* MODAL: Chặn xóa chương trình đã có lịch sử */}
            {deleteBlockedModal && (
                <div className="promo-modal-overlay" onClick={() => setDeleteBlockedModal(false)}>
                    <div className="promo-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="promo-modal-header">
                            <div className="promo-modal-title">
                                <AlertTriangle size={18} color="#e31e24" />
                                <h3>KHÔNG ĐƯỢC PHÉP XÓA CHƯƠNG TRÌNH</h3>
                            </div>
                        </div>
                        <div className="promo-modal-body">
                            <p>
                                Chương trình <strong>{promo.code}</strong> đã phát sinh lịch sử kiểm toán hoặc lượt áp dụng ({promo.usedUsage || 0} đã dùng, {promo.releasedCount || 0} đã giải phóng).
                            </p>
                            <p className="w-shell-note" style={{ color: '#b91c1c', marginTop: '8px' }}>
                                Để bảo toàn lịch sử đơn hàng và dữ liệu kiểm toán tài chính, vui lòng sử dụng chức năng <strong>TẠM DỪNG CHƯƠNG TRÌNH</strong> thay vì xóa.
                            </p>
                        </div>
                        <div className="promo-modal-footer">
                            <button
                                type="button"
                                className="w-shell-button w-shell-button--black"
                                onClick={() => setDeleteBlockedModal(false)}
                            >
                                ĐÃ HIỂU
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Xác nhận xóa chương trình an toàn */}
            {showDeleteModal && (
                <div className="promo-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="promo-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="promo-modal-header">
                            <div className="promo-modal-title">
                                <Trash2 size={18} color="#e31e24" />
                                <h3>XÓA CHƯƠNG TRÌNH KHUYẾN MẠI?</h3>
                            </div>
                        </div>
                        <div className="promo-modal-body">
                            <p>
                                Bạn có chắc chắn muốn xóa vĩnh viễn chương trình <strong>{promo.code}</strong> - {promo.name}?
                            </p>
                            <p className="w-shell-note" style={{ color: '#b91c1c', marginTop: '8px' }}>
                                Thao tác này sẽ xóa hoàn toàn chương trình khỏi hệ thống và không thể hoàn tác.
                            </p>
                        </div>
                        <div className="promo-modal-footer">
                            <button
                                type="button"
                                className="w-shell-button"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                HỦY
                            </button>
                            <button
                                type="button"
                                className="w-shell-button w-shell-button--red"
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

function messageOrAlert(error, successMsg, loading) {
    if (error) {
        return (
            <p className="w-shell-error" role="alert" style={{ margin: '12px 28px 0' }}>
                {error}
            </p>
        );
    }
    if (successMsg) {
        return (
            <p className="w-intake-message" role="status" style={{ margin: '12px 28px 0' }}>
                <CheckCircle2 size={18} />
                {successMsg}
            </p>
        );
    }
    if (loading) {
        return (
            <p className="w-loading" role="status" style={{ margin: '12px 28px 0' }}>
                Đang cập nhật hồ sơ chương trình…
            </p>
        );
    }
    return null;
}
