import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { getPromotionById, togglePromoStatus } from '../utils/promoStore';
import './ChiTietKhuyenMai.css';

export default function ChiTietKhuyenMai() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    setPromo(getPromotionById(id));
  }, [id]);

  if (!promo) return <div>Không tìm thấy khuyến mại</div>;
  const usagePercent = typeof promo.usageMax === 'number' ? Math.round((promo.usageUsed / promo.usageMax) * 100) : 0;

  return (
    <main className="promo-detail-page">
      <div className="promo-detail-header">
        <div className="promo-breadcrumb">ADMIN &gt; KHUYẾN MẠI &gt; <strong>CHI TIẾT KHUYẾN MẠI</strong></div>
        
        <div className="promo-detail-title-row">
          <div className="promo-detail-title-left">
            <button className="promo-back-btn" onClick={() => navigate('/admin/khuyen-mai/danh-sach-khuyen-mai')}>
              <HiOutlineArrowLeft size={14} /> QUAY LẠI
            </button>
            <span className="promo-page-label">CHI TIẾT KHUYẾN MẠI</span>
          </div>
          <div className="promo-detail-title-right">
            <button className="promo-action-btn promo-action-edit" onClick={() => navigate('/admin/khuyen-mai/sua-khuyen-mai/' + promo.id)}>SỬA KHUYẾN MẠI</button>
            {(promo.status === 'ĐANG ÁP DỤNG' || promo.status === 'TẠM DỪNG') && (
              <button 
                className={`promo-action-btn ${promo.status === 'ĐANG ÁP DỤNG' ? 'promo-action-pause' : 'promo-action-resume'}`}
                onClick={() => {
                  togglePromoStatus(promo.id);
                  setPromo(getPromotionById(promo.id));
                }}
              >
                {promo.status === 'ĐANG ÁP DỤNG' ? 'TẠM DỪNG' : 'TIẾP TỤC'}
              </button>
            )}
          </div>
        </div>

        <div className="promo-detail-subtitle">
          <h1 className="promo-code">{promo.id} <PromoStatusBadge status={promo.status} /></h1>
          <p className="promo-name-desc">{promo.name}</p>
        </div>
      </div>

      <div className="promo-detail-content">
        <div className="promo-main-column">
          <section className="promo-card">
            <h2 className="promo-section-title">TỔNG QUAN CHƯƠNG TRÌNH</h2>
            <div className="promo-info-grid">
              <div className="promo-info-item">
                <label>MÃ CHƯƠNG TRÌNH</label>
                <p><strong>{promo.id}</strong></p>
              </div>
              <div className="promo-info-item">
                <label>TÊN CHƯƠNG TRÌNH</label>
                <p><strong>{promo.name}</strong></p>
              </div>
              <div className="promo-info-item">
                <label>PHƯƠNG THỨC</label>
                <p><strong>{promo.method}</strong></p>
              </div>
              <div className="promo-info-item">
                <label>ĐỐI TƯỢNG ÁP DỤNG</label>
                <p><strong>{promo.target}</strong></p>
              </div>
            </div>
            <div className="promo-info-row">
              <label>TRẠNG THÁI</label>
              <p><strong className="text-green">{promo.status}</strong></p>
            </div>
            <div className="promo-info-row">
              <label>MÔ TẢ</label>
              <p><strong>{promo.description}</strong></p>
            </div>
          </section>

          <section className="promo-card">
            <h2 className="promo-section-title">CẤU HÌNH KHUYẾN MẠI</h2>
            <div className="promo-info-row">
              <label>LOẠI: {promo.configType}</label>
            </div>
            <div className="promo-info-row mt-4">
              <label>GIÁ TRỊ GIẢM</label>
              <p className="promo-discount-value">{promo.discountValue}</p>
            </div>
          </section>
        </div>

        <div className="promo-side-column">
          <section className="promo-card">
            <h2 className="promo-section-title">LƯỢT SỬ DỤNG</h2>
            <div className="promo-usage-stats">
              <div className="usage-stat">
                <label>TỐI ĐA</label>
                <p><strong>{promo.usageMax}</strong></p>
              </div>
              <div className="usage-stat">
                <label>ĐÃ DÙNG</label>
                <p><strong>{promo.usageUsed}</strong></p>
              </div>
              <div className="usage-stat">
                <label>CÒN LẠI</label>
                <p><strong>{promo.usageRemaining}</strong></p>
              </div>
            </div>
            <div className="promo-progress-bar">
              <div className="promo-progress-fill" style={{ width: `${usagePercent}%` }}></div>
            </div>
            <div className="promo-progress-text">{usagePercent}% ĐÃ SỬ DỤNG</div>
            <div className="promo-warning-box">
              <p className="warning-title">KHÔNG THỂ XÓA</p>
              <p className="warning-desc">CHƯƠNG TRÌNH ĐÃ PHÁT SINH LƯỢT SỬ DỤNG</p>
            </div>
          </section>

          <section className="promo-card">
            <h2 className="promo-section-title">THỜI GIAN ÁP DỤNG</h2>
            <div className="promo-info-row">
              <label>BẮT ĐẦU</label>
              <p><strong>{promo.startDate}</strong></p>
            </div>
            <div className="promo-info-row mt-2">
              <label>KẾT THÚC</label>
              <p><strong>{promo.endDate}</strong></p>
            </div>
            <div className="promo-info-row mt-2">
              <label>THỜI GIAN CÒN LẠI</label>
              <p><strong>{promo.timeRemaining}</strong></p>
            </div>
          </section>

          <section className="promo-card">
            <h2 className="promo-section-title">THÔNG TIN QUẢN LÝ</h2>
            <div className="promo-info-row">
              <label>MÃ CHƯƠNG TRÌNH</label>
              <p><strong>{promo.id}</strong></p>
            </div>
            <div className="promo-info-row mt-2">
              <label>PHƯƠNG THỨC</label>
              <p><strong>{promo.method}</strong></p>
            </div>
            <div className="promo-info-row mt-2">
              <label>ĐỐI TƯỢNG</label>
              <p><strong>{promo.target}</strong></p>
            </div>
            <div className="promo-info-row mt-2">
              <label>GIÁ TRỊ GIẢM</label>
              <p><strong>{promo.discountValue}</strong></p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PromoStatusBadge({ status }) {
  const variant = 
    status === 'ĐANG ÁP DỤNG' ? 'green' :
    status === 'HẾT LƯỢT' ? 'red' :
    status === 'CHƯA BẮT ĐẦU' ? 'blue' :
    status === 'TẠM DỪNG' ? 'yellow' : 'neutral';
    
  return (
    <span className={`promo-status-badge promo-status-badge--${variant}`}>
      {status}
    </span>
  );
}
