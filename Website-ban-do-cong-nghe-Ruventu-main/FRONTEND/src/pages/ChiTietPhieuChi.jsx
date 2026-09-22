import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPhieuChiById, cancelPhieuChi } from '../utils/phieuChiStore';
import './ChiTietPhieuChi.css';

export default function ChiTietPhieuChi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setData(getPhieuChiById(id));
  }, [id]);

  if (!data) return <div className="ct-pc-loading">Đang tải...</div>;

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const confirmCancel = () => {
    cancelPhieuChi(id);
    setData(getPhieuChiById(id));
    setShowConfirm(false);
  };

  const cancelCancel = () => {
    setShowConfirm(false);
  };

  return (
    <main className="ct-pc-page">
      <div className="ct-pc-header">
        <div className="ct-pc-breadcrumb">
          SỔ QUỸ TIỀN MẶT / PHIẾU CHI / <strong>CHI TIẾT PHIẾU CHI</strong>
        </div>
        <div className="ct-pc-title-row">
          <div className="ct-pc-title">
            <span className="ct-pc-label">PHIẾU CHI</span>
            <h1>{data.id}</h1>
            <span className={`ct-pc-badge ${data.trangThai === 'ĐÃ GHI NHẬN' ? 'ct-pc-badge-success' : 'ct-pc-badge-error'}`}>
              {data.trangThai}
            </span>
          </div>
          {data.trangThai === 'ĐÃ GHI NHẬN' && (
            <button className="ct-pc-btn-cancel-doc" onClick={handleCancelClick}>
              HỦY PHIẾU CHI
            </button>
          )}
        </div>
        <div className="ct-pc-amount-header">
          {parseInt(data.soTien).toLocaleString('vi-VN')}đ
        </div>
      </div>

      <div className="ct-pc-body">
        <div className="ct-pc-main-col">
          <section className="ct-pc-section">
            <h2>THÔNG TIN PHIẾU</h2>
            <div className="ct-pc-grid-2">
              <div className="ct-pc-info-group">
                <label>MÃ PHIẾU</label>
                <div className="ct-pc-value">{data.id}</div>
              </div>
              <div className="ct-pc-info-group">
                <label>LOẠI PHIẾU</label>
                <div className="ct-pc-value">PHIẾU CHI</div>
              </div>
              <div className="ct-pc-info-group">
                <label>MÃ LOẠI</label>
                <div className="ct-pc-value">{data.maLoai}</div>
              </div>
              <div className="ct-pc-info-group">
                <label>TÊN LOẠI</label>
                <div className="ct-pc-value">{data.tenLoai}</div>
              </div>
            </div>
            
            <h3 className="ct-pc-sub-heading mt-4">NGƯỜI NHẬN</h3>
            <div className="ct-pc-grid-2">
              <div className="ct-pc-info-group">
                <label>NHÓM</label>
                <div className="ct-pc-value">{data.nhomDoiTuong}</div>
              </div>
              <div className="ct-pc-info-group">
                <label>TÊN NGƯỜI NHẬN</label>
                <div className="ct-pc-value">{data.nguoiNhan}</div>
              </div>
            </div>
          </section>

          <section className="ct-pc-section">
            <h2>GIÁ TRỊ GIAO DỊCH</h2>
            <div className="ct-pc-grid-2">
              <div className="ct-pc-info-group">
                <label>SỐ TIỀN CHI</label>
                <div className="ct-pc-value ct-pc-amount-text">
                  {parseInt(data.soTien).toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="ct-pc-info-group">
                <label>PHƯƠNG THỨC</label>
                <div className="ct-pc-value">{data.phuongThuc}</div>
              </div>
              <div className="ct-pc-info-group">
                <label>NGÀY GHI NHẬN</label>
                <div className="ct-pc-value">{data.ngayGhiNhan}</div>
              </div>
              <div className="ct-pc-info-group">
                <label>CHỨNG TỪ</label>
                <div className="ct-pc-value">{data.chungTu}</div>
              </div>
            </div>
          </section>

          <section className="ct-pc-section">
            <h2>MÔ TẢ / TAGS</h2>
            <div className="ct-pc-info-group mb-4">
              <label>MÔ TẢ</label>
              <div className="ct-pc-value">{data.moTa || '-'}</div>
            </div>
            <div className="ct-pc-info-group">
              <label>TAGS</label>
              <div className="ct-pc-tags">
                {data.tags && data.tags.length > 0 ? (
                  data.tags.map((tag, idx) => <span key={idx} className="ct-pc-tag">{tag}</span>)
                ) : '-'}
              </div>
            </div>
          </section>
        </div>

        <div className="ct-pc-side-col">
          <div className="ct-pc-side-item">
            <label>LOẠI CHI</label>
            <div className="ct-pc-value">{data.maLoai}</div>
            <div className="ct-pc-sub">{data.tenLoai}</div>
          </div>
          
          <div className="ct-pc-side-item">
            <label>NGUỒN TẠO</label>
            <div className="ct-pc-value">{data.nguonTao}</div>
          </div>
          
          <div className="ct-pc-side-item">
            <label>NGƯỜI TẠO</label>
            <div className="ct-pc-value">{data.nguoiTao}</div>
          </div>
          
          <div className="ct-pc-side-item">
            <label>THỜI GIAN</label>
            <div className="ct-pc-sub-label mt-2">NGÀY TẠO</div>
            <div className="ct-pc-value-sm">{data.ngayGhiNhan}</div>
            
            <div className="ct-pc-sub-label mt-2">CẬP NHẬT</div>
            <div className="ct-pc-value-sm">{data.ngayGhiNhan}</div>
          </div>
          
          <div className="ct-pc-side-item">
            <label>TRẠNG THÁI</label>
            <div className="mt-2">
              <span className={`ct-pc-badge ${data.trangThai === 'ĐÃ GHI NHẬN' ? 'ct-pc-badge-success' : 'ct-pc-badge-error'}`}>
                {data.trangThai}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="ct-confirm-overlay">
          <div className="ct-confirm-modal">
            <p>Bạn có chắc chắn muốn hủy phiếu chi này không?</p>
            <div className="ct-confirm-actions">
              <button className="ct-btn-confirm-ok" onClick={confirmCancel}>OK</button>
              <button className="ct-btn-confirm-cancel" onClick={cancelCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
