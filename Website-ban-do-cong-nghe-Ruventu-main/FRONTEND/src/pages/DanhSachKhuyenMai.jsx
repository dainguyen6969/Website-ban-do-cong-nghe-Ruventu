import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSearch, HiPlus } from 'react-icons/hi';
import { getPromotions, togglePromoStatus } from '../utils/promoStore';
import './DanhSachKhuyenMai.css';

export default function DanhSachKhuyenMai() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    setPromotions(getPromotions());
  }, []);
  const [method, setMethod] = useState('Tất cả phương thức');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredPromotions = promotions.filter(promo => {
    const matchSearch = promo.name.toLowerCase().includes(search.toLowerCase()) || 
                        promo.id.toLowerCase().includes(search.toLowerCase());
    const matchMethod = method === 'Tất cả phương thức' || promo.method === method;
    const matchStatus = status === 'Tất cả trạng thái' || promo.status === status;
    return matchSearch && matchMethod && matchStatus;
  });

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage) || 1;
  // Ensure currentPage is valid
  const validPage = Math.min(currentPage, totalPages);
  
  const startIndex = (validPage - 1) * itemsPerPage;
  const displayedPromotions = filteredPromotions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <main className="promo-list-page">
      <div className="promo-list-header">
        <div className="promo-list-header-left">
          <div className="promo-breadcrumb">KHUYẾN MÃI / DANH SÁCH KHUYẾN MÃI</div>
          <h1>DANH SÁCH KHUYẾN MÃI</h1>
          <p>QUẢN LÝ CÁC CHƯƠNG TRÌNH ƯU ĐÃI ĐANG ĐƯỢC CẤU HÌNH</p>
        </div>
        <div className="promo-list-header-right">
          <button className="promo-add-button" onClick={() => navigate('/admin/khuyen-mai/tao-khuyen-mai')}>
            <HiPlus size={16} /> TẠO KHUYẾN MÃI
          </button>
        </div>
      </div>

      <div className="promo-list-toolbar">
        <div className="promo-search-wrapper">
          <HiOutlineSearch color="#999" size={18} />
          <input 
            type="text" 
            placeholder="TÌM KIẾM THEO MÃ, TÊN CHƯƠNG TRÌNH..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="promo-filter-select"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="Tất cả phương thức">Tất cả phương thức</option>
          <option value="CHIẾT KHẤU">Chiết khấu</option>
          <option value="TẶNG SẢN PHẨM">Tặng sản phẩm</option>
        </select>

        <select 
          className="promo-filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Tất cả trạng thái">Tất cả trạng thái</option>
          <option value="ĐANG ÁP DỤNG">Đang áp dụng</option>
          <option value="CHƯA BẮT ĐẦU">Chưa bắt đầu</option>
          <option value="TẠM DỪNG">Tạm dừng</option>
          <option value="HẾT LƯỢT">Hết lượt</option>
        </select>
      </div>

      <div className="promo-table-container">
        <table className="promo-list-table">
          <thead>
            <tr>
              <th>MÃ CHƯƠNG TRÌNH</th>
              <th>TÊN CHƯƠNG TRÌNH</th>
              <th>PHƯƠNG THỨC</th>
              <th>ĐỐI TƯỢNG</th>
              <th>CÒN LẠI</th>
              <th>BẮT ĐẦU</th>
              <th>KẾT THÚC</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {displayedPromotions.length > 0 ? displayedPromotions.map((promo) => (
              <tr key={promo.id}>
                <td><span className="promo-id-tag">{promo.id}</span></td>
                <td><strong>{promo.name}</strong></td>
                <td>{promo.method}</td>
                <td>{promo.target}</td>
                <td>
                  <strong className={
                    promo.remaining === '0 LƯỢT' ? 'text-red' : 
                    promo.remaining === 'KHÔNG GIỚI HẠN' ? 'text-green' : ''
                  }>
                    {promo.remaining}
                  </strong>
                </td>
                <td>{promo.start}</td>
                <td>{promo.end}</td>
                <td><PromoStatusBadge status={promo.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <button className="promo-detail-btn" type="button" onClick={() => navigate(`/admin/khuyen-mai/chi-tiet/${promo.id}`)} style={{ width: 'auto' }}>XEM CHI TIẾT</button>
                    {(promo.status === 'ĐANG ÁP DỤNG' || promo.status === 'TẠM DỪNG') && (
                      <button 
                        className={`promo-detail-btn ${promo.status === 'ĐANG ÁP DỤNG' ? 'promo-btn-pause' : 'promo-btn-resume'}`} 
                        type="button" 
                        style={{ width: 'auto' }}
                        onClick={() => {
                          togglePromoStatus(promo.id);
                          setPromotions(getPromotions()); // refresh list
                        }}
                      >
                        {promo.status === 'ĐANG ÁP DỤNG' ? 'TẠM DỪNG' : 'TIẾP TỤC'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '32px' }}>Không có chương trình khuyến mãi nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="promo-pagination-footer">
        <div className="promo-pagination-info">
          HIỂN THỊ {filteredPromotions.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPromotions.length)} TRÊN TỔNG SỐ {filteredPromotions.length} CHƯƠNG TRÌNH
        </div>
        <div className="promo-pagination-controls">
          <button 
            disabled={validPage === 1} 
            onClick={() => setCurrentPage(validPage - 1)}
          >&lt;</button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i + 1} 
              className={validPage === i + 1 ? 'active' : ''}
              onClick={() => setCurrentPage(i + 1)}
            >{i + 1}</button>
          ))}

          <button 
            disabled={validPage === totalPages} 
            onClick={() => setCurrentPage(validPage + 1)}
          >&gt;</button>
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
