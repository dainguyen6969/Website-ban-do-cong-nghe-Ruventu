import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './ChiTietLoaiPhieuThu.css'; // Reuse CSS

const fallbackMock = {
    'LPC001': { id: 1, code: 'LPC001', name: 'Chi nhập hàng', type: 'CHI', note: 'Thanh toán tiền mua hàng hóa, nguyên vật liệu', status: 'HOẠT ĐỘNG' },
    'LPC002': { id: 2, code: 'LPC002', name: 'Chi hoàn tiền khách hàng', type: 'CHI', note: 'Hoàn tiền cho khách đổi/trả hàng', status: 'HOẠT ĐỘNG' },
    'LPC020': { id: 6, code: 'LPC020', name: 'Chi phí thuê mặt bằng', type: 'CHI', note: '-', status: 'NGỪNG HOẠT ĐỘNG' }
};

export default function ChiTietLoaiPhieuChi() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { loaiPhieuChiList, toggleStatusLoaiPhieuChi } = useCashbook();
    
    const [modalType, setModalType] = useState(null); // 'STOP' | 'REACTIVATE' | null
    const [bannerMessage, setBannerMessage] = useState('');

    const contextItem = loaiPhieuChiList?.find(x => x.code === id);
    const item = contextItem || fallbackMock[id] || { code: id, name: 'Loại phiếu chi mẫu', type: 'CHI', note: '-', status: 'HOẠT ĐỘNG' };

    const handleConfirmStop = () => {
        setModalType(null);
        if (toggleStatusLoaiPhieuChi) {
            toggleStatusLoaiPhieuChi(item.code, 'NGỪNG HOẠT ĐỘNG');
        }
        setBannerMessage('NGỪNG HOẠT ĐỘNG THÀNH CÔNG');
    };

    const handleConfirmReactivate = () => {
        setModalType(null);
        if (toggleStatusLoaiPhieuChi) {
            toggleStatusLoaiPhieuChi(item.code, 'HOẠT ĐỘNG');
        }
        setBannerMessage('KÍCH HOẠT LẠI THÀNH CÔNG');
    };

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
                            <h3>KÍCH HOẠT LẠI LOẠI PHIẾU CHI?</h3>
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

