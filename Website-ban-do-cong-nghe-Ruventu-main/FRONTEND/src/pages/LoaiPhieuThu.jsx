import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoaiPhieuThuList, createLoaiPhieuThu } from '../utils/loaiPhieuThuStore';
import './LoaiPhieuThu.css';

export default function LoaiPhieuThu() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TẤT CẢ TRẠNG THÁI');
  
  const [list, setList] = useState(getLoaiPhieuThuList());
  const [showModal, setShowModal] = useState(false);

  // Modal states
  const [maLoai, setMaLoai] = useState('');
  const [tenLoai, setTenLoai] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [error, setError] = useState('');

  const filteredList = list.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = searchTerm === '' || 
           p.maLoai.toLowerCase().includes(searchLower) || 
           p.tenLoai.toLowerCase().includes(searchLower);

    const matchStatus = statusFilter === 'TẤT CẢ TRẠNG THÁI' || p.trangThai === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleOpenModal = () => {
    setMaLoai('');
    setTenLoai('');
    setGhiChu('');
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCreate = () => {
    if (!maLoai.trim() || !tenLoai.trim()) {
      setError('Mã loại và Tên loại không được để trống.');
      return;
    }

    createLoaiPhieuThu({
      maLoai: maLoai.trim(),
      tenLoai: tenLoai.trim(),
      ghiChu: ghiChu.trim()
    });

    setList(getLoaiPhieuThuList());
    setShowModal(false);
  };

  return (
    <main className="loai-phieu-page">
      <div className="loai-phieu-header">
        <div className="loai-phieu-breadcrumb">SỔ QUỸ TIỀN MẶT / <strong>LOẠI PHIẾU THU</strong></div>
        <div className="loai-phieu-title-row">
          <div className="loai-phieu-title">
            <h1>LOẠI PHIẾU THU</h1>
            <p>QUẢN LÝ CÁC NHÓM MỤC ĐÍCH DÙNG ĐỂ PHÂN LOẠI KHOẢN THU</p>
          </div>
          <button className="loai-phieu-btn-create" onClick={handleOpenModal}>
            + THÊM LOẠI PHIẾU THU
          </button>
        </div>
      </div>

      <div className="loai-phieu-filters">
        <input 
          type="text" 
          className="loai-phieu-search" 
          placeholder="TÌM MÃ LOẠI / TÊN LOẠI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="loai-phieu-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>TẤT CẢ TRẠNG THÁI</option>
          <option>HOẠT ĐỘNG</option>
          <option>NGỪNG HOẠT ĐỘNG</option>
        </select>
      </div>

      <div className="loai-phieu-table-container">
        <table className="loai-phieu-table">
          <thead>
            <tr>
              <th>MÃ LOẠI</th>
              <th>TÊN LOẠI</th>
              <th>LOẠI PHIẾU</th>
              <th>GHI CHÚ</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length > 0 ? filteredList.map(p => (
              <tr key={p.maLoai}>
                <td><strong>{p.maLoai}</strong></td>
                <td><strong>{p.tenLoai}</strong></td>
                <td className="lp-uppercase">{p.loaiPhieu}</td>
                <td className="lp-note">{p.ghiChu}</td>
                <td>
                  <span className={`lp-badge ${p.trangThai === 'HOẠT ĐỘNG' ? 'lp-badge-success' : 'lp-badge-inactive'}`}>
                    {p.trangThai}
                  </span>
                </td>
                <td>
                  <button 
                    className="lp-btn-detail"
                    onClick={() => navigate(`/admin/so-quy-tien-mat/loai-phieu-thu/chi-tiet/${p.maLoai}`)}
                  >
                    XEM CHI TIẾT
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="lp-empty">
                  KHÔNG TÌM THẤY LOẠI PHIẾU THU NÀO
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="loai-phieu-footer">
        <div className="lp-footer-text">
          HIỂN THỊ 1-{filteredList.length} TRÊN {filteredList.length} LOẠI
        </div>
        <div className="pt-pagination">
          <button className="pt-page-btn" disabled>&lt;</button>
          <button className="pt-page-btn pt-page-btn-active">1</button>
          <button className="pt-page-btn">&gt;</button>
        </div>
      </div>

      {showModal && (
        <div className="lp-modal-overlay">
          <div className="lp-modal">
            <div className="lp-modal-header">
              <h2>THÊM LOẠI PHIẾU THU</h2>
            </div>
            <div className="lp-modal-body">
              {error && <div className="lp-modal-error">{error}</div>}
              
              <div className="lp-form-group">
                <label>MÃ LOẠI *</label>
                <input 
                  type="text" 
                  placeholder="VD: LPT007" 
                  value={maLoai}
                  onChange={(e) => setMaLoai(e.target.value)}
                />
              </div>

              <div className="lp-form-group">
                <label>TÊN LOẠI *</label>
                <input 
                  type="text" 
                  placeholder="VD: Thu bồi hoàn" 
                  value={tenLoai}
                  onChange={(e) => setTenLoai(e.target.value)}
                />
              </div>

              <div className="lp-form-group">
                <label>GHI CHÚ</label>
                <textarea 
                  placeholder="Mô tả loại phiếu thu này..." 
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  rows="3"
                ></textarea>
              </div>

              <div className="lp-modal-preview">
                <div className="lp-preview-item">
                  <span>LOẠI PHIẾU</span>
                  <strong>THU</strong>
                </div>
                <div className="lp-preview-item">
                  <span>TRẠNG THÁI SAU KHI TẠO</span>
                  <strong className="lp-text-success">HOẠT ĐỘNG</strong>
                </div>
              </div>
            </div>
            
            <div className="lp-modal-footer">
              <button className="lp-btn-cancel" onClick={handleCloseModal}>HỦY</button>
              <button className="lp-btn-submit" onClick={handleCreate}>TẠO LOẠI PHIẾU THU</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
