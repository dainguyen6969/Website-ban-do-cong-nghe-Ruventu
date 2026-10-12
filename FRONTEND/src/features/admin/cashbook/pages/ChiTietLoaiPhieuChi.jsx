import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ChiTietLoaiPhieuThu.css'; // Reuse CSS
import { getDisbursementTypeDetail, updateDisbursementTypeStatus, DISBURSEMENT_TYPE_STATUS } from '../api/disbursementTypeApi';

export default function ChiTietLoaiPhieuChi() {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalType, setModalType] = useState(null); // 'STOP' | 'REACTIVATE' | null
    const [bannerMessage, setBannerMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const fetchDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getDisbursementTypeDetail(id, controller.signal);
                setItem(data);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Không thể lấy thông tin chi tiết loại phiếu chi.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();

        return () => {
            controller.abort();
        };
    }, [id]);

    const handleConfirmStop = async () => {
        setActionLoading(true);
        try {
            await updateDisbursementTypeStatus(id, false);
            setItem(prev => ({ ...prev, status: DISBURSEMENT_TYPE_STATUS.inactive }));
            setBannerMessage('NGỪNG HOẠT ĐỘNG THÀNH CÔNG');
            setModalType(null);
        } catch (err) {
            alert('Có lỗi xảy ra, không thể cập nhật trạng thái.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmReactivate = async () => {
        setActionLoading(true);
        try {
            await updateDisbursementTypeStatus(id, true);
            setItem(prev => ({ ...prev, status: DISBURSEMENT_TYPE_STATUS.active }));
            setBannerMessage('KÍCH HOẠT LẠI THÀNH CÔNG');
            setModalType(null);
        } catch (err) {
            alert('Có lỗi xảy ra, không thể cập nhật trạng thái.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="ctlpt-page"><div className="ctlpt-header">ĐANG TẢI...</div></div>;
    }

    if (error || !item) {
        return (
            <div className="ctlpt-page">
                <div className="ctlpt-header">
                    <div className="text-red">{error || 'Không tìm thấy thông tin.'}</div>
                    <button className="lpt-btn-outline" style={{marginTop: 10}} onClick={() => navigate('/admin/so-quy-tien-mat/loai-phieu-chi')}>QUAY LẠI</button>
                </div>
            </div>
        );
    }

    return (
        <div className="ctlpt-page">
            <div className="ctlpt-header">
                <div className="ctlpt-breadcrumb">
                    SỔ QUỸ TIỀN MẶT / LOẠI PHIẾU CHI / CHI TIẾT
                </div>
                
                <div className="ctlpt-header-main">
                    <div className="ctlpt-title-area">
                        <span className="ctlpt-badge">LOẠI PHIẾU CHI</span>
                        <h1>{item.code} <span>{item.name}</span></h1>
                        <span className={`status-outline ${item.status === DISBURSEMENT_TYPE_STATUS.inactive ? 'status-gray' : 'status-success'}`}>
                            {item.status}
                        </span>
                    </div>
                    {item.status === DISBURSEMENT_TYPE_STATUS.active ? (
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
                        <strong className={item.status === DISBURSEMENT_TYPE_STATUS.inactive ? 'text-gray' : 'text-green'}>
                            {item.status}
                        </strong>
                    </div>
                </div>
            </div>

            {modalType === 'STOP' && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal ctlpt-modal">
                        <div className="lpt-modal-header">
                            <h3>NGỪNG SỬ DỤNG LOẠI PHIẾU CHI?</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="ctlpt-modal-box">
                                <strong>{item.code}</strong>
                                <span>{item.name}</span>
                            </div>
                            <p className="ctlpt-modal-warning">
                                LOẠI NÀY SẼ KHÔNG CÒN ĐƯỢC CHỌN KHI TẠO PHIẾU CHI MỚI. CÁC PHIẾU CHI CŨ VẪN GIỮ NGUYÊN THÔNG TIN VÀ GIÁ TRỊ.
                            </p>
                        </div>
                        <div className="lpt-modal-footer">
                            <button className="lpt-btn-outline" onClick={() => setModalType(null)} disabled={actionLoading}>QUAY LẠI</button>
                            <button className="ctlpt-btn-confirm" onClick={handleConfirmStop} disabled={actionLoading}>
                                {actionLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN NGỪNG'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalType === 'REACTIVATE' && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal ctlpt-modal">
                        <div className="lpt-modal-header">
                            <h3>KÍCH HOẠT LẠI LOẠI PHIẾU CHI?</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="ctlpt-modal-box">
                                <strong>{item.code}</strong>
                                <span>{item.name}</span>
                            </div>
                        </div>
                        <div className="lpt-modal-footer">
                            <button className="lpt-btn-outline" onClick={() => setModalType(null)} disabled={actionLoading}>QUAY LẠI</button>
                            <button className="btn-confirm-reactivate" onClick={handleConfirmReactivate} disabled={actionLoading}>
                                {actionLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN KÍCH HOẠT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
