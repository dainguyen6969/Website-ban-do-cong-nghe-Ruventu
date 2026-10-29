import React, { useState, useEffect, useCallback } from 'react';

import { CashSourceInfo } from '../components/CashbookEnhancements';
import { formatDateTimeVN } from '../../../../shared/services/mutationUtils';
import { useParams, useNavigate } from 'react-router-dom';
import { disbursementService } from '../../../../shared/services/disbursementService';
import './ChiTietPhieu.css';

export default function ChiTietPhieuChi() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentItem, setCurrentItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await disbursementService.getDisbursementDetail(id);
      if (response.data?.data) {
        setCurrentItem(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy chi tiết phiếu chi:', error);
      setCurrentItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const formatMoney = (val) => {
    if (!val && val !== 0) return '0đ';
    return Number(val).toLocaleString('vi-VN') + 'đ';
  };

  const mapStatusToText = (status) => {
    switch (status) {
      case 'DA_GHI_NHAN':
        return 'ĐÃ GHI NHẬN';
      case 'HUY':
        return 'ĐÃ HỦY';
      default:
        return status || '—';
    }
  };

  const mapSourceToText = (source) => {
    switch (source) {
      case 'THU_CONG':
        return 'THỦ CÔNG';
      case 'TU_DONG':
        return 'TỰ ĐỘNG';
      default:
        return source || '—';
    }
  };

  const mapGroupToText = (group) => {
    switch (group) {
      case 'KHACH_HANG':
        return 'KHÁCH HÀNG';
      case 'NHAN_VIEN':
        return 'NHÂN VIÊN';
      case 'NHA_CUNG_CAP':
        return 'NHÀ CUNG CẤP';
      case 'DOI_TAC_GIAO_HANG':
        return 'ĐỐI TÁC GIAO HÀNG';
      case 'KHAC':
        return 'KHÁC';
      default:
        return group || '—';
    }
  };

  const mapPaymentMethodToText = (method) => {
    switch (method) {
      case 'TIEN_MAT':
        return 'TIỀN MẶT';
      case 'CHUYEN_KHOAN':
        return 'CHUYỂN KHOẢN';
      case 'THE':
        return 'QUẸT THẺ';
      default:
        return method || '—';
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await disbursementService.cancelDisbursement(id, { xac_nhan: true });
      setShowCancelModal(false);
      setShowSuccessBanner(true);
      await fetchDetail();
    } catch (error) {
      console.error('Lỗi khi hủy phiếu chi:', error);
      alert(error.response?.data?.message || 'Không thể hủy phiếu chi lúc này');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="ctp-page" style={{ padding: 40, textAlign: 'center' }}>
        Đang tải dữ liệu phiếu chi...
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="ctp-page" style={{ padding: 40, textAlign: 'center' }}>
        <h2>Không tìm thấy phiếu chi.</h2>
        <button
          className="ctp-btn-cancel-action"
          style={{ marginTop: 16, backgroundColor: '#374151' }}
          onClick={() => navigate('/admin/so-quy-tien-mat/phieu-chi')}
        >
          QUAY LẠI DANH SÁCH
        </button>
      </div>
    );
  }

  const canCancel = currentItem.trang_thai === 'DA_GHI_NHAN' && currentItem.nguon_tao !== 'TU_DONG';

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
        <div className="ctp-sub-breadcrumb">SỔ QUỸ TIỀN MẶT / PHIẾU CHI / CHI TIẾT PHIẾU CHI</div>
        <div className="ctp-title-row">
          <div className="ctp-title-left">
            <span className="ctp-badge-box">PHIẾU CHI</span>
            <h1 className="ctp-code-title">{currentItem.ma_phieu}</h1>
            <span
              className={`ctp-status-badge ${currentItem.trang_thai === 'HUY' ? 'status-danger' : 'status-success'}`}
            >
              {mapStatusToText(currentItem.trang_thai)}
            </span>
          </div>

          {canCancel && (
            <button className="ctp-btn-cancel-action" onClick={() => setShowCancelModal(true)}>
              HỦY PHIẾU CHI
            </button>
          )}
        </div>

        <div className="ctp-amount-display red-text">{formatMoney(currentItem.so_tien)}</div>
      </div>

      {/* Success Banner if Canceled */}
      {showSuccessBanner && (
        <div className="ctp-banner-success">
          <span className="banner-icon">&#10003;</span>
          <span>HỦY PHIẾU CHI THÀNH CÔNG</span>
        </div>
      )}

      {/* Secondary Alert Bar if Canceled */}
      {currentItem.trang_thai === 'HUY' && (
        <div className="ctp-banner-danger">PHIẾU CHI ĐÃ HỦY</div>
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
                <span className="val bold">PHIẾU CHI</span>
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

          {/* Section 2: Người nhận */}
          <div className="ctp-section">
            <div className="ctp-section-label">NGƯỜI NHẬN</div>
            <div className="ctp-info-grid">
              <div className="ctp-info-item">
                <span className="lbl">NHÓM</span>
                <span className="val bold">{mapGroupToText(currentItem.nhom_nguoi_nop_nhan)}</span>
              </div>
              <div className="ctp-info-item">
                <span className="lbl">TÊN NGƯỜI NHẬN</span>
                <span className="val bold">{currentItem.ten_nguoi_nop_nhan || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Giá trị giao dịch */}
          <div className="ctp-section">
            <div className="ctp-section-label">GIÁ TRỊ GIAO DỊCH</div>
            <div className="ctp-info-grid">
              <div className="ctp-info-item">
                <span className="lbl">SỐ TIỀN CHI</span>
                <span className="val amount-val red-text">{formatMoney(currentItem.so_tien)}</span>
              </div>
              <div className="ctp-info-item">
                <span className="lbl">PHƯƠNG THỨC</span>
                <span className="val bold">
                  {mapPaymentMethodToText(currentItem.phuong_thuc_thanh_toan)}
                </span>
              </div>
              <div className="ctp-info-item">
                <span className="lbl">NGÀY GHI NHẬN</span>
                <span className="val">{formatDateDisplay(currentItem.ngay_ghi_nhan)}</span>
              </div>
            </div>
          </div>

          <div className="ctp-section">
            <div className="ctp-section-label">CHỨNG TỪ LIÊN QUAN</div>

            <CashSourceInfo item={currentItem} />
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
                {(currentItem.tags && currentItem.tags.length > 0
                  ? Array.isArray(currentItem.tags)
                    ? currentItem.tags
                    : currentItem.tags.split(',')
                  : []
                ).map((t, idx) => (
                  <span key={idx} className="tag-pill">
                    {t.trim()}
                  </span>
                ))}
                {(!currentItem.tags || currentItem.tags.length === 0) && (
                  <span style={{ color: '#9ca3af', fontSize: '13px' }}>Không có tags</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Meta Info Sidebar */}
        <div className="ctp-sidebar-card">
          <div className="ctp-meta-group">
            <span className="meta-lbl">LOẠI CHI</span>
            <span className="meta-val bold">{currentItem.ma_loai || '—'}</span>
            <div className="sub-type-name">{currentItem.ten_loai || '—'}</div>
          </div>

          <div className="ctp-meta-group">
            <span className="meta-lbl">NGUỒN TẠO</span>
            <span className="meta-val bold">{mapSourceToText(currentItem.nguon_tao)}</span>
          </div>

          <div className="ctp-meta-group">
            <span className="meta-lbl">NGƯỜI TẠO</span>
            <span className="meta-val bold">
              {currentItem.ten_nguoi_tao ||
                (currentItem.nguon_tao === 'TU_DONG' ? 'HỆ THỐNG' : '—')}
            </span>
          </div>

          <div className="ctp-meta-group">
            <span className="meta-lbl">THỜI GIAN</span>

            <div className="time-sub-row">
              <span className="sub-lbl">LẬP PHIẾU</span>

              <span className="sub-val">{formatDateTimeVN(currentItem.created_at)}</span>
            </div>

            <div className="time-sub-row">
              <span className="sub-lbl">CẬP NHẬT</span>

              <span className="sub-val">{formatDateTimeVN(currentItem.updated_at)}</span>
            </div>
          </div>

          <div className="ctp-meta-group">
            <span className="meta-lbl">TRẠNG THÁI</span>
            <span
              className={`ctp-status-badge ${currentItem.trang_thai === 'HUY' ? 'status-danger' : 'status-success'}`}
            >
              {mapStatusToText(currentItem.trang_thai)}
            </span>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn-modal-cancel"
              style={{
                width: '100%',
                padding: '10px 0',
                border: '1px solid #d1d5db',
                borderRadius: 6,
              }}
              onClick={() => navigate('/admin/so-quy-tien-mat/phieu-chi')}
            >
              ← VỀ DANH SÁCH
            </button>
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
                <div className="modal-info-code">{currentItem.ma_phieu}</div>
                <div className="modal-info-amount red-text">{formatMoney(currentItem.so_tien)}</div>
              </div>
              <div className="ctp-modal-warning">
                HỦY PHIẾU CHI LOẠI BỎ GHI NHẬN CHI SAI KHỎI SỔ QUỸ.
                <br />
                THAO TÁC NÀY KHÔNG THỰC HIỆN CHUYỂN TIỀN HOẶC HOÀN TIỀN.
              </div>
            </div>
            <div className="ctp-modal-footer">
              <button
                className="btn-modal-cancel"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                QUAY LẠI
              </button>
              <button
                className="btn-modal-confirm-red"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'ĐANG HỦY...' : 'XÁC NHẬN HỦY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
