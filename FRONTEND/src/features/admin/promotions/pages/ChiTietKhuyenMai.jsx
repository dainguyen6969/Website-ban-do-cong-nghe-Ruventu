import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPromotions, updatePromotion, deletePromotion, togglePromotionStatus } from '../../../../data/mockPromotions';
import './ChiTietKhuyenMai.css';

export default function ChiTietKhuyenMai() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [promo, setPromo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Edit form states
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editMaxUsage, setEditMaxUsage] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const data = await getPromotions();
            const found = data.find(p => p.id === id);
            if (found) {
                setPromo(found);
                setEditName(found.name || '');
                setEditDescription(found.description || '');
                setEditMaxUsage(found.maxUsage === null ? '' : found.maxUsage);
                setEditEndDate(found.endDate || '');
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const handleToggleStatus = () => {
        if (!promo) return;
        const updated = togglePromotionStatus(promo.id);
        if (updated) {
            setPromo({ ...updated });
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        if (!promo) return;
        deletePromotion(promo.id);
        setShowDeleteModal(false);
        navigate('/admin/khuyen-mai/danh-sach-khuyen-mai', {
            state: { successMessage: `Đã xóa thành công chương trình ${promo.code}!` }
        });
    };

    const handleSaveEdit = () => {
        if (!promo) return;
        const parsedLimit = editMaxUsage === '' || editMaxUsage === null ? null : parseInt(editMaxUsage);
        const updatedFields = {
            name: editName.trim() || promo.name,
            description: editDescription.trim() || promo.description,
            maxUsage: parsedLimit,
            remainingUsage: parsedLimit === null ? null : Math.max(0, parsedLimit - (promo.usedUsage || 0)),
            endDate: editEndDate || promo.endDate
        };

        const updated = updatePromotion(promo.id, updatedFields);
        if (updated) {
            setPromo({ ...updated });
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        if (promo) {
            setEditName(promo.name || '');
            setEditDescription(promo.description || '');
            setEditMaxUsage(promo.maxUsage === null ? '' : promo.maxUsage);
            setEditEndDate(promo.endDate || '');
        }
        setIsEditing(false);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'ĐANG ÁP DỤNG': return 'status-badge status-active';
            case 'HẾT LƯỢT': return 'status-badge status-out';
            case 'CHƯA BẮT ĐẦU': return 'status-badge status-pending';
            case 'TẠM DỪNG': return 'status-badge status-paused';
            default: return 'status-badge';
        }
    };

    const getStatusTextColor = (status) => {
        switch (status) {
            case 'ĐANG ÁP DỤNG': return '#0d8425';
            case 'HẾT LƯỢT': return '#df1720';
            case 'CHƯA BẮT ĐẦU': return '#0067df';
            case 'TẠM DỪNG': return '#d36b00';
            default: return '#111';
        }
    };

    const formatDate = (dateString, defaultTime = '00:00') => {
        if (!dateString) return '';
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
            return `${parts[2]}/${parts[1]}/${parts[0]} ${timePart}`;
        }
        return `${dateString} ${timePart}`;
    };

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '0đ';
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    if (loading) {
        return <div className="promo-detail-page"><div className="loading">Đang tải...</div></div>;
    }

    if (!promo) {
        return (
            <div className="promo-detail-page">
                <div className="not-found-container" style={{padding: '40px', textAlign: 'center'}}>
                    <h2>Không tìm thấy chương trình khuyến mại</h2>
                    <button className="btn-back-link" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>
                        &larr; QUAY LẠI DANH SÁCH
                    </button>
                </div>
            </div>
        );
    }

    const usagePercent = promo.maxUsage ? Math.round(((promo.usedUsage || 0) / promo.maxUsage) * 100) : 0;
    
    // Remaining days calculation
    let remainingDaysText = '0 NGÀY';
    if (promo.endDate) {
        const endDateStr = promo.endDate.includes('T') ? promo.endDate : `${promo.endDate}T23:59:59`;
        const endDateTime = new Date(endDateStr);
        const now = new Date();
        if (endDateTime < now) {
            remainingDaysText = 'ĐÃ KẾT THÚC';
        } else {
            const timeDiff = endDateTime.getTime() - now.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            remainingDaysText = `${daysDiff > 0 ? daysDiff : 0} NGÀY`;
        }
    }

    const hasUsage = (promo.usedUsage || 0) > 0;
    const isGiftMethod = promo.method === 'TẶNG SẢN PHẨM';

    // Parse buy and gift products arrays
    const buyProducts = (promo.buyProducts && promo.buyProducts.length > 0)
        ? promo.buyProducts 
        : (promo.appliedProducts ? promo.appliedProducts.filter(p => p.role === 'SẢN PHẨM MUA').map(p => ({
            code: p.code,
            name: p.name,
            version: p.version,
            reqQuantity: p.quantity
        })) : []);

    const giftProducts = (promo.giftProducts && promo.giftProducts.length > 0)
        ? promo.giftProducts
        : (promo.appliedProducts ? promo.appliedProducts.filter(p => p.role === 'SẢN PHẨM TẶNG').map(p => ({
            code: p.code,
            name: p.name,
            version: p.version,
            giftQuantity: p.quantity
        })) : []);

    return (
        <div className="promo-detail-page">
            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="promo-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="promo-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-red">
                            <h3>XÓA KHUYẾN MẠI?</h3>
                        </div>
                        <div className="modal-body">
                            <div className="promo-preview-box">
                                <strong>{promo.code}</strong>
                                <p>{promo.name}</p>
                            </div>
                            <p className="modal-subtext">
                                THAO TÁC NÀY CHỈ ĐƯỢC PHÉP VỚI CHƯƠNG TRÌNH CHƯA TỪNG ĐƯỢC SỬ DỤNG.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modal-cancel" onClick={() => setShowDeleteModal(false)}>
                                QUAY LẠI
                            </button>
                            <button className="btn-modal-confirm-delete" onClick={handleConfirmDelete}>
                                XÁC NHẬN XÓA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Navigation & Action Header */}
            <div className="promo-detail-top-nav">
                <div className="top-nav-left">
                    <button className="btn-back-square" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>
                        &larr; QUAY LẠI
                    </button>
                    <span className="top-nav-title">CHI TIẾT KHUYẾN MẠI</span>
                </div>
                <div className="top-nav-actions">
                    {promo.status === 'TẠM DỪNG' ? (
                        <button className="btn-action btn-restore" onClick={handleToggleStatus}>
                            KHÔI PHỤC
                        </button>
                    ) : (
                        <>
                            {!isEditing && (
                                <button className="btn-action btn-edit" onClick={() => setIsEditing(true)}>
                                    SỬA KHUYẾN MẠI
                                </button>
                            )}
                            <button className="btn-action btn-pause" onClick={handleToggleStatus}>
                                TẠM DỪNG
                            </button>
                            {!hasUsage && (
                                <button className="btn-action btn-delete" onClick={handleDeleteClick}>
                                    XÓA KHUYẾN MẠI
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Header Title Info */}
            <div className="promo-detail-header">
                <div className="header-title-row">
                    <h1>{promo.code}</h1>
                    <span className={getStatusStyle(promo.status)}>{promo.status}</span>
                </div>
                <p className="header-subtitle">{promo.name}</p>
            </div>

            {/* Warning Callout Banner (if promo has usage or paused) */}
            {(hasUsage || promo.status === 'TẠM DỪNG') && (
                <div className="promo-warning-banner">
                    CHƯƠNG TRÌNH ĐÃ PHÁT SINH LƯỢT SỬ DỤNG. CẤU HÌNH KHUYẾN MẠI CỐT LÕI ĐƯỢC KHÓA ĐỂ BẢO TOÀN LỊCH SỬ.
                </div>
            )}

            <div className="promo-detail-content">
                <div className="promo-detail-main">
                    <div className="detail-section">
                        <h2>TỔNG QUAN CHƯƠNG TRÌNH</h2>
                        
                        {isEditing ? (
                            <div className="edit-form-block">
                                <div className="form-group-edit">
                                    <label>TÊN CHƯƠNG TRÌNH <span>*</span></label>
                                    <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="edit-input"
                                    />
                                </div>
                                <div className="form-group-edit">
                                    <label>MÔ TẢ</label>
                                    <textarea 
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        rows={3}
                                        className="edit-textarea"
                                    />
                                </div>
                                <div className="edit-readonly-grid">
                                    <div className="form-group-edit">
                                        <label>PHƯƠNG THỨC</label>
                                        <input type="text" value={promo.method} disabled className="edit-input-disabled" />
                                    </div>
                                    <div className="form-group-edit">
                                        <label>ĐỐI TƯỢNG</label>
                                        <input type="text" value={promo.target} disabled className="edit-input-disabled" />
                                    </div>
                                </div>
                                <div className="edit-actions-row">
                                    <button className="btn-save-edit" onClick={handleSaveEdit}>LƯU THAY ĐỔI</button>
                                    <button className="btn-cancel-edit" onClick={handleCancelEdit}>HỦY</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>MÃ CHƯƠNG TRÌNH</label>
                                        <span>{promo.code}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>TÊN CHƯƠNG TRÌNH</label>
                                        <span>{promo.name}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>PHƯƠNG THỨC</label>
                                        <span>{promo.method}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>ĐỐI TƯỢNG ÁP DỤNG</label>
                                        <span>{promo.target}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>TRẠNG THÁI</label>
                                        <span style={{ color: getStatusTextColor(promo.status), fontWeight: 800 }}>{promo.status}</span>
                                    </div>
                                </div>
                                <div className="info-row">
                                    <label>MÔ TẢ</label>
                                    <p>{promo.description || '-'}</p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="detail-section">
                        <h2>CẤU HÌNH KHUYẾN MẠI</h2>
                        <div className="config-grid">
                            <div className="info-item">
                                <label className="config-type-label">
                                    {isGiftMethod 
                                        ? 'MUA PHIÊN BẢN CHỈ ĐỊNH ➔ TẶNG PHIÊN BẢN CHỈ ĐỊNH' 
                                        : `LOẠI: ${promo.discountType}`}
                                </label>
                            </div>
                            {!isGiftMethod && (
                                <div className="info-item discount-value-item">
                                    <label>GIÁ TRỊ GIẢM MỖI ĐƠN VỊ</label>
                                    <span className="discount-amount">{formatMoney(promo.discountValue)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Applied Products Section */}
                    {isGiftMethod ? (
                        <div className="detail-section">
                            <h2>SẢN PHẨM / PHIÊN BẢN ÁP DỤNG</h2>
                            
                            <div className="gift-section-block">
                                <h3 className="gift-sub-title">SẢN PHẨM KHÁCH PHẢI MUA</h3>
                                <table className="applied-products-table">
                                    <thead>
                                        <tr>
                                            <th>MÃ SẢN PHẨM</th>
                                            <th>TÊN SẢN PHẨM</th>
                                            <th>PHIÊN BẢN</th>
                                            <th>SỐ LƯỢNG YÊU CẦU</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {buyProducts.map((prod, idx) => (
                                            <tr key={idx}>
                                                <td className="code-col">{prod.code}</td>
                                                <td className="name-col">{prod.name}</td>
                                                <td>{prod.version}</td>
                                                <td>{prod.reqQuantity || prod.quantity || 'SL: 1'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="gift-section-block" style={{marginTop: '24px'}}>
                                <h3 className="gift-sub-title">SẢN PHẨM ĐƯỢC TẶNG</h3>
                                <table className="applied-products-table">
                                    <thead>
                                        <tr>
                                            <th>MÃ SẢN PHẨM</th>
                                            <th>TÊN SẢN PHẨM</th>
                                            <th>PHIÊN BẢN</th>
                                            <th>SỐ LƯỢNG TẶNG</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {giftProducts.map((prod, idx) => (
                                            <tr key={idx}>
                                                <td className="code-col">{prod.code}</td>
                                                <td className="name-col">{prod.name}</td>
                                                <td>{prod.version}</td>
                                                <td>{prod.giftQuantity || prod.quantity || 'SL: 1'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (promo.appliedProducts && promo.appliedProducts.length > 0) && (
                        <div className="detail-section">
                            <h2>SẢN PHẨM / PHIÊN BẢN ÁP DỤNG</h2>
                            <table className="applied-products-table">
                                <thead>
                                    <tr>
                                        <th>VAI TRÒ</th>
                                        <th>MÃ SẢN PHẨM</th>
                                        <th>TÊN SẢN PHẨM</th>
                                        <th>PHIÊN BẢN</th>
                                        <th>SỐ LƯỢNG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promo.appliedProducts.map((prod, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <span className={`role-badge ${prod.role === 'SẢN PHẨM TẶNG' ? 'role-gift' : 'role-buy'}`}>
                                                    {prod.role}
                                                </span>
                                            </td>
                                            <td className="code-col">{prod.code}</td>
                                            <td className="name-col">{prod.name}</td>
                                            <td>{prod.version}</td>
                                            <td>{prod.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="promo-detail-sidebar">
                    <div className="sidebar-section">
                        <h2>LƯỢT SỬ DỤNG</h2>
                        <div className="usage-stats">
                            <div className="stat-item">
                                <label>TỐI ĐA</label>
                                <span className={promo.maxUsage === null ? 'stat-text-sm' : ''}>
                                    {promo.maxUsage === null ? 'KG GIỚI HẠN' : promo.maxUsage}
                                </span>
                            </div>
                            <div className="stat-item">
                                <label>ĐÃ DÙNG</label>
                                <span>{promo.usedUsage || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>CÒN LẠI</label>
                                <span className={promo.remainingUsage === null ? 'stat-text-sm' : ''}>
                                    {promo.remainingUsage === null ? 'KG GIỚI HẠN' : promo.remainingUsage}
                                </span>
                            </div>
                        </div>

                        {promo.maxUsage !== null && (
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{width: `${usagePercent}%`}}></div>
                                </div>
                                <div className="progress-text">{usagePercent}% ĐÃ SỬ DỤNG</div>
                            </div>
                        )}

                        {isEditing && (
                            <div className="form-group-edit sidebar-edit-group">
                                <label>SỐ LƯỢT TỐI ĐA MỚI</label>
                                <input 
                                    type="number" 
                                    placeholder="Để trống = không giới hạn"
                                    value={editMaxUsage}
                                    onChange={(e) => setEditMaxUsage(e.target.value)}
                                    className="edit-input"
                                />
                            </div>
                        )}

                        {hasUsage && (
                            <div className="warning-box">
                                <strong>KHÔNG THỂ XÓA</strong>
                                <p>CHƯƠNG TRÌNH ĐÃ PHÁT SINH LƯỢT SỬ DỤNG</p>
                            </div>
                        )}
                    </div>

                    <div className="sidebar-section">
                        <h2>THỜI GIAN ÁP DỤNG</h2>
                        
                        {isEditing ? (
                            <div className="form-group-edit sidebar-edit-group">
                                <label>NGÀY KẾT THÚC</label>
                                <input 
                                    type="datetime-local" 
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                    className="edit-input"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="time-info">
                                    <label>BẮT ĐẦU</label>
                                    <span>{formatDate(promo.startDate, '00:00')}</span>
                                </div>
                                <div className="time-info">
                                    <label>KẾT THÚC</label>
                                    <span>{formatDate(promo.endDate, '23:59')}</span>
                                </div>
                                <div className="time-info">
                                    <label>THỜI GIAN CÒN LẠI</label>
                                    <span className="remaining-days">{remainingDaysText}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="sidebar-section">
                        <h2>THÔNG TIN QUẢN LÝ</h2>
                        <div className="mgmt-info">
                            <label>MÃ CHƯƠNG TRÌNH</label>
                            <span>{promo.code}</span>
                        </div>
                        <div className="mgmt-info">
                            <label>PHƯƠNG THỨC</label>
                            <span>{promo.method}</span>
                        </div>
                        <div className="mgmt-info">
                            <label>ĐỐI TƯỢNG</label>
                            <span>{promo.target}</span>
                        </div>
                        <div className="mgmt-info">
                            <label>GIÁ TRỊ GIẢM</label>
                            <span style={{color: isGiftMethod ? '#111' : '#e31e24', fontWeight: 900}}>
                                {isGiftMethod ? '-' : formatMoney(promo.discountValue)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
