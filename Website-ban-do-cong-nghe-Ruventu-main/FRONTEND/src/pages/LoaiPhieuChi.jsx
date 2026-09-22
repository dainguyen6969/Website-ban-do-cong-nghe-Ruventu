import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoaiPhieuChiList, createLoaiPhieuChi } from '../utils/loaiPhieuChiStore';
import './LoaiPhieuChi.css';

export default function LoaiPhieuChi() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [list, setList] = useState(getLoaiPhieuChiList());
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

    return matchSearch;
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

    createLoaiPhieuChi({
      maLoai: maLoai.trim(),
      tenLoai: tenLoai.trim(),
      ghiChu: ghiChu.trim()
    });

    setList(getLoaiPhieuChiList());
    setShowModal(false);
  };

  return (
    <main className="loai-chi-page">
      <div className="loai-chi-header">
        <div className="loai-chi-breadcrumb">SỔ QUỸ TIỀN MẶT / <strong>LOẠI PHIẾU CHI</strong></div>
        <div className="loai-chi-title-row">
          <div className="loai-chi-title">
            <h1>LOẠI PHIẾU CHI</h1>
            <p>QUẢN LÝ CÁC NHÓM MỤC ĐÍCH DÙNG ĐỂ PHÂN LOẠI KHOẢN TIỀN CHI</p>
          </div>
          <button className="loai-chi-btn-create" onClick={handleOpenModal}>
            + THÊM LOẠI PHIẾU CHI
          </button>
        </div>
      </div>

      <div className="loai-chi-filters">
        <input 
          type="text" 
          className="loai-chi-search" 
          placeholder="TÌM MÃ LOẠI / TÊN LOẠI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="loai-chi-table-container">
        <table className="loai-chi-table">
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
                <td className="lc-uppercase">{p.loaiPhieu}</td>
                <td className="lc-note">{p.ghiChu}</td>
                <td>
                  <span className={`lc-badge ${p.trangThai === 'HOẠT ĐỘNG' ? 'lc-badge-success' : 'lc-badge-inactive'}`}>
                    {p.trangThai}
                  </span>
                </td>
                <td>
                  <button className="lc-btn-detail" onClick={() => navigate(`/admin/so-quy-tien-mat/loai-phieu-chi/chi-tiet/${p.maLoai}`)}>XEM CHI TIẾT</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="lc-empty">
                  KHÔNG TÌM THẤY LOẠI PHIẾU CHI NÀO
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="loai-chi-footer">
        <div className="lc-footer-text">
          HIỂN THỊ 1-{filteredList.length} TRÊN {filteredList.length} LOẠI
        </div>
        <div className="pt-pagination">
          <button className="pt-page-btn" disabled>&lt;</button>
          <button className="pt-page-btn pt-page-btn-active">1</button>
          <button className="pt-page-btn">&gt;</button>
        </div>
      </div>

      {showModal && (
        <div className="lc-modal-overlay">
          <div className="lc-modal">
            <div className="lc-modal-header">
              <h2>THÊM LOẠI PHIẾU CHI</h2>
            </div>
            <div className="lc-modal-body">
              {error && <div className="lc-modal-error">{error}</div>}
              
              <div className="lc-form-group">
                <label>MÃ LOẠI *</label>
                <input 
                  type="text" 
                  placeholder="VD: LPC016" 
                  value={maLoai}
                  onChange={(e) => setMaLoai(e.target.value)}
                />
              </div>

              <div className="lc-form-group">
                <label>TÊN LOẠI *</label>
                <input 
                  type="text" 
                  placeholder="VD: Chi bảo trì" 
                  value={tenLoai}
                  onChange={(e) => setTenLoai(e.target.value)}
                />
              </div>

              <div className="lc-form-group">
                <label>GHI CHÚ</label>
                <textarea 
                  placeholder="Mô tả loại phiếu chi này..." 
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  rows="3"
                ></textarea>
              </div>

              <div className="lc-modal-preview">
                <div className="lc-preview-item">
                  <span>LOẠI PHIẾU</span>
                  <strong>CHI</strong>
                </div>
                <div className="lc-preview-item">
                  <span>TRẠNG THÁI SAU KHI TẠO</span>
                  <strong className="lc-text-success">HOẠT ĐỘNG</strong>
                </div>
              </div>
            </div>
            
            <div className="lc-modal-footer">
              <button className="lc-btn-cancel" onClick={handleCloseModal}>HỦY</button>
              <button className="lc-btn-submit" onClick={handleCreate}>TẠO LOẠI PHIẾU CHI</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
