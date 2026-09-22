import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPhieuChi } from '../utils/phieuChiStore';
import { getLoaiPhieuChiList } from '../utils/loaiPhieuChiStore';
import './TaoPhieuChi.css';

export default function TaoPhieuChi() {
  const navigate = useNavigate();
  const loaiChiList = getLoaiPhieuChiList().filter(p => p.trangThai === 'HOẠT ĐỘNG');

  const [nhomDoiTuong, setNhomDoiTuong] = useState('NHÂN VIÊN');
  const [nguoiNhan, setNguoiNhan] = useState('');
  const [maPhieu, setMaPhieu] = useState('');
  const [maLoai, setMaLoai] = useState('');
  const [chungTu, setChungTu] = useState('');
  const [soTien, setSoTien] = useState('');
  const [ngayGhiNhan, setNgayGhiNhan] = useState('');
  const [phuongThuc, setPhuongThuc] = useState('TIỀN MẶT');
  const [tags, setTags] = useState('');
  const [moTa, setMoTa] = useState('');
  const [errors, setErrors] = useState({});

  const selectedLoaiChi = loaiChiList.find(l => l.maLoai === maLoai);

  const formatCurrency = (val) => {
    if (!val) return '';
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setSoTien(raw);
    if (errors.soTien) setErrors(prev => ({...prev, soTien: null}));
  };

  const validateAndSubmit = () => {
    const newErrors = {};
    if (!nguoiNhan.trim()) newErrors.nguoiNhan = 'Vui lòng nhập tên người nhận';
    if (!maLoai) newErrors.maLoai = 'Vui lòng chọn loại chi';
    if (!soTien || Number(soTien) <= 0) newErrors.soTien = 'Vui lòng nhập số tiền lớn hơn 0';
    if (!ngayGhiNhan) newErrors.ngayGhiNhan = 'Vui lòng chọn ngày ghi nhận';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newPhieu = {
      id: maPhieu.trim(),
      nhomDoiTuong,
      nguoiNhan: nguoiNhan.trim(),
      maLoai,
      tenLoai: selectedLoaiChi ? selectedLoaiChi.tenLoai : '',
      chungTu: chungTu.trim(),
      soTien,
      ngayGhiNhan,
      phuongThuc,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      moTa: moTa.trim()
    };

    createPhieuChi(newPhieu);
    navigate('/admin/so-quy-tien-mat/phieu-chi');
  };

  return (
    <main className="tpc-page">
      <div className="tpc-header">
        <div className="tpc-breadcrumb">
          SỔ QUỸ TIỀN MẶT / PHIẾU CHI / <strong>TẠO PHIẾU CHI</strong>
        </div>
        <div className="tpc-title-row">
          <div className="tpc-title">
            <span className="tpc-label">PHIẾU CHI</span>
            <h1>TẠO PHIẾU CHI</h1>
          </div>
          <button className="tpc-btn-submit-top" onClick={validateAndSubmit}>
            TẠO PHIẾU CHI
          </button>
        </div>
      </div>

      <div className="tpc-body">
        <div className="tpc-grid-2">
          {/* Cột trái */}
          <section className="tpc-section">
            <h2>THÔNG TIN NGƯỜI NHẬN</h2>
            
            <div className="tpc-form-group">
              <label>NHÓM NGƯỜI NHẬN *</label>
              <select value={nhomDoiTuong} onChange={(e) => setNhomDoiTuong(e.target.value)}>
                <option value="NHÂN VIÊN">NHÂN VIÊN</option>
                <option value="KHÁCH HÀNG">KHÁCH HÀNG</option>
                <option value="NHÀ CUNG CẤP">NHÀ CUNG CẤP</option>
                <option value="ĐỐI TÁC GIAO HÀNG">ĐỐI TÁC GIAO HÀNG</option>
              </select>
            </div>

            <div className="tpc-form-group">
              <label>TÊN NGƯỜI NHẬN *</label>
              <input 
                type="text" 
                placeholder="TÌM NGƯỜI NHẬN..." 
                value={nguoiNhan}
                onChange={(e) => {
                  setNguoiNhan(e.target.value);
                  if (errors.nguoiNhan) setErrors(prev => ({...prev, nguoiNhan: null}));
                }}
                className={errors.nguoiNhan ? "tpc-input-error" : ""}
              />
              {errors.nguoiNhan && <span className="tpc-error">{errors.nguoiNhan}</span>}
            </div>

            <div className="tpc-form-group">
              <label>MÃ PHIẾU</label>
              <input 
                type="text" 
                placeholder="Để trống để hệ thống tự tạo" 
                value={maPhieu}
                onChange={(e) => setMaPhieu(e.target.value)}
              />
            </div>

            <div className="tpc-form-group">
              <label>LOẠI CHI *</label>
              <div className="tpc-input-with-btn">
                <select 
                  value={maLoai} 
                  onChange={(e) => {
                    setMaLoai(e.target.value);
                    if (errors.maLoai) setErrors(prev => ({...prev, maLoai: null}));
                  }}
                  className={errors.maLoai ? "tpc-input-error" : ""}
                >
                  <option value="">-- CHỌN LOẠI CHI --</option>
                  {loaiChiList.map(l => (
                    <option key={l.maLoai} value={l.maLoai}>{l.tenLoai}</option>
                  ))}
                </select>
                <button type="button" className="tpc-btn-add-type" onClick={() => navigate('/admin/so-quy-tien-mat/loai-phieu-chi')}>
                  + THÊM LOẠI
                </button>
              </div>
              {errors.maLoai && <span className="tpc-error">{errors.maLoai}</span>}
            </div>

            <div className="tpc-form-group">
              <label>MÃ CHỨNG TỪ THAM CHIẾU</label>
              <input 
                type="text" 
                placeholder="VD: DN-001, TH000300..." 
                value={chungTu}
                onChange={(e) => setChungTu(e.target.value)}
              />
            </div>
          </section>

          {/* Cột phải */}
          <section className="tpc-section">
            <h2>GIÁ TRỊ GHI NHẬN</h2>

            <div className="tpc-form-group">
              <label>SỐ TIỀN *</label>
              <input 
                type="text" 
                placeholder="0" 
                value={formatCurrency(soTien)}
                onChange={handleAmountChange}
                className={errors.soTien ? "tpc-input-error" : ""}
              />
              {errors.soTien && <span className="tpc-error">{errors.soTien}</span>}
            </div>

            <div className="tpc-form-group">
              <label>NGÀY GHI NHẬN *</label>
              <input 
                type="datetime-local" 
                value={ngayGhiNhan}
                onChange={(e) => {
                  setNgayGhiNhan(e.target.value);
                  if (errors.ngayGhiNhan) setErrors(prev => ({...prev, ngayGhiNhan: null}));
                }}
                className={errors.ngayGhiNhan ? "tpc-input-error" : ""}
              />
              {errors.ngayGhiNhan && <span className="tpc-error">{errors.ngayGhiNhan}</span>}
            </div>

            <div className="tpc-form-group">
              <label>PHƯƠNG THỨC THANH TOÁN *</label>
              <select value={phuongThuc} onChange={(e) => setPhuongThuc(e.target.value)}>
                <option value="TIỀN MẶT">TIỀN MẶT</option>
                <option value="CHUYỂN KHOẢN">CHUYỂN KHOẢN</option>
              </select>
            </div>

            <div className="tpc-form-group">
              <label>TAGS</label>
              <input 
                type="text" 
                placeholder="Nhập tag rồi Enter (phân cách bằng dấu phẩy)..." 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div className="tpc-form-group">
              <label>MÔ TẢ</label>
              <textarea 
                placeholder="Ghi chú thêm về khoản chi này..." 
                rows="3"
                value={moTa}
                onChange={(e) => setMoTa(e.target.value)}
              ></textarea>
            </div>
          </section>
        </div>
      </div>

      <div className="tpc-footer-sticky">
        <div className="tpc-preview-info">
          <div className="tpc-preview-col">
            <span className="tpc-preview-label">MÃ PHIẾU</span>
            <span className="tpc-preview-val">{maPhieu || '(tự động)'}</span>
          </div>
          <div className="tpc-preview-col">
            <span className="tpc-preview-label">NGƯỜI NHẬN</span>
            <span className="tpc-preview-val">{nguoiNhan || '-'}</span>
          </div>
          <div className="tpc-preview-col">
            <span className="tpc-preview-label">LOẠI CHI</span>
            <span className="tpc-preview-val">{selectedLoaiChi ? selectedLoaiChi.tenLoai : '-'}</span>
          </div>
          <div className="tpc-preview-col">
            <span className="tpc-preview-label">SỐ TIỀN</span>
            <span className="tpc-preview-val tpc-amount-red">{formatCurrency(soTien) || '-'}đ</span>
          </div>
        </div>
        <button className="tpc-btn-submit-bottom" onClick={validateAndSubmit}>
          TẠO PHIẾU CHI
        </button>
      </div>
    </main>
  );
}
