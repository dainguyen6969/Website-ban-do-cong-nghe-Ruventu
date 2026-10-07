import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/warranty.css';
import { progressSteps, mockWarrantyData, statusColors } from '../data/mockData';

const ChiTietBaoHanh = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [data, setData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const item = mockWarrantyData.find(d => d.id === id);
    if (item) {
      setData({ ...item });
    }
  }, [id]);

  if (!data) return <div>Đang tải...</div>;

  const currentStepIndex = progressSteps.indexOf(data.status);
  const nextStep = currentStepIndex < progressSteps.length - 1 ? progressSteps[currentStepIndex + 1] : null;
  const isCompleted = data.status === 'HOÀN TẤT';

  const handleUpdateStatus = () => {
    if (nextStep) {
      const idx = mockWarrantyData.findIndex(d => d.id === id);
      if (idx !== -1) {
        mockWarrantyData[idx].status = nextStep;
        
        const now = new Date();
        const timeString = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        mockWarrantyData[idx].updated = timeString;

        setData({ ...mockWarrantyData[idx] });
      }
      setIsModalOpen(false);
      setNote('');
    }
  };

  return (
    <div className="warranty-page">
      <div className="w-breadcrumb">
        <span>ADMIN</span> <span>›</span> <span>BẢO HÀNH</span> <span>›</span> <strong>CHI TIẾT PHIẾU BẢO HÀNH</strong>
      </div>
      
      <div className="w-detail-header">
        <div className="w-detail-title-area">
          <button className="btn-back" onClick={() => navigate('/admin/bao-hanh/danh-sach')}>← QUAY LẠI</button>
          <h1 className="w-detail-title">CHI TIẾT PHIẾU BẢO HÀNH</h1>
        </div>
        {isCompleted ? (
          <button className="btn-disabled-completed" disabled>QUY TRÌNH BẢO HÀNH ĐÃ HOÀN TẤT</button>
        ) : (
          <button className="btn-black-create" onClick={() => setIsModalOpen(true)}>CẬP NHẬT TRẠNG THÁI</button>
        )}
      </div>

      <div className="w-detail-subheader">
        <span className="w-detail-id">{data.id}</span>
        <span className="w-status-badge active-status" style={{ color: statusColors[data.status]?.color, borderColor: statusColors[data.status]?.border }}>{data.status}</span>
        <span className="w-detail-date">TIẾP NHẬN {data.created}</span>
        <span className="w-detail-date">CẬP NHẬT CUỐI {data.updated}</span>
      </div>

      {isCompleted && (
        <div className="w-completed-alert">
          <strong>BẢO HÀNH ĐÃ HOÀN TẤT</strong>
          <div>THIẾT BỊ ĐÃ ĐƯỢC BÀN GIAO LẠI CHO KHÁCH HÀNG.</div>
        </div>
      )}

      <div className="w-progress-section">
        <h3 className="w-section-title">TIẾN TRÌNH BẢO HÀNH</h3>
        <div className="w-progress-bar">
          {progressSteps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isPast = index < currentStepIndex;
            return (
              <React.Fragment key={step}>
                <div className={`w-progress-step ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`}>
                  <div className="w-step-box">
                    {isPast && <span className="checkmark-icon">✓</span>}
                  </div>
                  <div className="w-step-label">{step}</div>
                </div>
                {index < progressSteps.length - 1 && (
                  <div className={`w-progress-line ${isPast ? 'completed' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="w-detail-grid">
        <div className="w-detail-left">
          
          <div className="w-info-box">
            <h3 className="w-section-title">THÔNG TIN THIẾT BỊ</h3>
            <div className="w-info-grid">
              <div className="w-info-item">
                <div className="w-info-label">SẢN PHẨM</div>
                <div className="w-info-value fw-bold">{data.productName}</div>
              </div>
              <div className="w-info-item">
                <div className="w-info-label">PHIÊN BẢN</div>
                <div className="w-info-value fw-bold">{data.productVariant}</div>
              </div>
              <div className="w-info-item">
                <div className="w-info-label">SERIAL NUMBER</div>
                <div className="w-info-value fw-bold d-flex align-items-center">
                  {data.serial}
                  <button className="btn-small-outline ml-2" onClick={() => navigate(`/kho-hang/danh-sach-serial/${data.serial}`)}>XEM SERIAL</button>
                </div>
              </div>
              <div className="w-info-item">
                <div className="w-info-label">TRẠNG THÁI SERIAL</div>
                <div className="w-info-value"><span className="serial-status-badge">{data.serialStatus}</span></div>
              </div>
              <div className="w-info-item">
                <div className="w-info-label">NGÀY KÍCH HOẠT</div>
                <div className="w-info-value fw-bold">{data.activationDate}</div>
              </div>
              <div className="w-info-item">
                <div className="w-info-label">HẠN BẢO HÀNH</div>
                <div className="w-info-value fw-bold">{data.warrantyExpiry}</div>
              </div>
            </div>

            {!isCompleted && data.status !== 'ĐÃ NHẬN LẠI' && (
              <div className="w-warning-box">
                <div className="w-warning-title">SERIAL ĐANG ĐƯỢC KHÓA TRONG QUY TRÌNH BẢO HÀNH</div>
                <div className="w-warning-text">THIẾT BỊ KHÔNG THỂ ĐƯỢC SỬ DỤNG CHO CÁC GIAO DỊCH XUNG ĐỘT TRONG THỜI GIAN XỬ LÝ.</div>
              </div>
            )}
          </div>

          <div className="w-info-box mt-4">
            <h3 className="w-section-title">THÔNG TIN TIẾP NHẬN</h3>
            <div className="w-info-stack">
              <div className="w-stack-item">
                <div className="w-info-label">LÝ DO BẢO HÀNH</div>
                <div className="w-info-value">{data.receptionReason}</div>
              </div>
              <div className="w-stack-item">
                <div className="w-info-label">TÌNH TRẠNG KHI TIẾP NHẬN</div>
                <div className="w-info-value">{data.receptionCondition}</div>
              </div>
              <div className="w-stack-item">
                <div className="w-info-label">ĐƠN VỊ BẢO HÀNH</div>
                <div className="w-info-value">{data.receptionUnit}</div>
              </div>
              <div className="w-stack-item">
                <div className="w-info-label">GHI CHÚ</div>
                <div className="w-info-value">{data.receptionNote || '-'}</div>
              </div>
            </div>
          </div>

        </div>

        <div className="w-detail-right">
          
          <div className="right-section-block">
            <div className="w-info-label">ĐƠN HÀNG GỐC</div>
            <div className="w-info-value fw-bold fs-16 mt-1">{data.orderId}</div>
            <div className="w-info-label mt-1">{data.orderDate}</div>
            <button className="btn-small-outline mt-3" onClick={() => navigate(`/admin/don-hang/danh-sach-don-hang/${data.orderId.replace('#', '')}`)}>XEM ĐƠN HÀNG</button>
          </div>

          <div className="right-section-block">
            <div className="w-info-label">KHÁCH HÀNG</div>
            <div className="w-info-value fw-bold fs-14 mt-1 text-uppercase">{data.customerName}</div>
            <div className="w-info-label mt-1">{data.customerPhone}</div>
          </div>

          <div className="right-section-block">
            <div className="w-info-label mb-2">THÔNG TIN PHIẾU</div>
            <div className="w-stack-item">
              <div className="w-info-label">MÃ PHIẾU</div>
              <div className="w-info-value fw-bold">{data.id}</div>
            </div>
            <div className="w-stack-item">
              <div className="w-info-label">TRẠNG THÁI XỬ LÝ</div>
              <div className="w-info-value fw-bold" style={{ color: statusColors[data.status]?.color }}>{data.status}</div>
            </div>
            <div className="w-stack-item">
              <div className="w-info-label">NGÀY TIẾP NHẬN</div>
              <div className="w-info-value fw-bold">{data.created}</div>
            </div>
            <div className="w-stack-item">
              <div className="w-info-label">CẬP NHẬT CUỐI</div>
              <div className="w-info-value fw-bold">{data.updated}</div>
            </div>
          </div>

        </div>
      </div>

      {isModalOpen && nextStep && (
        <div className="w-modal-overlay">
          <div className="w-modal-content">
            <h2 className="w-modal-title">CẬP NHẬT TRẠNG THÁI BẢO HÀNH</h2>
            
            <div className="w-modal-row mt-3">
              <span className="w-info-label">MÃ PHIẾU</span>
              <span className="fw-bold">{data.id}</span>
            </div>
            <div className="w-modal-row">
              <span className="w-info-label">SERIAL</span>
              <span className="fw-bold">{data.serial}</span>
            </div>
            <div className="w-modal-row">
              <span className="w-info-label">TRẠNG THÁI HIỆN TẠI</span>
              <span className="fw-bold" style={{ color: statusColors[data.status]?.color }}>{data.status}</span>
            </div>

            <div className="w-modal-divider"></div>

            <div className="w-modal-col">
              <span className="w-info-label">TRẠNG THÁI TIẾP THEO</span>
              <span className="fw-bold fs-16 mt-1" style={{ color: statusColors[nextStep]?.color }}>{nextStep}</span>
            </div>

            <div className="w-modal-col mt-3">
              <span className="w-info-label">GHI CHÚ (TÙY CHỌN)</span>
              <textarea 
                className="w-modal-textarea mt-1" 
                placeholder="VD: Đã nhận lại thiết bị từ hãng..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="w-modal-actions mt-4">
              <button className="btn-modal-cancel" onClick={() => setIsModalOpen(false)}>HỦY</button>
              <button className="btn-modal-confirm" onClick={handleUpdateStatus}>XÁC NHẬN CẬP NHẬT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiTietBaoHanh;
