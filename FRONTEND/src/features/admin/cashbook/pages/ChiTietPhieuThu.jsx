import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './ChiTietPhieu.css';

export default function ChiTietPhieuThu() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { phieuThuList = [], cancelPhieuThu } = useCashbook() || {};

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);

    // Find receipt by code or id
    const currentItem = phieuThuList.find(p => p.code === id || String(p.id) === id) || {
        id: 1,
        code: id || 'PT0001006',
        person: 'ASUS Vietnam Co.',
        role: 'NHÀ CUNG CẤP',
        group: 'NHÀ CUNG CẤP',
        typeCode: 'LPT005',
        typeName: 'Thu phí dịch vụ',
        method: 'CHUYỂN KHOẢN',
        creator: 'Nguyễn Thị Lan',
        amount: 3500000,
        date: '15/09/2026 10:00',
        createdDate: '15/09/2026 10:15',
        updatedDate: '15/09/2026 10:15',
        source: 'THỦ CÔNG',
        status: 'ĐÃ GHI NHẬN',
        desc: 'Phí dịch vụ bảo trì',
        tags: ['phi_dv'],
        voucherDoc: 'OTHER-101'
    };

    const [status, setStatus] = useState(currentItem.status || 'ĐÃ GHI NHẬN');

    const formatMoney = (val) => {
        if (!val && val !== 0) return '0đ';
        return val.toLocaleString('vi-VN') + 'đ';
    };

    const handleConfirmCancel = () => {
        if (cancelPhieuThu) {
            cancelPhieuThu(currentItem.code);
        }
        setStatus('ĐÃ HỦY');
        setShowCancelModal(false);
        setShowSuccessBanner(true);
    };

    return (
        <div className="ctp-page">
            {/* Top Breadcrumb Header Bar */}
            <div className="ctp-top-bar">
                <div className="ctp-breadcrumb">
                    ADMIN <span>&rsaquo;</span> PHIẾU THU <span>&rsaquo;</span> CHI TIẾT PHIẾU THU
                </div>
            </div>

            {/* Sub-Header Row */}
            <div className="ctp-header">
                <div className="ctp-sub-breadcrumb">
                    SỔ QUỸ TIỀN MẶT / PHIẾU THU / CHI TIẾT PHIẾU THU
                </div>
                <div className="ctp-title-row">
                    <div className="ctp-title-left">
                        <span className="ctp-badge-box">PHIẾU THU</span>
                        <h1 className="ctp-code-title">{currentItem.code}</h1>
                        <span className={`ctp-status-badge ${status === 'ĐÃ HỦY' ? 'status-danger' : 'status-success'}`}>
                            {status}
                        </span>
                    </div>

                    {status === 'ĐÃ GHI NHẬN' && (
                        <button className="ctp-btn-cancel-action" onClick={() => setShowCancelModal(true)}>
                            HỦY PHIẾU THU
                        </button>
                    )}
                </div>

                <div className="ctp-amount-display">
                    {formatMoney(currentItem.amount)}
                </div>
            </div>

            {/* Success Banner if Canceled */}
            {showSuccessBanner && (
                <div className="ctp-banner-success">
                    <span className="banner-icon">&#10003;</span>
                    <span>HỦY PHIẾU THU THÀNH CÔNG</span>
                </div>
            )}

            {/* Secondary Alert Bar if Canceled */}
            {status === 'ĐÃ HỦY' && (
                <div className="ctp-banner-danger">
                    PHIẾU THU ĐÃ HỦY
                </div>
            )}

            {/* Main Content Layout (2 Columns) */}
            <div className="ctp-content-grid">
                {/* Left Column: Form Info */}
                <div className="ctp-main-card">
                    {/* Section 1: Thông tin phiếu */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">THÔNG TIN PHIẾU</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">MÃ PHIẾU</span>
                                <span className="val bold">{currentItem.code}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">LOẠI PHIẾU</span>
                                <span className="val bold">PHIẾU THU</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">MÃ LOẠI</span>
                                <span className="val bold">{currentItem.typeCode || 'LPT005'}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">TÊN LOẠI</span>
                                <span className="val">{currentItem.typeName || 'Thu phí dịch vụ'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Đối tượng nộp tiền */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">ĐỐI TƯỢNG NỘP TIỀN</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">NHÓM</span>
                                <span className="val bold">{currentItem.group || 'NHÀ CUNG CẤP'}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">NGƯỜI NỘP</span>
                                <span className="val bold">{currentItem.person}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Giá trị giao dịch */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">GIÁ TRỊ GIAO DỊCH</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">SỐ TIỀN</span>
                                <span className="val amount-val">{formatMoney(currentItem.amount)}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">PHƯƠNG THỨC</span>
                                <span className="val bold">{currentItem.method}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">NGÀY GHI NHẬN</span>
                                <span className="val">{currentItem.date}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">CHỨNG TỪ</span>
                                <span className="val">{currentItem.voucherDoc || 'OTHER-101'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Mô tả / Tags */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">MÔ TẢ / TAGS</div>
                        <div className="ctp-desc-box">
                            <span className="lbl">MÔ TẢ</span>
                            <p className="desc-text">{currentItem.desc || 'Phí dịch vụ bảo trì'}</p>
                        </div>
                        <div className="ctp-tags-box">
                            <span className="lbl">TAGS</span>
                            <div className="tag-chips">
                                {(currentItem.tags && currentItem.tags.length > 0 ? currentItem.tags : ['phi_dv']).map((t, idx) => (
                                    <span key={idx} className="tag-pill">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Meta Info Sidebar */}
                <div className="ctp-sidebar-card">
                    <div className="ctp-meta-group">
                        <span className="meta-lbl">NGUỒN TẠO</span>
                        <span className="meta-val bold">{currentItem.source || 'THỦ CÔNG'}</span>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">NGƯỜI TẠO</span>
                        <span className="meta-val bold">{currentItem.creator || 'Nguyễn Thị Lan'}</span>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">THỜI GIAN</span>
                        <div className="time-sub-row">
                            <span className="sub-lbl">NGÀY TẠO</span>
                            <span className="sub-val">{currentItem.createdDate || '15/09/2026 10:15'}</span>
                        </div>
                        <div className="time-sub-row">
                            <span className="sub-lbl">CẬP NHẬT</span>
                            <span className="sub-val">{status === 'ĐÃ HỦY' ? '30/09/2026 00:29' : (currentItem.updatedDate || '15/09/2026 10:15')}</span>
                        </div>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">TRẠNG THÁI</span>
                        <span className={`ctp-status-badge ${status === 'ĐÃ HỦY' ? 'status-danger' : 'status-success'}`}>
                            {status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Confirmation Cancel Modal */}
            {showCancelModal && (
                <div className="ctp-modal-overlay">
                    <div className="ctp-modal-box">
                        <div className="ctp-modal-header header-red">
                            <h2>HỦY PHIẾU THU?</h2>
                        </div>
                        <div className="ctp-modal-body">
                            <div className="ctp-modal-card-info">
                                <div className="modal-info-code">{currentItem.code}</div>
                                <div className="modal-info-amount">{formatMoney(currentItem.amount)}</div>
                            </div>
                            <div className="ctp-modal-warning">
                                HỦY PHIẾU THU LOẠI BỎ GHI NHẬN THU SAI KHỎI SỔ QUỸ.<br />
                                THAO TÁC NÀY KHÔNG THỰC HIỆN CHUYỂN TIỀN HOẶC HOÀN TIỀN.
                            </div>
                        </div>
                        <div className="ctp-modal-footer">
                            <button className="btn-modal-cancel" onClick={() => setShowCancelModal(false)}>
                                QUAY LẠI
                            </button>
                            <button className="btn-modal-confirm-red" onClick={handleConfirmCancel}>
                                XÁC NHẬN HỦY
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
