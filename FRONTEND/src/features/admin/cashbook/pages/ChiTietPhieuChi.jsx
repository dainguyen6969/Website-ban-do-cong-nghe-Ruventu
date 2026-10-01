import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './ChiTietPhieu.css';

export default function ChiTietPhieuChi() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { phieuChiList = [], cancelPhieuChi } = useCashbook() || {};

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);

    // Find payment voucher by code or id
    const currentItem = phieuChiList.find(p => p.code === id || String(p.id) === id) || {
        id: 1,
        code: id || 'PC0002005',
        person: 'Nguyễn Thị Lan',
        role: 'NHÂN VIÊN',
        group: 'NHÂN VIÊN',
        typeCode: 'LPC004',
        typeName: 'Chi lương nhân viên',
        method: 'TIỀN MẶT',
        creator: 'Trần Minh Quân',
        amount: 12000000,
        date: '16/09/2026 09:00',
        createdDate: '16/09/2026 09:05',
        updatedDate: '16/09/2026 09:05',
        source: 'THỦ CÔNG',
        status: 'ĐÃ GHI NHẬN',
        desc: 'Chi lương tháng 9/2026',
        tags: ['luong', 'nhan_vien'],
        voucherDoc: '-'
    };

    const [status, setStatus] = useState(currentItem.status || 'ĐÃ GHI NHẬN');

    const formatMoney = (val) => {
        if (!val && val !== 0) return '0đ';
        return val.toLocaleString('vi-VN') + 'đ';
    };

    const handleConfirmCancel = () => {
        if (cancelPhieuChi) {
            cancelPhieuChi(currentItem.code);
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
                    ADMIN <span>&rsaquo;</span> PHIẾU CHI <span>&rsaquo;</span> CHI TIẾT PHIẾU CHI
                </div>
            </div>

            {/* Sub-Header Row */}
            <div className="ctp-header">
                <div className="ctp-sub-breadcrumb">
                    SỔ QUỸ TIỀN MẶT / PHIẾU CHI / CHI TIẾT PHIẾU CHI
                </div>
                <div className="ctp-title-row">
                    <div className="ctp-title-left">
                        <span className="ctp-badge-box">PHIẾU CHI</span>
                        <h1 className="ctp-code-title">{currentItem.code}</h1>
                        <span className={`ctp-status-badge ${status === 'ĐÃ HỦY' ? 'status-danger' : 'status-success'}`}>
                            {status}
                        </span>
                    </div>

                    {status === 'ĐÃ GHI NHẬN' && (
                        <button className="ctp-btn-cancel-action" onClick={() => setShowCancelModal(true)}>
                            HỦY PHIẾU CHI
                        </button>
                    )}
                </div>

                <div className="ctp-amount-display red-text">
                    {formatMoney(currentItem.amount)}
                </div>
            </div>

            {/* Success Banner if Canceled */}
            {showSuccessBanner && (
                <div className="ctp-banner-success">
                    <span className="banner-icon">&#10003;</span>
                    <span>HỦY PHIẾU CHI THÀNH CÔNG</span>
                </div>
            )}

            {/* Secondary Alert Bar if Canceled */}
            {status === 'ĐÃ HỦY' && (
                <div className="ctp-banner-danger">
                    PHIẾU CHI ĐÃ HỦY
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
                                <span className="val bold">PHIẾU CHI</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">MÃ LOẠI</span>
                                <span className="val bold">{currentItem.typeCode || 'LPC004'}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">TÊN LOẠI</span>
                                <span className="val">{currentItem.typeName || 'Chi lương nhân viên'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Người nhận */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">NGƯỜI NHẬN</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">NHÓM</span>
                                <span className="val bold">{currentItem.group || 'NHÂN VIÊN'}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">TÊN NGƯỜI NHẬN</span>
                                <span className="val bold">{currentItem.person}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Giá trị giao dịch */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">GIÁ TRỊ GIAO DỊCH</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">SỐ TIỀN CHI</span>
                                <span className="val amount-val red-text">{formatMoney(currentItem.amount)}</span>
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
                                <span className="val">{currentItem.voucherDoc || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Mô tả / Tags */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">MÔ TẢ / TAGS</div>
                        <div className="ctp-desc-box">
                            <span className="lbl">MÔ TẢ</span>
                            <p className="desc-text">{currentItem.desc || 'Chi lương tháng 9/2026'}</p>
                        </div>
                        <div className="ctp-tags-box">
                            <span className="lbl">TAGS</span>
                            <div className="tag-chips">
                                {(currentItem.tags && currentItem.tags.length > 0 ? currentItem.tags : ['luong', 'nhan_vien']).map((t, idx) => (
                                    <span key={idx} className="tag-pill">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Meta Info Sidebar */}
                <div className="ctp-sidebar-card">
                    <div className="ctp-meta-group">
                        <span className="meta-lbl">LOẠI CHI</span>
                        <span className="meta-val bold">{currentItem.typeCode || 'LPC004'}</span>
                        <div className="sub-type-name">{currentItem.typeName || 'Chi lương nhân viên'}</div>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">NGUỒN TẠO</span>
                        <span className="meta-val bold">{currentItem.source || 'THỦ CÔNG'}</span>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">NGƯỜI TẠO</span>
                        <span className="meta-val bold">{currentItem.creator || 'Trần Minh Quân'}</span>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">THỜI GIAN</span>
                        <div className="time-sub-row">
                            <span className="sub-lbl">NGÀY TẠO</span>
                            <span className="sub-val">{currentItem.createdDate || '16/09/2026 09:05'}</span>
                        </div>
                        <div className="time-sub-row">
                            <span className="sub-lbl">CẬP NHẬT</span>
                            <span className="sub-val">{status === 'ĐÃ HỦY' ? '30/09/2026 00:29' : (currentItem.updatedDate || '16/09/2026 09:05')}</span>
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
                            <h2>HỦY PHIẾU CHI?</h2>
                        </div>
                        <div className="ctp-modal-body">
                            <div className="ctp-modal-card-info">
                                <div className="modal-info-code">{currentItem.code}</div>
                                <div className="modal-info-amount red-text">{formatMoney(currentItem.amount)}</div>
                            </div>
                            <div className="ctp-modal-warning">
                                HỦY PHIẾU CHI LOẠI BỎ GHI NHẬN CHI SAI KHỎI SỔ QUỸ.<br />
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
