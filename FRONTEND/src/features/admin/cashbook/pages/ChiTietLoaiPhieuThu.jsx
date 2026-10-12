import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ChiTietLoaiPhieuThu.css';
import { getReceiptTypeDetail, updateReceiptTypeStatus, RECEIPT_TYPE_STATUS } from '../api/receiptTypeApi';

export default function ChiTietLoaiPhieuThu() {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [modalType, setModalType] = useState(null); // 'STOP' | 'REACTIVATE' | null
    const [bannerMessage, setBannerMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const fetchDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getReceiptTypeDetail(id, controller.signal);
                setItem(data);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Không thể tải thông tin loại phiếu thu. Vui lòng thử lại.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
        return () => controller.abort();
    }, [id]);

    const handleConfirmStop = async () => {
        setActionLoading(true);
        try {
            await updateReceiptTypeStatus(id, false);
            setItem(prev => ({ ...prev, status: RECEIPT_TYPE_STATUS.inactive }));
            setBannerMessage('NGỪNG HOẠT ĐỘNG THÀNH CÔNG');
            setModalType(null);
        } catch (err) {
            alert(err.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmReactivate = async () => {
        setActionLoading(true);
        try {
            await updateReceiptTypeStatus(id, true);
            setItem(prev => ({ ...prev, status: RECEIPT_TYPE_STATUS.active }));
            setBannerMessage('KÍCH HOẠT LẠI THÀNH CÔNG');
            setModalType(null);
        } catch (err) {
            alert(err.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="ctlpt-page"><div className="pt-empty-state"><p>ĐANG TẢI DỮ LIỆU...</p></div></div>;
    }

    if (error) {
        return <div className="ctlpt-page"><div className="pt-empty-state"><p className="text-red">{error}</p></div></div>;
    }

    if (!item) return null;

    return (
        <div className="ctlpt-page">
            <div className="ctlpt-header">
                <div className="ctlpt-breadcrumb">
                    SỔ QUỸ TIỀN MẶT / LOẠI PHIẾU THU / CHI TIẾT
                </div>
                
                <div className="ctlpt-header-main">
                    <div className="ctlpt-title-area">
                        <span className="ctlpt-badge">LOẠI PHIẾU THU</span>
                        <h1>{item.code} <span>{item.name}</span></h1>
                        <span className={`status-outline ${item.status === 'NGỪNG HOẠT ĐỘNG' ? 'status-gray' : 'status-success'}`}>
                            {item.status}
                        </span>
                    </div>
                    {item.status === 'HOẠT ĐỘNG' ? (
                        <button className="ctlpt-btn-stop" onClick={() => setModalType('STOP')}>NGỪNG HOẠT ĐỘNG</button>
                    ) : (
                        <button className="ctlpt-btn-reactivate" onClick={() => setModalType('REACTIVATE')}>KÍCH HOẠT LẠI</button>
                    )}
                </div>
            </div>

            {bannerMessage && (
                <div className="ctlpt-banner-success">
                    {bannerMessage}
                </div>
            )}

            <div className="ctlpt-content">
                <div className="ctlpt-info-group">
                    <label>MÃ LOẠI</label>
                    <div className="ctlpt-value"><strong>{item.code}</strong></div>
                </div>
                
                <div className="ctlpt-info-group">
                    <label>TÊN LOẠI</label>
                    <div className="ctlpt-value"><strong>{item.name}</strong></div>
                </div>

                <div className="ctlpt-info-group">
                    <label>LOẠI PHIẾU</label>
                    <div className="ctlpt-value"><strong>{item.type}</strong></div>
                </div>

                <div className="ctlpt-info-group">
                    <label>GHI CHÚ</label>
                    <div className="ctlpt-value"><strong>{item.note}</strong></div>
                </div>

                <div className="ctlpt-info-group">
                    <label>TRẠNG THÁI</label>
                    <div className="ctlpt-value">
                        <strong className={item.status === 'NGỪNG HOẠT ĐỘNG' ? 'text-gray' : 'text-green'}>
                            {item.status}
                        </strong>
                    </div>
                </div>
            </div>

            {modalType === 'STOP' && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal ctlpt-modal">
                        <div className="lpt-modal-header">
                            <h3>NGỪNG SỬ DỤNG LOẠI PHIẾU THU?</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="ctlpt-modal-box">
                                <strong>{item.code}</strong>
                                <span>{item.name}</span>
                            </div>
                            <p className="ctlpt-modal-warning">
                                LOẠI NÀY SẼ KHÔNG CÒN ĐƯỢC CHỌN KHI TẠO PHIẾU THU MỚI. CÁC PHIẾU THU CŨ VẪN GIỮ NGUYÊN THÔNG TIN VÀ GIÁ TRỊ.
                            </p>
                        </div>
                        <div className="lpt-modal-footer">
                            <button className="lpt-btn-outline" onClick={() => setModalType(null)} disabled={actionLoading}>QUAY LẠI</button>
                            <button className="ctlpt-btn-confirm" onClick={handleConfirmStop} disabled={actionLoading}>{actionLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN NGỪNG'}</button>
                        </div>
                    </div>
                </div>
            )}

            {modalType === 'REACTIVATE' && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal ctlpt-modal">
                        <div className="lpt-modal-header">
                            <h3>KÍCH HOẠT LẠI LOẠI PHIẾU THU?</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="ctlpt-modal-box">
                                <strong>{item.code}</strong>
                                <span>{item.name}</span>
                            </div>
                        </div>
                        <div className="lpt-modal-footer">
                            <button className="lpt-btn-outline" onClick={() => setModalType(null)} disabled={actionLoading}>QUAY LẠI</button>
                            <button className="btn-confirm-reactivate" onClick={handleConfirmReactivate} disabled={actionLoading}>{actionLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN KÍCH HOẠT'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

