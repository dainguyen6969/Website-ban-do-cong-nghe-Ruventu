import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { receiptService } from '../../../../shared/services/receiptService';
import './ChiTietPhieu.css';

export default function ChiTietPhieuThu() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [currentItem, setCurrentItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);

    const fetchDetail = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await receiptService.getReceiptDetail(id);
            if (response.data?.data) {
                setCurrentItem(response.data.data);
            }
        } catch (error) {
            console.error('Lỗi lấy chi tiết phiếu thu:', error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const formatMoney = (val) => {
        if (!val && val !== 0) return '0đ';
        return val.toLocaleString('vi-VN') + 'đ';
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

    const handleConfirmCancel = async () => {
        try {
            await receiptService.cancelReceipt(id, { xac_nhan: true });
            setShowCancelModal(false);
            setShowSuccessBanner(true);
            await fetchDetail();
        } catch (error) {
            console.error('Lỗi khi hủy phiếu:', error);
            alert('Không thể hủy phiếu lúc này');
        }
    };

    if (isLoading) {
        return <div className="ctp-page" style={{padding: 40, textAlign: 'center'}}>Đang tải dữ liệu...</div>;
    }

    if (!currentItem) {
        return <div className="ctp-page" style={{padding: 40, textAlign: 'center'}}>Không tìm thấy phiếu thu.</div>;
    }

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
                        <h1 className="ctp-code-title">{currentItem.ma_phieu}</h1>
                        <span className={`ctp-status-badge ${currentItem.trang_thai === 'HUY' ? 'status-danger' : 'status-success'}`}>
                            {mapStatusToText(currentItem.trang_thai)}
                        </span>
                    </div>

                    {currentItem.trang_thai === 'DA_GHI_NHAN' && (
                        <button className="ctp-btn-cancel-action" onClick={() => setShowCancelModal(true)}>
                            HỦY PHIẾU THU
                        </button>
                    )}
                </div>

                <div className="ctp-amount-display">
                    {formatMoney(currentItem.so_tien)}
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
            {currentItem.trang_thai === 'HUY' && (
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
                                <span className="val bold">{currentItem.ma_phieu}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">LOẠI PHIẾU</span>
                                <span className="val bold">PHIẾU THU</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">MÃ LOẠI</span>
                                <span className="val bold">{currentItem.ma_loai || '—'}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">TÊN LOẠI</span>
                                <span className="val">{currentItem.ten_loai || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Đối tượng nộp tiền */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">ĐỐI TƯỢNG NỘP TIỀN</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">NHÓM</span>
                                <span className="val bold">{mapGroupToText(currentItem.nhom_nguoi_nop_nhan)}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">NGƯỜI NỘP</span>
                                <span className="val bold">{currentItem.ten_nguoi_nop_nhan || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Giá trị giao dịch */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">GIÁ TRỊ GIAO DỊCH</div>
                        <div className="ctp-info-grid">
                            <div className="ctp-info-item">
                                <span className="lbl">SỐ TIỀN</span>
                                <span className="val amount-val">{formatMoney(currentItem.so_tien)}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">PHƯƠNG THỨC</span>
                                <span className="val bold">{mapPaymentMethodToText(currentItem.phuong_thuc_thanh_toan)}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">NGÀY GHI NHẬN</span>
                                <span className="val">{currentItem.ngay_ghi_nhan ? new Date(currentItem.ngay_ghi_nhan).toLocaleString() : '—'}</span>
                            </div>
                            <div className="ctp-info-item">
                                <span className="lbl">CHỨNG TỪ</span>
                                <span className="val">{currentItem.ma_chung_tu_tham_chieu || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Mô tả / Tags */}
                    <div className="ctp-section">
                        <div className="ctp-section-label">MÔ TẢ / TAGS</div>
                        <div className="ctp-desc-box">
                            <span className="lbl">MÔ TẢ</span>
                            <p className="desc-text">{currentItem.mo_ta || 'Không có mô tả'}</p>
                        </div>
                        <div className="ctp-tags-box">
                            <span className="lbl">TAGS</span>
                            <div className="tag-chips">
                                {(currentItem.tags && currentItem.tags.length > 0 ? currentItem.tags.split(',') : []).map((t, idx) => (
                                    <span key={idx} className="tag-pill">{t.trim()}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Meta Info Sidebar */}
                <div className="ctp-sidebar-card">
                    <div className="ctp-meta-group">
                        <span className="meta-lbl">NGUỒN TẠO</span>
                        <span className="meta-val bold">{mapSourceToText(currentItem.nguon_tao)}</span>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">NGƯỜI TẠO</span>
                        <span className="meta-val bold">{currentItem.ten_nguoi_tao || '—'}</span>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">THỜI GIAN</span>
                        <div className="time-sub-row">
                            <span className="sub-lbl">NGÀY TẠO</span>
                            <span className="sub-val">{currentItem.ngay_tao ? new Date(currentItem.ngay_tao).toLocaleString() : '—'}</span>
                        </div>
                        <div className="time-sub-row">
                            <span className="sub-lbl">CẬP NHẬT</span>
                            <span className="sub-val">{currentItem.ngay_cap_nhat ? new Date(currentItem.ngay_cap_nhat).toLocaleString() : '—'}</span>
                        </div>
                    </div>

                    <div className="ctp-meta-group">
                        <span className="meta-lbl">TRẠNG THÁI</span>
                        <span className={`ctp-status-badge ${currentItem.trang_thai === 'HUY' ? 'status-danger' : 'status-success'}`}>
                            {mapStatusToText(currentItem.trang_thai)}
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
                                <div className="modal-info-code">{currentItem.ma_phieu}</div>
                                <div className="modal-info-amount">{formatMoney(currentItem.so_tien)}</div>
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
