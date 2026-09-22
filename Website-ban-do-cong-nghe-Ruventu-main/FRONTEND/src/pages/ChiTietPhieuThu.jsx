import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPhieuThuById, cancelPhieuThu } from '../utils/phieuThuStore';
import './ChiTietPhieuThu.css';

export default function ChiTietPhieuThu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phieu, setPhieu] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const data = getPhieuThuById(id);
    if (data) {
      setPhieu(data);
    }
  }, [id]);

  if (!phieu) {
    return <div className="ct-phieu-loading">Đang tải dữ liệu...</div>;
  }

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const confirmCancel = () => {
    cancelPhieuThu(phieu.id);
    setPhieu(getPhieuThuById(id)); // Refresh data
    setShowConfirm(false);
  };

  const cancelCancel = () => {
    setShowConfirm(false);
  };

  return (
    <main className="ct-phieu-page">
      <div className="ct-phieu-header">
        <div className="ct-phieu-breadcrumb">SỔ QUỸ TIỀN MẶT / PHIẾU THU / <strong>CHI TIẾT PHIẾU THU</strong></div>
        
        <div className="ct-phieu-title-row">
          <div className="ct-phieu-title-left">
            <span className="ct-phieu-label">PHIẾU THU</span>
            <h1>{phieu.id}</h1>
            <span className={`ct-phieu-badge ${phieu.trangThai === 'ĐÃ GHI NHẬN' ? 'success' : 'danger'}`}>
              {phieu.trangThai}
            </span>
          </div>
          {phieu.trangThai === 'ĐÃ GHI NHẬN' && (
            <button className="ct-phieu-btn-cancel" onClick={handleCancelClick}>HỦY PHIẾU THU</button>
          )}
        </div>

        <div className="ct-phieu-amount-huge">
          {Number(phieu.soTien).toLocaleString('vi-VN')}đ
        </div>
      </div>

      <div className="ct-phieu-layout">
        <div className="ct-phieu-main">
          {/* Thông tin phiếu */}
          <div className="ct-phieu-section">
            <h2>THÔNG TIN PHIẾU</h2>
            <div className="ct-phieu-grid-2">
              <div className="ct-phieu-field">
                <label>MÃ PHIẾU</label>
                <div>{phieu.id}</div>
              </div>
              <div className="ct-phieu-field">
                <label>LOẠI PHIẾU</label>
                <div>PHIẾU THU</div>
              </div>
              <div className="ct-phieu-field">
                <label>MÃ LOẠI</label>
                <div>{phieu.maLoai}</div>
              </div>
              <div className="ct-phieu-field">
                <label>TÊN LOẠI</label>
                <div>{phieu.tenLoai}</div>
              </div>
            </div>
          </div>

          {/* Đối tượng nộp tiền */}
          <div className="ct-phieu-section">
            <h2>ĐỐI TƯỢNG NỘP TIỀN</h2>
            <div className="ct-phieu-grid-2">
              <div className="ct-phieu-field">
                <label>NHÓM</label>
                <div><strong>{phieu.nhom}</strong></div>
              </div>
              <div className="ct-phieu-field">
                <label>NGƯỜI NỘP</label>
                <div><strong>{phieu.nguoiNop}</strong></div>
              </div>
            </div>
          </div>

          {/* Giá trị giao dịch */}
          <div className="ct-phieu-section">
            <h2>GIÁ TRỊ GIAO DỊCH</h2>
            <div className="ct-phieu-grid-2">
              <div className="ct-phieu-field">
                <label>SỐ TIỀN</label>
                <div className="ct-phieu-amount">{Number(phieu.soTien).toLocaleString('vi-VN')}đ</div>
              </div>
              <div className="ct-phieu-field">
                <label>PHƯƠNG THỨC</label>
                <div>{phieu.phuongThuc}</div>
              </div>
              <div className="ct-phieu-field">
                <label>NGÀY GHI NHẬN</label>
                <div>{phieu.ngayGhiNhan}</div>
              </div>
              <div className="ct-phieu-field">
                <label>CHỨNG TỪ</label>
                <div>{phieu.chungTu || "-"}</div>
              </div>
            </div>
          </div>

          {/* Mô tả */}
          <div className="ct-phieu-section ct-phieu-section-last">
            <h2>MÔ TẢ / TAGS</h2>
            <div className="ct-phieu-field">
              <label>MÔ TẢ</label>
              <div>{phieu.moTa || "-"}</div>
            </div>
          </div>
        </div>

        <div className="ct-phieu-sidebar">
          <div className="ct-phieu-field">
            <label>NGUỒN TẠO</label>
            <div>{phieu.nguonTao}</div>
          </div>
          <div className="ct-phieu-separator"></div>
          
          <div className="ct-phieu-field">
            <label>NGƯỜI TẠO</label>
            <div>{phieu.nguoiTao}</div>
          </div>
          <div className="ct-phieu-separator"></div>
          
          <div className="ct-phieu-field">
            <label>THỜI GIAN</label>
            <div className="ct-phieu-subfield">
              <span>NGÀY TẠO</span>
              {phieu.ngayGhiNhan}
            </div>
            <div className="ct-phieu-subfield mt-2">
              <span>CẬP NHẬT</span>
              {phieu.ngayGhiNhan}
            </div>
          </div>
          <div className="ct-phieu-separator"></div>

          <div className="ct-phieu-field">
            <label>TRẠNG THÁI</label>
            <div>
              <span className={`ct-phieu-badge ${phieu.trangThai === 'ĐÃ GHI NHẬN' ? 'success' : 'danger'}`}>
                {phieu.trangThai}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="ct-confirm-overlay">
          <div className="ct-confirm-modal">
            <p>Bạn có chắc chắn muốn hủy phiếu thu này không?</p>
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
