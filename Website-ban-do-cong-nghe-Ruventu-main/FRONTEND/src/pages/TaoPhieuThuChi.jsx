import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, Plus } from 'lucide-react';
import { createPhieuThu } from '../utils/phieuThuStore';
import { createPhieuChi } from '../utils/phieuChiStore';
import { getLoaiPhieuChiList } from '../utils/loaiPhieuChiStore';
import './TaoPhieuThuChi.css';

export default function TaoPhieuThuChi() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || 'THU'); // 'THU' or 'CHI'
  
  const [formData, setFormData] = useState({
    nhom: 'Khách hàng',
    nguoiNopNhan: '',
    id: '',
    loaiPhieu: '',
    soTien: '0',
    ngayGhiNhan: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    phuongThuc: 'Tiền mặt',
    tags: '',
    moTa: ''
  });

  const [errors, setErrors] = useState({});
  const [showDropdown, setShowDropdown] = useState(''); // 'nguoiNopNhan' or 'loaiPhieu'
  
  // Dummy data
  const danhSachKhachHang = ['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Tuấn', 'Phạm Quốc Hùng', 'Hoàng Thanh Nga', 'Bùi Văn Nam', 'Vũ Đức Long'];
  const loaiPhieuThuList = ['Doanh thu bán hàng', 'Thu nợ khách hàng', 'Thu đặt cọc', 'Thu khác'];
  const loaiPhieuChiList = getLoaiPhieuChiList().filter(p => p.trangThai === 'HOẠT ĐỘNG').map(l => l.tenLoai);

  useEffect(() => {
    // Generate ID on load or tab switch
    const prefix = tab === 'THU' ? 'PT' : 'PC';
    const dateStr = formData.ngayGhiNhan.replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    setFormData(prev => ({ 
      ...prev, 
      id: `${prefix}-${dateStr}-${rand}`,
      loaiPhieu: tab === 'THU' ? loaiPhieuThuList[0] : (loaiPhieuChiList[0] || 'Chi trả nhà cung cấp'),
      nguoiNopNhan: ''
    }));
  }, [tab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, soTien: raw || '0' }));
    if (errors.soTien) {
      setErrors(prev => ({ ...prev, soTien: null }));
    }
  };

  const handleCreate = () => {
    const newErrors = {};
    if (!formData.nguoiNopNhan || !formData.nguoiNopNhan.trim()) {
      newErrors.nguoiNopNhan = `Vui lòng nhập tên người ${tab === 'THU' ? 'nộp' : 'nhận'}`;
    }
    if (formData.soTien === '0' || !formData.soTien) {
      newErrors.soTien = "Vui lòng nhập số tiền hợp lệ";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (tab === 'THU') {
      createPhieuThu({
        id: formData.id,
        nguoiNop: formData.nguoiNopNhan,
        nhom: formData.nhom,
        maLoai: formData.loaiPhieu,
        tenLoai: formData.loaiPhieu,
        phuongThuc: formData.phuongThuc,
        soTien: formData.soTien,
        ngayGhiNhan: formData.ngayGhiNhan,
        moTa: formData.moTa
      });
      navigate('/admin/so-quy-tien-mat/phieu-thu');
    } else {
      createPhieuChi({
        nhomDoiTuong: formData.nhom,
        nguoiNhan: formData.nguoiNopNhan,
        maLoai: formData.loaiPhieu,
        tenLoai: formData.loaiPhieu,
        soTien: formData.soTien,
        ngayGhiNhan: formData.ngayGhiNhan,
        phuongThuc: formData.phuongThuc,
        tags: formData.tags.split(',').map(t => t.trim()),
        moTa: formData.moTa
      });
      navigate('/admin/so-quy-tien-mat/phieu-chi');
    }
  };

  const currentLoaiList = tab === 'THU' ? loaiPhieuThuList : loaiPhieuChiList;
  const filteredNguoiNopNhan = danhSachKhachHang.filter(name => name.toLowerCase().includes(formData.nguoiNopNhan.toLowerCase()));

  return (
    <div className="tptc-page">
      <div className="tptc-header">
        <div className="tptc-header-row">
          <button className="tptc-btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> QUAY LẠI
          </button>
          <div className="tptc-title-divider"></div>
          <h1 className="tptc-title">TẠO PHIẾU THU / CHI</h1>
        </div>
        
        <div className="tptc-tabs">
          <button 
            className={`tptc-tab ${tab === 'THU' ? 'active' : ''}`}
            onClick={() => setTab('THU')}
          >
            {tab === 'THU' && <span>▲</span>} PHIẾU THU
          </button>
          <button 
            className={`tptc-tab ${tab === 'CHI' ? 'active' : ''}`}
            onClick={() => setTab('CHI')}
          >
            {tab === 'CHI' && <span>▼</span>} PHIẾU CHI
          </button>
        </div>
      </div>

      <div className="tptc-body">
        <div className="tptc-grid">
          <div className="tptc-col">
            <div className="tptc-section-header">
              <div className="tptc-section-divider"></div>
              <h2 className="tptc-section-title">THÔNG TIN CHUNG</h2>
            </div>
            <div className="tptc-form-content">
              <div className="tptc-field">
                <label>NHÓM NGƯỜI {tab === 'THU' ? 'NỘP' : 'NHẬN'}</label>
                <input type="text" className="tptc-input" name="nhom" value={formData.nhom} onChange={handleChange} />
              </div>

              <div className="tptc-field">
                <label>TÊN NGƯỜI {tab === 'THU' ? 'NỘP' : 'NHẬN'} <span>*</span></label>
                <div className="tptc-input-search-wrap">
                  <input 
                    type={`text`} 
                    className={`tptc-input ${errors.nguoiNopNhan ? 'tptc-input-error' : ''}`}
                    placeholder="Tìm khách hàng..." 
                    name="nguoiNopNhan"
                    value={formData.nguoiNopNhan}
                    onChange={(e) => { handleChange(e); setShowDropdown('nguoiNopNhan'); }}
                    onFocus={() => setShowDropdown('nguoiNopNhan')}
                    onBlur={() => setTimeout(() => setShowDropdown(''), 200)}
                  />
                  <Search size={16} className="tptc-icon-search" />
                </div>
                {errors.nguoiNopNhan && <span className="tptc-error-text">{errors.nguoiNopNhan}</span>}
                {showDropdown === 'nguoiNopNhan' && (
                  <div className="tptc-dropdown">
                    {filteredNguoiNopNhan.map((name, i) => (
                      <div 
                        key={i} 
                        className="tptc-dropdown-item"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, nguoiNopNhan: name }));
                          setShowDropdown('');
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="tptc-field">
                <label>MÃ PHIẾU (TỰ ĐỘNG)</label>
                <div className="tptc-input-group">
                  <input type="text" className="tptc-input readonly" value={formData.id} readOnly />
                  <button className="tptc-btn-addon">TỰ ĐỘNG</button>
                </div>
              </div>

              <div className="tptc-field">
                <label>LOẠI PHIẾU {tab === 'THU' ? 'THU' : 'CHI'}</label>
                <div className="tptc-input-search-wrap">
                  <div className="tptc-input-group">
                    <input 
                      type="text" 
                      className="tptc-input" 
                      value={formData.loaiPhieu} 
                      onClick={() => setShowDropdown(showDropdown === 'loaiPhieu' ? '' : 'loaiPhieu')}
                      readOnly 
                    />
                    <button className="tptc-btn-icon" onClick={() => setShowDropdown(showDropdown === 'loaiPhieu' ? '' : 'loaiPhieu')}>
                      {tab === 'THU' ? <ChevronDown size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
                {showDropdown === 'loaiPhieu' && (
                  <div className="tptc-dropdown">
                    {currentLoaiList.map((loai, i) => (
                      <div 
                        key={i} 
                        className={`tptc-dropdown-item ${formData.loaiPhieu === loai ? 'active' : ''}`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, loaiPhieu: loai }));
                          setShowDropdown('');
                        }}
                      >
                        {loai}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="tptc-col">
            <div className="tptc-section-header">
              <div className="tptc-section-divider"></div>
              <h2 className="tptc-section-title">GIÁ TRỊ GHI NHẬN</h2>
            </div>
            <div className="tptc-form-content">
              <div className="tptc-field">
                <label>SỐ TIỀN (GIÁ TRỊ) <span>*</span></label>
                <div className={`tptc-input-group ${errors.soTien ? 'tptc-input-error' : ''}`}>
                  <input 
                    type="text" 
                    className="tptc-input" 
                    style={{ color: '#e31e24', fontWeight: 'bold' }} 
                    value={formData.soTien === '0' ? '' : new Intl.NumberFormat('vi-VN').format(formData.soTien)} 
                    onChange={handleAmountChange} 
                    placeholder="0"
                  />
                  <button className="tptc-btn-addon" style={{ background: 'none' }}>đ</button>
                </div>
                {errors.soTien && <span className="tptc-error-text">{errors.soTien}</span>}
              </div>

              <div className="tptc-field">
                <label>NGÀY GHI NHẬN <span>*</span></label>
                <input type="date" className="tptc-input" name="ngayGhiNhan" value={formData.ngayGhiNhan} onChange={handleChange} />
              </div>

              <div className="tptc-field">
                <label>PHƯƠNG THỨC THANH TOÁN</label>
                <input type="text" className="tptc-input" name="phuongThuc" value={formData.phuongThuc} onChange={handleChange} />
              </div>

              <div className="tptc-field">
                <label>TAGS</label>
                <input 
                  type="text" 
                  className="tptc-input" 
                  placeholder="Nhập tag, Enter để thêm..." 
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Nhấn Enter hoặc dấu phẩy để thêm tag.</span>
              </div>

              <div className="tptc-field">
                <label>MÔ TẢ</label>
                <textarea 
                  className="tptc-textarea" 
                  rows="3" 
                  placeholder="Ghi chú thêm về phiếu thu/chi này..."
                  name="moTa"
                  value={formData.moTa}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tptc-footer">
        <div className="tptc-summary-bar">
          <div className="tptc-summary-col">
            <label>MÃ PHIẾU</label>
            <div className="val red">{formData.id}</div>
          </div>
          <div className="tptc-summary-col">
            <label>LOẠI</label>
            <div className="val">{formData.loaiPhieu || '-'}</div>
          </div>
          <div className="tptc-summary-col">
            <label>ĐỐI TƯỢNG</label>
            <div className="val">{formData.nguoiNopNhan || '-'}</div>
          </div>
          <div className="tptc-summary-col">
            <label>SỐ TIỀN</label>
            <div className="val red">{formData.soTien !== '0' ? new Intl.NumberFormat('vi-VN').format(formData.soTien) + 'đ' : '-'}</div>
          </div>
          <div className="tptc-summary-col">
            <label>NGÀY</label>
            <div className="val">{formData.ngayGhiNhan}</div>
          </div>
          <div className="tptc-summary-col">
            <label>THANH TOÁN</label>
            <div className="val">{formData.phuongThuc}</div>
          </div>
        </div>
        
        <div className="tptc-actions-bar">
          <div className="tptc-note">Phiếu sẽ được ghi nhận vào sổ quỹ ngay sau khi tạo. Không thể hoàn tác.</div>
          <div className="tptc-btn-group">
            <button className="tptc-btn-cancel" onClick={() => navigate(-1)}>HỦY</button>
            <button className="tptc-btn-submit" onClick={handleCreate}>
              TẠO PHIẾU {tab}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
