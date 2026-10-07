import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, X } from 'lucide-react';
import '../styles/warranty.css';
import { mockWarrantyData } from '../data/mockData';

const mockDevice = {
  productName: 'Ổ cứng SSD NVMe',
  productVariant: '1TB',
  serial: 'SSD1T-SN-002',
  serialStatus: 'ĐÃ BÁN',
  orderId: '#ORD-010',
  customerName: 'Trương Minh Đức',
  customerPhone: '0923 345 678',
  activationDate: '01/09/2026',
  warrantyExpiry: '01/09/2029'
};

const suggestions = [
  'Máy hoạt động bình thường, lỗi phần mềm',
  'Máy không khởi động được',
  'Màn hình/Hiển thị bị lỗi',
  'Quá nhiệt, tắt đột ngột',
  'Có tiếng kêu bất thường',
  'Cổng kết nối bị lỗi',
  'Sản phẩm bị vỡ/nứt vỏ'
];

const LapPhieuBaoHanh = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedDevice, setSearchedDevice] = useState(null);
  
  const [formData, setFormData] = useState({
    reason: '',
    condition: '',
    unit: '',
    note: ''
  });

  const [isCreated, setIsCreated] = useState(false);
  const [newTicketId, setNewTicketId] = useState('');

  const handleSearch = () => {
    if (searchQuery.toUpperCase() === 'SSD1T-SN-002') {
      setSearchedDevice(mockDevice);
    } else if (searchQuery.trim() !== '') {
      // Just simulate finding it anyway for ease of testing
      setSearchedDevice(mockDevice);
    }
  };

  const handleSuggestionClick = (text) => {
    setFormData(prev => ({
      ...prev,
      condition: prev.condition ? prev.condition + ', ' + text : text
    }));
  };

  const isFormValid = searchedDevice && formData.reason.trim() && formData.condition.trim() && formData.unit.trim();

  const handleCreate = () => {
    if (!isFormValid || isCreated) return;

    const newId = `BH-00${mockWarrantyData.length + 1}`;
    
    // Create new record
    const newRecord = {
      id: newId,
      orderId: searchedDevice.orderId,
      customerName: searchedDevice.customerName,
      customerPhone: searchedDevice.customerPhone,
      productName: searchedDevice.productName,
      productVariant: searchedDevice.productVariant,
      serial: searchedDevice.serial,
      serialStatus: searchedDevice.serialStatus,
      activationDate: searchedDevice.activationDate,
      warrantyExpiry: searchedDevice.warrantyExpiry,
      status: 'TIẾP NHẬN',
      created: new Date().toLocaleString('en-GB').replace(',', ''), // format DD/MM/YYYY HH:mm:ss
      updated: new Date().toLocaleString('en-GB').replace(',', ''),
      receptionReason: formData.reason,
      receptionCondition: formData.condition,
      receptionUnit: formData.unit,
      receptionNote: formData.note
    };

    mockWarrantyData.unshift(newRecord); // Add to top
    setNewTicketId(newId);
    setIsCreated(true);
  };

  return (
    <div className="warranty-page">
      <div className="w-breadcrumb">
        <span>ADMIN</span> <span>›</span> <span>BẢO HÀNH</span> <span>›</span> <strong>LẬP PHIẾU BẢO HÀNH</strong>
      </div>
      
      <div className="w-detail-header" style={{ marginBottom: isCreated ? '0' : '15px' }}>
        <div className="w-detail-title-area">
          <button className="btn-back" onClick={() => navigate('/admin/bao-hanh/danh-sach')}>← DANH SÁCH BẢO HÀNH</button>
          <div>
            <h1 className="w-detail-title" style={{ fontSize: '16px', marginBottom: '4px' }}>LẬP PHIẾU BẢO HÀNH</h1>
            <p className="warranty-page-subtitle" style={{ fontSize: '10px' }}>TIẾP NHẬN THIẾT BỊ ĐÃ BÁN THEO SERIAL NUMBER</p>
          </div>
        </div>
        <div>
          <button 
            className={`btn-create-warranty ${isCreated ? 'btn-created' : isFormValid ? 'btn-ready' : 'btn-disabled'}`}
            onClick={handleCreate}
            disabled={!isFormValid || isCreated}
          >
            {isCreated ? '✓ ĐÃ TẠO PHIẾU' : 'TẠO PHIẾU BẢO HÀNH'}
          </button>
        </div>
      </div>

      {isCreated && (
        <div className="w-success-banner mt-3 mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h3 className="w-success-title">TẠO PHIẾU BẢO HÀNH THÀNH CÔNG</h3>
              <div className="w-success-details mt-2">
                <span className="w-sd-label">MÃ PHIẾU</span> <span className="w-sd-val text-green">{newTicketId}</span>
                <span className="w-sd-label ml-4">SERIAL</span> <span className="w-sd-val text-green">{searchedDevice.serial}</span>
                <span className="w-sd-label ml-4">TRẠNG THÁI</span> <span className="w-sd-val">TIẾP NHẬN</span>
              </div>
            </div>
            <button className="btn-green-solid" onClick={() => navigate('/admin/bao-hanh/danh-sach')}>VỀ DANH SÁCH BẢO HÀNH</button>
          </div>
        </div>
      )}

      <div className="w-create-grid">
        {/* Left Column: Search */}
        <div className="w-create-left">
          <div className="w-section-heading">TRA CỨU THIẾT BỊ</div>
          
          <div className="w-search-box-container">
            <div className="w-search-input-group">
              <span className="w-search-icon"><Search size={16} /></span>
              <input 
                type="text" 
                placeholder="QUÉT / NHẬP SERIAL HOẶC MÃ ĐƠN" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn-search-black" onClick={handleSearch}>TÌM</button>
            </div>
            {searchedDevice && (
               <button className="btn-clear-search" onClick={() => { setSearchedDevice(null); setSearchQuery(''); }}><X size={16} /></button>
            )}
          </div>
          <div className="w-search-hint">TRA CỨU THEO SERIAL: SSD1T-SN-002, VGA4080-SN-003, SSD2T-SN-002</div>

          {!searchedDevice ? (
            <div className="w-empty-search">
              <div className="w-empty-icon"><Shield size={48} strokeWidth={1.5} color="#3B82F6" /></div>
              <div className="w-empty-title">CHƯA CÓ THÔNG TIN THIẾT BỊ</div>
              <div className="w-empty-desc">ĐANG TÌM THIẾT BỊ? NHẬP SERIAL HOẶC MÃ ĐƠN HÀNG ĐỂ TRA CỨU</div>
            </div>
          ) : (
            <div className="w-device-info-card">
              <div className="w-warranty-status-banner">
                <span className="w-check-circle">✓</span> CÒN BẢO HÀNH - 1061 NGÀY
              </div>
              
              <div className="w-device-details">
                <div className="w-stack-item">
                  <div className="w-info-label">SẢN PHẨM</div>
                  <div className="w-info-value fw-bold">{searchedDevice.productName}</div>
                  <div className="w-info-value text-gray">{searchedDevice.productVariant}</div>
                </div>

                <div className="w-stack-item">
                  <div className="w-info-label">SERIAL NUMBER</div>
                  <div className="w-info-value fw-bold">{searchedDevice.serial}</div>
                </div>

                <div className="w-stack-item">
                  <div className="w-info-label">TRẠNG THÁI SERIAL</div>
                  <div className="w-info-value text-green fw-bold">{searchedDevice.serialStatus}</div>
                </div>

                <div className="w-stack-item">
                  <div className="w-info-label">ĐƠN HÀNG</div>
                  <div className="w-info-value fw-bold">{searchedDevice.orderId}</div>
                </div>

                <div className="w-stack-item">
                  <div className="w-info-label">KHÁCH HÀNG</div>
                  <div className="w-info-value fw-bold">{searchedDevice.customerName}</div>
                  <div className="w-info-value text-gray">{searchedDevice.customerPhone}</div>
                </div>

                <div className="w-stack-item">
                  <div className="w-info-label">NGÀY KÍCH HOẠT</div>
                  <div className="w-info-value fw-bold">{searchedDevice.activationDate}</div>
                </div>

                <div className="w-stack-item">
                  <div className="w-info-label">HẠN BẢO HÀNH</div>
                  <div className="w-info-value fw-bold">{searchedDevice.warrantyExpiry}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Form */}
        <div className="w-create-right">
          <div className="w-section-heading">THÔNG TIN TIẾP NHẬN</div>

          <div className="w-form-group">
            <label>LÝ DO BẢO HÀNH <span className="text-red">*</span></label>
            <textarea 
              placeholder="Mô tả chi tiết lý do khách hàng mang sản phẩm đến bảo hành..."
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
            />
          </div>

          <div className="w-form-group">
            <label>TÌNH TRẠNG TIẾP NHẬN <span className="text-red">*</span></label>
            <textarea 
              placeholder="Mô tả tình trạng thiết bị khi tiếp nhận. Vd: Không khởi động, vỏ có xước nhẹ, kèm hộp..."
              value={formData.condition}
              onChange={(e) => setFormData({...formData, condition: e.target.value})}
            />
          </div>

          <div className="w-suggestions">
            <div className="w-suggestions-title">GỢI Ý</div>
            <div className="w-suggestions-list">
              {suggestions.map((text, idx) => (
                <button key={idx} className="btn-suggestion" onClick={() => handleSuggestionClick(text)}>
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="w-form-group mt-4">
            <label>ĐƠN VỊ BẢO HÀNH <span className="text-red">*</span></label>
            <input 
              type="text" 
              placeholder="Nhập tên đơn vị bảo hành..."
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
            />
          </div>

          <div className="w-form-group">
            <label>GHI CHÚ</label>
            <textarea 
              placeholder="Phụ kiện đi kèm, yêu cầu của khách, ghi chú nội bộ..."
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
            />
          </div>

          <div className="w-initial-status-box mt-4">
            <div className="w-initial-status-title">TRẠNG THÁI SAU KHI TẠO</div>
            <div className="w-initial-status-badge">TIẾP NHẬN</div>
            <div className="w-initial-status-desc">Trạng thái ban đầu được thiết lập tự động. Cập nhật tiến trình sau khi phiếu được tạo.</div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LapPhieuBaoHanh;
