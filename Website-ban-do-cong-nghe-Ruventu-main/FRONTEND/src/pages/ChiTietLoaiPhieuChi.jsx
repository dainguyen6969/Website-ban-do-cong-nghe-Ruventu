import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoaiPhieuChiById, updateLoaiPhieuChiStatus } from '../utils/loaiPhieuChiStore';
import './ChiTietLoaiPhieuChi.css';

export default function ChiTietLoaiPhieuChi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setData(getLoaiPhieuChiById(id));
  }, [id]);

  if (!data) return <div className="ct-loaichi-loading">Đang tải...</div>;

  const handleDeactivateClick = () => {
    setShowConfirm(true);
  };

  const confirmDeactivate = () => {
    updateLoaiPhieuChiStatus(id, "NGỪNG HOẠT ĐỘNG");
    setData(getLoaiPhieuChiById(id));
    setShowConfirm(false);
  };

  const cancelDeactivate = () => {
    setShowConfirm(false);
  };

  return (
    <main className="ct-loaichi-page">
      <div className="ct-loaichi-header">
        <div className="ct-loaichi-breadcrumb">
          SỔ QUỸ TIỀN MẶT / LOẠI PHIẾU CHI / <strong>CHI TIẾT</strong>
        </div>
        <div className="ct-loaichi-title-row">
          <div className="ct-loaichi-title">
            <span className="ct-loaichi-label">LOẠI PHIẾU CHI</span>
            <h1>{data.maLoai} {data.tenLoai}</h1>
            <span className={`ct-loaichi-badge ${data.trangThai === 'HOẠT ĐỘNG' ? 'ct-loaichi-badge-success' : 'ct-loaichi-badge-inactive'}`}>
              {data.trangThai}
            </span>
          </div>
          {data.trangThai === 'HOẠT ĐỘNG' && (
            <button className="ct-loaichi-btn-deactivate" onClick={handleDeactivateClick}>
              NGỪNG HOẠT ĐỘNG
            </button>
          )}
        </div>
      </div>

      <div className="ct-loaichi-body">
        <div className="ct-loaichi-info-group">
          <label>MÃ LOẠI</label>
          <div className="ct-loaichi-value">{data.maLoai}</div>
        </div>
        
        <div className="ct-loaichi-info-group">
          <label>TÊN LOẠI</label>
          <div className="ct-loaichi-value">{data.tenLoai}</div>
        </div>

        <div className="ct-loaichi-info-group">
          <label>LOẠI PHIẾU</label>
          <div className="ct-loaichi-value">{data.loaiPhieu}</div>
        </div>

        <div className="ct-loaichi-info-group">
          <label>GHI CHÚ</label>
          <div className="ct-loaichi-value">{data.ghiChu}</div>
        </div>

        <div className="ct-loaichi-info-group">
          <label>TRẠNG THÁI</label>
          <div className={`ct-loaichi-value-status ${data.trangThai === 'HOẠT ĐỘNG' ? 'ct-status-active' : 'ct-status-inactive'}`}>
            {data.trangThai}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="ct-confirm-overlay">
          <div className="ct-confirm-modal">
            <p>Bạn có chắc chắn muốn ngừng hoạt động loại phiếu chi này không?</p>
            <div className="ct-confirm-actions">
              <button className="ct-btn-confirm-ok" onClick={confirmDeactivate}>OK</button>
              <button className="ct-btn-confirm-cancel" onClick={cancelDeactivate}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
