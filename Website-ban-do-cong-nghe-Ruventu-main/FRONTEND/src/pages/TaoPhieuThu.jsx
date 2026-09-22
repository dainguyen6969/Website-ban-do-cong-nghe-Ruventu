import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPhieuThu } from '../utils/phieuThuStore';
import './TaoPhieuThu.css';

export default function TaoPhieuThu() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nhom: 'KHÁCH HÀNG',
    nguoiNop: '',
    id: '',
    maLoai: '',
    chungTu: '',
    soTien: '',
    ngayGhiNhan: new Date().toISOString().slice(0, 16),
    phuongThuc: 'TIỀN MẶT',
    tags: '',
    moTa: ''
  });

  const [showModal, setShowModal] = useState(false);
  const [loaiThuList, setLoaiThuList] = useState([
    { id: 'LPT001', name: 'Thu bán hàng' },
    { id: 'LPT002', name: 'Thu nợ khách hàng' },
    { id: 'LPT003', name: 'Thu đặt cọc' },
  ]);

  const [newLoai, setNewLoai] = useState({ ma: '', ten: '', ghiChu: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleCreate = () => {
    const newErrors = {};
    if (!formData.nguoiNop || !formData.nguoiNop.trim()) newErrors.nguoiNop = "Vui lòng nhập tên người nộp";
    if (!formData.maLoai) newErrors.maLoai = "Vui lòng chọn loại thu";
    if (!formData.soTien || Number(formData.soTien) <= 0) newErrors.soTien = "Số tiền phải lớn hơn 0";
    if (!formData.ngayGhiNhan) newErrors.ngayGhiNhan = "Vui lòng chọn ngày ghi nhận";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedLoai = loaiThuList.find(l => l.id === formData.maLoai);

    const newPhieu = {
      id: formData.id,
      nguoiNop: formData.nguoiNop,
      nhom: formData.nhom,
      maLoai: selectedLoai ? selectedLoai.id : '',
      tenLoai: selectedLoai ? selectedLoai.name : '',
      phuongThuc: formData.phuongThuc,
      soTien: formData.soTien,
      ngayGhiNhan: formData.ngayGhiNhan.replace('T', ' '),
      chungTu: formData.chungTu,
      moTa: formData.moTa
    };

    createPhieuThu(newPhieu);
    navigate('/admin/so-quy-tien-mat/phieu-thu');
  };

  const handleAddLoai = () => {
    if (newLoai.ma && newLoai.ten) {
      setLoaiThuList(prev => [...prev, { id: newLoai.ma, name: newLoai.ten }]);
      setFormData(prev => ({ ...prev, maLoai: newLoai.ma }));
      setShowModal(false);
      setNewLoai({ ma: '', ten: '', ghiChu: '' });
    } else {
      alert("Vui lòng điền mã và tên loại");
    }
  };

  return (
    <main className="tao-phieu-page">
      <div className="tao-phieu-header">
        <div className="tao-phieu-breadcrumb">SỔ QUỸ TIỀN MẶT / PHIẾU THU / <strong>TẠO PHIẾU THU</strong></div>
        
        <div className="tao-phieu-title-row">
          <div className="tao-phieu-title-left">
            <span className="tao-phieu-label">PHIẾU THU</span>
            <h1>TẠO PHIẾU THU</h1>
          </div>
          <button className="tao-phieu-btn-create-top" onClick={handleCreate}>TẠO PHIẾU THU</button>
        </div>
      </div>

      <div className="tao-phieu-layout">
        <div className="tao-phieu-col">
          <div className="tao-phieu-section">
            <h2>THÔNG TIN NGƯỜI NỘP</h2>
            
            <div className="tao-phieu-field">
              <label>NHÓM NGƯỜI NỘP <span>*</span></label>
              <select name="nhom" value={formData.nhom} onChange={handleChange}>
                <option value="KHÁCH HÀNG">KHÁCH HÀNG</option>
                <option value="NHÂN VIÊN">NHÂN VIÊN</option>
                <option value="NHÀ CUNG CẤP">NHÀ CUNG CẤP</option>
                <option value="ĐỐI TÁC GIAO HÀNG">ĐỐI TÁC GIAO HÀNG</option>
                <option value="KHÁC">KHÁC</option>
              </select>
            </div>

            <div className="tao-phieu-field">
              <label>TÊN NGƯỜI NỘP <span>*</span></label>
              <input 
                type="text" 
                name="nguoiNop" 
                placeholder="TÌM KHÁCH HÀNG..." 
                value={formData.nguoiNop} 
                onChange={handleChange} 
                className={errors.nguoiNop ? "tao-phieu-input-error" : ""}
              />
              {errors.nguoiNop && <span className="tao-phieu-error">{errors.nguoiNop}</span>}
            </div>

            <div className="tao-phieu-field">
              <label>MÃ PHIẾU</label>
              <input 
                type="text" 
                name="id" 
                placeholder="Để trống để hệ thống tự tạo"
                value={formData.id} 
                onChange={handleChange} 
              />
            </div>

            <div className="tao-phieu-field">
              <label>LOẠI THU <span>*</span></label>
              <div className="tao-phieu-input-group">
                <select 
                  name="maLoai" 
                  value={formData.maLoai} 
                  onChange={handleChange}
                  className={errors.maLoai ? "tao-phieu-input-error" : ""}
                >
                  <option value="">— CHỌN LOẠI THU —</option>
                  {loaiThuList.map(l => (
                    <option key={l.id} value={l.id}>{l.id} - {l.name}</option>
                  ))}
                </select>
                <button className="tao-phieu-btn-add-loai" onClick={() => setShowModal(true)}>+ THÊM LOẠI</button>
              </div>
              {errors.maLoai && <span className="tao-phieu-error">{errors.maLoai}</span>}
            </div>

            <div className="tao-phieu-field">
              <label>MẠ CHỨNG TỪ THAM CHIẾU</label>
              <input 
                type="text" 
                name="chungTu" 
                placeholder="VD: ORD-001, DN-005..." 
                value={formData.chungTu} 
                onChange={handleChange} 
              />
            </div>
          </div>
        </div>

        <div className="tao-phieu-col">
          <div className="tao-phieu-section">
            <h2>GIÁ TRỊ GHI NHẬN</h2>
            
            <div className="tao-phieu-field">
              <label>SỐ TIỀN <span>*</span></label>
              <input 
                type="number" 
                name="soTien" 
                value={formData.soTien} 
                onChange={handleChange} 
                className={errors.soTien ? "tao-phieu-input-error" : ""}
              />
              {errors.soTien && <span className="tao-phieu-error">{errors.soTien}</span>}
            </div>

            <div className="tao-phieu-field">
              <label>NGÀY GHI NHẬN <span>*</span></label>
              <input 
                type="datetime-local" 
                name="ngayGhiNhan" 
                value={formData.ngayGhiNhan} 
                onChange={handleChange} 
                className={errors.ngayGhiNhan ? "tao-phieu-input-error" : ""}
              />
              {errors.ngayGhiNhan && <span className="tao-phieu-error">{errors.ngayGhiNhan}</span>}
            </div>

            <div className="tao-phieu-field">
              <label>PHƯƠNG THỨC THANH TOÁN <span>*</span></label>
              <select name="phuongThuc" value={formData.phuongThuc} onChange={handleChange}>
                <option value="TIỀN MẶT">TIỀN MẶT</option>
                <option value="CHUYỂN KHOẢN">CHUYỂN KHOẢN</option>
              </select>
            </div>

            <div className="tao-phieu-field">
              <label>TAGS</label>
              <div className="tao-phieu-input-group">
                <input type="text" name="tags" placeholder="Nhập tag rồi Enter..." />
                <button className="tao-phieu-btn-tag-add">+</button>
              </div>
            </div>

            <div className="tao-phieu-field">
              <label>MÔ TẢ</label>
              <textarea 
                name="moTa" 
                rows="4" 
                placeholder="Ghi chú thêm về khoản thu này..."
                value={formData.moTa}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div className="tao-phieu-footer-preview">
        <div className="tao-phieu-preview-items">
          <div className="tao-phieu-preview-item">
            <label>MÃ PHIẾU</label>
            <div><strong>{formData.id || "(tự động)"}</strong></div>
          </div>
          <div className="tao-phieu-preview-item">
            <label>NGƯỜI NỘP</label>
            <div><strong>{formData.nguoiNop || "-"}</strong></div>
          </div>
          <div className="tao-phieu-preview-item">
            <label>LOẠI THU</label>
            <div><strong>{formData.maLoai || "-"}</strong></div>
          </div>
          <div className="tao-phieu-preview-item">
            <label>SỐ TIỀN</label>
            <div className="text-red"><strong>{formData.soTien ? Number(formData.soTien).toLocaleString('vi-VN') + 'đ' : "-"}</strong></div>
          </div>
        </div>
        <button className="tao-phieu-btn-create-bottom" onClick={handleCreate}>TẠO PHIẾU THU</button>
      </div>

      {showModal && (
        <div className="ct-modal-overlay">
          <div className="ct-modal-content">
            <div className="ct-modal-header">
              <h2>THÊM LOẠI PHIẾU THU</h2>
            </div>
            <div className="ct-modal-body">
              <div className="tao-phieu-field">
                <label>MÃ LOẠI <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="VD: LPT007" 
                  value={newLoai.ma}
                  onChange={(e) => setNewLoai({...newLoai, ma: e.target.value})}
                />
              </div>
              <div className="tao-phieu-field">
                <label>TÊN LOẠI <span>*</span></label>
                <input 
                  type="text" 
                  placeholder="VD: Thu bồi hoàn" 
                  value={newLoai.ten}
                  onChange={(e) => setNewLoai({...newLoai, ten: e.target.value})}
                />
              </div>
              <div className="tao-phieu-field">
                <label>GHI CHÚ</label>
                <textarea 
                  rows="3" 
                  placeholder="Mô tả loại phiếu thu này..."
                  value={newLoai.ghiChu}
                  onChange={(e) => setNewLoai({...newLoai, ghiChu: e.target.value})}
                ></textarea>
              </div>
              
              <div className="ct-modal-status-preview">
                <div className="ct-modal-status-col">
                  <label>LOẠI PHIẾU</label>
                  <strong>THU</strong>
                </div>
                <div className="ct-modal-status-col">
                  <label>TRẠNG THÁI SAU KHI TẠO</label>
                  <strong className="text-green">HOẠT ĐỘNG</strong>
                </div>
              </div>
            </div>
            <div className="ct-modal-footer">
              <button className="ct-modal-btn-cancel" onClick={() => setShowModal(false)}>HỦY</button>
              <button className="ct-modal-btn-save" onClick={handleAddLoai}>TẠO LOẠI PHIẾU THU</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
