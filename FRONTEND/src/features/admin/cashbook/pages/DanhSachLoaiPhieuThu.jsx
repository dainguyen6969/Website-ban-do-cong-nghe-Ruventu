import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCashbook } from '../context/CashbookContext';
import './DanhSachLoaiPhieuThu.css';

const mockDataFallback = [
    { id: 1, code: 'LPT001', name: 'Thu bán hàng', type: 'THU', note: 'Doanh thu từ bán hàng tại quầy và online', status: 'HOẠT ĐỘNG' },
    { id: 2, code: 'LPT002', name: 'Thu nợ khách hàng', type: 'THU', note: 'Thu hồi công nợ từ khách hàng', status: 'HOẠT ĐỘNG' },
    { id: 3, code: 'LPT003', name: 'Thu đặt cọc', type: 'THU', note: 'Khách hàng đặt cọc giữ hàng hoặc dịch vụ', status: 'HOẠT ĐỘNG' },
    { id: 4, code: 'LPT004', name: 'Thu hoàn ứng', type: 'THU', note: 'Nhân viên hoàn lại tiền tạm ứng còn thừa', status: 'HOẠT ĐỘNG' },
    { id: 5, code: 'LPT005', name: 'Thu phí dịch vụ', type: 'THU', note: '-', status: 'HOẠT ĐỘNG' },
    { id: 6, code: 'LPT006', name: 'Thu bồi thường', type: 'THU', note: 'Thu bồi thường từ đối tác, nhà cung cấp', status: 'NGỪNG HOẠT ĐỘNG' }
];

export default function DanhSachLoaiPhieuThu() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loaiPhieuThuList, addLoaiPhieuThu } = useCashbook();

    const dataToUse = loaiPhieuThuList && loaiPhieuThuList.length > 0 ? loaiPhieuThuList : mockDataFallback;

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('TẤT CẢ TRẠNG THÁI');
    const [showModal, setShowModal] = useState(false);
    
    // Form state
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newNote, setNewNote] = useState('');
    const [errors, setErrors] = useState({});


    const handleOpenModal = () => {
        setNewCode('');
        setNewName('');
        setNewNote('');
        setErrors({});
        setShowModal(true);
    };

    const handleCreate = () => {
        let newErrors = {};
        if (!newCode.trim()) newErrors.code = 'Vui lòng nhập mã loại';
        if (!newName.trim()) newErrors.name = 'Vui lòng nhập tên loại';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (addLoaiPhieuThu) {
            addLoaiPhieuThu({
                id: Date.now(),
                code: newCode,
                name: newName,
                type: 'THU',
                note: newNote || '-',
                status: 'HOẠT ĐỘNG'
            });
        }

        setShowModal(false);
    };

    const filteredData = dataToUse.filter(item => {
        if (searchQuery && !item.code.toLowerCase().includes(searchQuery.toLowerCase()) && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterStatus !== 'TẤT CẢ TRẠNG THÁI' && item.status !== filterStatus) return false;
        return true;
    });


    return (
        <div className="lpt-page">
            <div className="pt-header-top">

                <div className="pt-breadcrumb">SỔ QUỸ TIỀN MẶT / LOẠI PHIẾU THU</div>
                <button className="pt-btn-create" onClick={handleOpenModal}>
                    + THÊM LOẠI PHIẾU THU
                </button>
            </div>
            
            <div className="pt-header-main">
                <h1>LOẠI PHIẾU THU</h1>
                <p>QUẢN LÝ CÁC NHÓM MỤC ĐÍCH DÙNG ĐỂ PHÂN LOẠI KHOẢN THU</p>
            </div>

            <div className="pt-filter-bar">
                <input 
                    type="text" 
                    placeholder="TÌM MÃ LOẠI / TÊN LOẠI..." 
                    className="pt-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="TẤT CẢ TRẠNG THÁI">TẤT CẢ TRẠNG THÁI</option>
                    <option value="HOẠT ĐỘNG">HOẠT ĐỘNG</option>
                    <option value="NGỪNG HOẠT ĐỘNG">NGỪNG HOẠT ĐỘNG</option>
                </select>
            </div>

            <div className="pt-table-container">
                <table className="promo-table pt-table">
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
                        {filteredData.length > 0 ? (
                            filteredData.map(row => (
                                <tr key={row.id}>
                                    <td><strong>{row.code}</strong></td>
                                    <td><strong>{row.name}</strong></td>
                                    <td className="text-muted">{row.type}</td>
                                    <td className="text-muted">{row.note}</td>
                                    <td>
                                        <span className={`status-outline ${row.status === 'NGỪNG HOẠT ĐỘNG' ? 'status-gray' : 'status-success'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="pt-btn-detail" onClick={() => navigate(`/admin/so-quy-tien-mat/loai-phieu-thu/${row.code}`)}>XEM CHI TIẾT</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6">
                                    <div className="pt-empty-state">
                                        <p>KHÔNG TÌM THẤY LOẠI PHIẾU THU PHÙ HỢP</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {filteredData.length > 0 && (
                <div className="pt-pagination">
                    <div className="pt-pagination-info">
                        HIỂN THỊ 1-{filteredData.length} TRÊN {filteredData.length} LOẠI
                    </div>
                    <div className="pt-pagination-controls">
                        <button disabled>TRƯỚC</button>
                        <button disabled>SAU</button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="lpt-modal-overlay">
                    <div className="lpt-modal">
                        <div className="lpt-modal-header">
                            <h3>THÊM LOẠI PHIẾU THU</h3>
                        </div>
                        <div className="lpt-modal-body">
                            <div className="lpt-form-group">
                                <label>MÃ LOẠI <span>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="VD: LPT007" 
                                    value={newCode}
                                    onChange={e => {setNewCode(e.target.value); setErrors({...errors, code: null})}}
                                    className={errors.code ? 'input-error' : ''}
                                />
                            </div>
                            <div className="lpt-form-group">
                                <label>TÊN LOẠI <span>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="VD: Thu bồi hoàn" 
                                    value={newName}
                                    onChange={e => {setNewName(e.target.value); setErrors({...errors, name: null})}}
                                    className={errors.name ? 'input-error' : ''}
                                />
                            </div>
                            <div className="lpt-form-group">
                                <label>GHI CHÚ</label>
                                <textarea 
                                    placeholder="Mô tả loại phiếu thu này..." 
                                    rows="3"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                ></textarea>
                            </div>
                            
                            <div className="lpt-modal-status-row">
                                <div className="status-col">
                                    <label>LOẠI PHIẾU</label>
                                    <strong>THU</strong>
                                </div>
                                <div className="status-col">
                                    <label>TRẠNG THÁI SAU KHI TẠO</label>
                                    <strong className="text-green">HOẠT ĐỘNG</strong>
                                </div>
                            </div>
                        </div>
                        <div className="lpt-modal-footer">
                            <button className="lpt-btn-outline" onClick={() => setShowModal(false)}>HỦY</button>
                            <button className="lpt-btn-primary" onClick={handleCreate}>TẠO LOẠI PHIẾU THU</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
