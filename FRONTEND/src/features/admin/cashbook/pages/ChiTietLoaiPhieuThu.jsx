import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './ChiTietLoaiPhieuThu.css';

const fallbackMock = {
    'LPT001': { id: 1, code: 'LPT001', name: 'Thu bán hàng', type: 'THU', note: 'Doanh thu từ bán hàng tại quầy và online', status: 'HOẠT ĐỘNG' },
    'LPT002': { id: 2, code: 'LPT002', name: 'Thu nợ khách hàng', type: 'THU', note: 'Thu hồi công nợ từ khách hàng', status: 'HOẠT ĐỘNG' },
    'LPT006': { id: 6, code: 'LPT006', name: 'Thu bồi thường', type: 'THU', note: 'Thu bồi thường từ đối tác, nhà cung cấp', status: 'NGỪNG HOẠT ĐỘNG' }
};

export default function ChiTietLoaiPhieuThu() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { loaiPhieuThuList, toggleStatusLoaiPhieuThu } = useCashbook();
    
    const [modalType, setModalType] = useState(null); // 'STOP' | 'REACTIVATE' | null
    const [bannerMessage, setBannerMessage] = useState('');

    const contextItem = loaiPhieuThuList?.find(x => x.code === id);
    const item = contextItem || fallbackMock[id] || { code: id, name: 'Loại phiếu thu mẫu', type: 'THU', note: '-', status: 'HOẠT ĐỘNG' };

    const handleConfirmStop = () => {
        setModalType(null);
        if (toggleStatusLoaiPhieuThu) {
            toggleStatusLoaiPhieuThu(item.code, 'NGỪNG HOẠT ĐỘNG');
        }
        setBannerMessage('NGỪNG HOẠT ĐỘNG THÀNH CÔNG');
    };

    const handleConfirmReactivate = () => {
        setModalType(null);
        if (toggleStatusLoaiPhieuThu) {
            toggleStatusLoaiPhieuThu(item.code, 'HOẠT ĐỘNG');
        }
        setBannerMessage('KÍCH HOẠT LẠI THÀNH CÔNG');
    };

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
                            <button className="lpt-btn-outline" onClick={() => setModalType(null)}>QUAY LẠI</button>
                            <button className="ctlpt-btn-confirm" onClick={handleConfirmStop}>XÁC NHẬN NGỪNG</button>
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
                            <button className="lpt-btn-outline" onClick={() => setModalType(null)}>QUAY LẠI</button>
                            <button className="btn-confirm-reactivate" onClick={handleConfirmReactivate}>XÁC NHẬN KÍCH HOẠT</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

