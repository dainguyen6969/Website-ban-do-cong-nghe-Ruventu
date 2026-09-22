import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoaiPhieuThuById, updateLoaiPhieuThuStatus } from '../utils/loaiPhieuThuStore';
import './ChiTietLoaiPhieuThu.css';

export default function ChiTietLoaiPhieuThu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setData(getLoaiPhieuThuById(id));
  }, [id]);

  if (!data) return <div className="ct-loai-loading">Đang tải...</div>;

  const handleDeactivateClick = () => {
    setShowConfirm(true);
  };

  const confirmDeactivate = () => {
    updateLoaiPhieuThuStatus(id, "NGỪNG HOẠT ĐỘNG");
    setData(getLoaiPhieuThuById(id));
    setShowConfirm(false);
  };

  const cancelDeactivate = () => {
    setShowConfirm(false);
  };

  return (
    <main className="ct-loai-page">
      <div className="ct-loai-header">
        <div className="ct-loai-breadcrumb">
          SỔ QUỸ TIỀN MẶT / LOẠI PHIẾU THU / <strong>CHI TIẾT</strong>
        </div>
        <div className="ct-loai-title-row">
          <div className="ct-loai-title">
            <span className="ct-loai-label">LOẠI PHIẾU THU</span>
            <h1>{data.maLoai} {data.tenLoai}</h1>
            <span className={`ct-loai-badge ${data.trangThai === 'HOẠT ĐỘNG' ? 'ct-loai-badge-success' : 'ct-loai-badge-inactive'}`}>
              {data.trangThai}
            </span>
          </div>
          {data.trangThai === 'HOẠT ĐỘNG' && (
            <button className="ct-loai-btn-deactivate" onClick={handleDeactivateClick}>
              NGỪNG HOẠT ĐỘNG
            </button>
          )}
        </div>
      </div>

      <div className="ct-loai-body">
        <div className="ct-loai-info-group">
          <label>MÃ LOẠI</label>
          <div className="ct-loai-value">{data.maLoai}</div>
        </div>
        
        <div className="ct-loai-info-group">
          <label>TÊN LOẠI</label>
          <div className="ct-loai-value">{data.tenLoai}</div>
        </div>

        <div className="ct-loai-info-group">
          <label>LOẠI PHIẾU</label>
          <div className="ct-loai-value">{data.loaiPhieu}</div>
        </div>

        <div className="ct-loai-info-group">
          <label>GHI CHÚ</label>
          <div className="ct-loai-value">{data.ghiChu}</div>
        </div>

        <div className="ct-loai-info-group">
          <label>TRẠNG THÁI</label>
          <div className={`ct-loai-value-status ${data.trangThai === 'HOẠT ĐỘNG' ? 'ct-status-active' : 'ct-status-inactive'}`}>
            {data.trangThai}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="ct-confirm-overlay">
          <div className="ct-confirm-modal">
            <p>Bạn có chắc chắn muốn ngừng hoạt động loại phiếu thu này không?</p>
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
